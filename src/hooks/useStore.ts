import { useState, useEffect, useCallback, useRef } from 'react';
import { collection, query, where, onSnapshot, addDoc, updateDoc, deleteDoc, doc, getDoc, setDoc, writeBatch, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import type { Student, Experiment, Grade, AppSettings, RankOption } from '../lib/types';
import { DEFAULT_RANKS, normalizeRanks } from '../lib/ranks';
import type { User } from 'firebase/auth';

export interface AppBackup {
  version: 1;
  exported_at: string;
  students: Student[];
  experiments: Experiment[];
  grades: Grade[];
  settings: AppSettings | null;
  rankOptions: RankOption[];
}

export function useStore(user: User | null) {
  const [students, setStudents] = useState<Student[]>([]);
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [rankOptions, setRankOptionsState] = useState<RankOption[]>(DEFAULT_RANKS);
  const [loading, setLoading] = useState(true);
  const [syncState, setSyncState] = useState<'Offline' | 'Syncing' | 'Synced' | 'Sync failed'>(navigator.onLine ? 'Syncing' : 'Offline');
  const hasLoaded = useRef(false);

  const updateSyncState = (metadata: { hasPendingWrites: boolean; fromCache: boolean }) => {
    if (!navigator.onLine) setSyncState('Offline');
    else if (metadata.hasPendingWrites || metadata.fromCache) setSyncState('Syncing');
    else setSyncState('Synced');
  };

  const handleSnapshotError = (path: string) => (error: { code?: string; message?: string }) => {
    setSyncState('Sync failed');
    console.error('[LabMetrics Firestore] Protected path failed', {
      uid: user?.uid ?? null,
      path,
      code: error.code ?? null,
      permissionDenied: error.code === 'permission-denied',
      message: error.message ?? 'Unknown Firestore error',
    });
  };

  // Get user-specific collection paths
  const getStudentsCol = () => user ? collection(db, 'users', user.uid, 'students') : null;
  const getExperimentsCol = () => user ? collection(db, 'users', user.uid, 'experiments') : null;
  const getGradesCol = () => user ? collection(db, 'users', user.uid, 'grades') : null;
  const getSettingsDoc = () => user ? doc(db, 'users', user.uid, 'settings', 'default') : null;

  const fetchAll = useCallback(async () => {
    if (!user) {
      setStudents([]);
      setExperiments([]);
      setGrades([]);
      setSettings(null);
      setLoading(false);
      return;
    }
    
    if (!hasLoaded.current) setLoading(true);
    
    // Fetch settings
    const settingsDoc = getSettingsDoc();
    if (settingsDoc) {
      const settingsSnap = await getDoc(settingsDoc);
      if (settingsSnap.exists()) {
        const settingsData = { id: settingsSnap.id, ...settingsSnap.data() } as AppSettings;
        setSettings(settingsData);
        if (settingsData.rank_options) {
          setRankOptionsState(normalizeRanks(settingsData.rank_options));
        }
      }
    }
    
    hasLoaded.current = true;
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (!user) {
      setStudents([]);
      setExperiments([]);
      setGrades([]);
      setSettings(null);
      setLoading(false);
      return;
    }

    setLoading(true);

    const handleOffline = () => setSyncState('Offline');
    const handleOnline = () => setSyncState('Syncing');
    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);
    
    // Set up real-time listeners for all collections
    const studentsCol = getStudentsCol();
    const experimentsCol = getExperimentsCol();
    const gradesCol = getGradesCol();
    const settingsDoc = getSettingsDoc();

    const unsubscries: (() => void)[] = [];

    if (studentsCol) {
      const path = `users/${user.uid}/students`;
      const unsub = onSnapshot(query(studentsCol), { includeMetadataChanges: true }, (snapshot) => {
        const studentsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Student))
          .sort((a, b) => a.roll_number.localeCompare(b.roll_number, undefined, { numeric: true }));
        setStudents(studentsData);
        updateSyncState(snapshot.metadata);
      }, handleSnapshotError(path));
      unsubscries.push(unsub);
    }

    if (experimentsCol) {
      const path = `users/${user.uid}/experiments`;
      const unsub = onSnapshot(query(experimentsCol), { includeMetadataChanges: true }, (snapshot) => {
        const experimentsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Experiment))
          .sort((a, b) => a.experiment_number - b.experiment_number);
        setExperiments(experimentsData);
        updateSyncState(snapshot.metadata);
      }, handleSnapshotError(path));
      unsubscries.push(unsub);
    }

    if (gradesCol) {
      const path = `users/${user.uid}/grades`;
      const unsub = onSnapshot(query(gradesCol), { includeMetadataChanges: true }, (snapshot) => {
        const gradesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Grade));
        setGrades(gradesData);
        updateSyncState(snapshot.metadata);
      }, handleSnapshotError(path));
      unsubscries.push(unsub);
    }

    if (settingsDoc) {
      const path = `users/${user.uid}/settings/default`;
      const unsub = onSnapshot(settingsDoc, { includeMetadataChanges: true }, (snapshot) => {
        if (snapshot.exists()) {
          const settingsData = { id: snapshot.id, ...snapshot.data() } as AppSettings;
          setSettings(settingsData);
          if (settingsData.rank_options) {
            setRankOptionsState(normalizeRanks(settingsData.rank_options));
          }
        }
        updateSyncState(snapshot.metadata);
      }, handleSnapshotError(path));
      unsubscries.push(unsub);
    }

    setLoading(false);

    return () => {
      unsubscries.forEach(unsub => unsub());
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, [user]);

  const addStudent = async (data: Omit<Student, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    if (!user) throw new Error('User not authenticated');
    const now = new Date().toISOString();
    await addDoc(getStudentsCol()!, {
      ...data,
      user_id: user.uid,
      created_at: now,
      updated_at: now,
    });
    // The onSnapshot will update the state automatically
  };

  const updateStudent = async (id: string, data: Partial<Student>) => {
    if (!user) throw new Error('User not authenticated');
    const currentStudent = students.find(s => s.id === id);
    const autoSubmitted = data.signs_obtained !== undefined && data.signs_obtained >= 1 
      ? true 
      : (data.submitted_record !== undefined ? data.submitted_record : currentStudent?.submitted_record ?? false);
    const patch = { ...data, submitted_record: autoSubmitted, updated_at: new Date().toISOString() };
    const studentDoc = doc(db, 'users', user.uid, 'students', id);
    await updateDoc(studentDoc, patch);
  };

  const deleteStudent = async (id: string) => {
    if (!user) throw new Error('User not authenticated');
    const studentDoc = doc(db, 'users', user.uid, 'students', id);
    await deleteDoc(studentDoc);
    // Delete associated grades
    const gradesCol = getGradesCol();
    if (gradesCol) {
      const gradesSnapshot = await getDocs(query(gradesCol));
      const batch = writeBatch(db);
      gradesSnapshot.docs
        .filter(doc => doc.data().student_id === id)
        .forEach(doc => batch.delete(doc.ref));
      await batch.commit();
    }
  };

  const addExperiment = async (data: Omit<Experiment, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    if (!user) throw new Error('User not authenticated');
    const now = new Date().toISOString();
    await addDoc(getExperimentsCol()!, {
      ...data,
      user_id: user.uid,
      created_at: now,
      updated_at: now,
    });
  };

  const updateExperiment = async (id: string, data: Partial<Experiment>) => {
    if (!user) throw new Error('User not authenticated');
    const patch = { ...data, updated_at: new Date().toISOString() };
    const experimentDoc = doc(db, 'users', user.uid, 'experiments', id);
    await updateDoc(experimentDoc, patch);
  };

  const deleteExperiment = async (id: string) => {
    if (!user) throw new Error('User not authenticated');
    const experimentDoc = doc(db, 'users', user.uid, 'experiments', id);
    await deleteDoc(experimentDoc);
    // Delete associated grades
    const gradesCol = getGradesCol();
    if (gradesCol) {
      const gradesSnapshot = await getDocs(query(gradesCol));
      const batch = writeBatch(db);
      gradesSnapshot.docs
        .filter(doc => doc.data().experiment_id === id)
        .forEach(doc => batch.delete(doc.ref));
      await batch.commit();
    }
  };

  const upsertGrade = async (studentId: string, experimentId: string, grade: string) => {
    await upsertGrades(studentId, experimentId, grade ? [grade] : []);
  };

  const upsertGrades = async (studentId: string, experimentId: string, nextGrades: string[]) => {
    if (!user) throw new Error('User not authenticated');
    const now = new Date().toISOString();
    const savedGrades = nextGrades.filter(Boolean);
    const grade = savedGrades[0] ?? '';
    
    // Check if grade exists
    const gradesCol = getGradesCol();
    if (!gradesCol) throw new Error('User not authenticated');
    
    const q = query(gradesCol, where('student_id', '==', studentId), where('experiment_id', '==', experimentId));
    const snapshot = await getDocs(q);
    
    if (!snapshot.empty) {
      // Update existing
      const gradeDoc = snapshot.docs[0];
      await updateDoc(gradeDoc.ref, { grade, grades: savedGrades, updated_at: now });
    } else {
      // Create new
      await addDoc(gradesCol, {
        student_id: studentId,
        experiment_id: experimentId,
        grade,
        grades: savedGrades,
        user_id: user.uid,
        created_at: now,
        updated_at: now,
      });
    }
  };

  const updateSettings = async (data: Partial<AppSettings>) => {
    if (!user) throw new Error('User not authenticated');
    const now = new Date().toISOString();
    const patch = { ...data, updated_at: now };
    const settingsDoc = getSettingsDoc();
    if (settingsDoc) {
      const snap = await getDoc(settingsDoc);
      if (snap.exists()) {
        await updateDoc(settingsDoc, patch);
      } else {
        await setDoc(settingsDoc, { ...patch, user_id: user.uid, created_at: now });
      }
    }
  };

  const updateRankOptions = async (next: RankOption[]) => {
    const normalized = normalizeRanks(next);
    setRankOptionsState(normalized);
    if (settings) {
      await updateSettings({ rank_options: normalized });
    }
  };

  const exportBackup = (): AppBackup => ({
    version: 1,
    exported_at: new Date().toISOString(),
    students,
    experiments,
    grades,
    settings,
    rankOptions,
  });

  const restoreBackup = async (backup: AppBackup) => {
    if (!user) throw new Error('User not authenticated');
    if (!backup || !Array.isArray(backup.students) || !Array.isArray(backup.experiments) || !Array.isArray(backup.grades)) {
      throw new Error('Invalid backup file');
    }

    const batch = writeBatch(db);

    // Clear existing data
    const gradesCol = getGradesCol();
    const studentsCol = getStudentsCol();
    const experimentsCol = getExperimentsCol();

    if (gradesCol) {
      const gradesSnapshot = await getDocs(query(gradesCol));
      gradesSnapshot.forEach(doc => batch.delete(doc.ref));
    }

    if (studentsCol) {
      const studentsSnapshot = await getDocs(query(studentsCol));
      studentsSnapshot.forEach(doc => batch.delete(doc.ref));
    }

    if (experimentsCol) {
      const experimentsSnapshot = await getDocs(query(experimentsCol));
      experimentsSnapshot.forEach(doc => batch.delete(doc.ref));
    }

    // Add new data
    backup.students.forEach(student => {
      const { id, ...data } = student;
      const docRef = doc(db, 'users', user.uid, 'students', id);
      batch.set(docRef, { ...data, user_id: user.uid });
    });

    backup.experiments.forEach(experiment => {
      const { id, ...data } = experiment;
      const docRef = doc(db, 'users', user.uid, 'experiments', id);
      batch.set(docRef, { ...data, user_id: user.uid });
    });

    backup.grades.forEach(grade => {
      const { id, ...data } = grade;
      const docRef = doc(db, 'users', user.uid, 'grades', id);
      batch.set(docRef, { ...data, user_id: user.uid });
    });

    if (backup.settings) {
      const settingsDoc = getSettingsDoc();
      if (settingsDoc) {
        const data: Partial<AppSettings> = { ...backup.settings };
        delete data.id;
        batch.set(settingsDoc, { ...data, user_id: user.uid });
      }
    }

    await batch.commit();
    updateRankOptions(backup.rankOptions ?? DEFAULT_RANKS);
  };

  const getGrade = (studentId: string, experimentId: string): string => {
    return getGrades(studentId, experimentId).join(' / ');
  };

  const getGrades = (studentId: string, experimentId: string): string[] => {
    const g = grades.find(g => g.student_id === studentId && g.experiment_id === experimentId);
    if (!g) return [];
    if (Array.isArray(g.grades)) return g.grades.filter(Boolean);
    return g.grade ? [g.grade] : [];
  };

  const resetAll = async () => {
    if (!user) throw new Error('User not authenticated');
    
    const batch = writeBatch(db);
    const gradesCol = getGradesCol();
    const studentsCol = getStudentsCol();
    const experimentsCol = getExperimentsCol();

    if (gradesCol) {
      const gradesSnapshot = await getDocs(query(gradesCol));
      gradesSnapshot.forEach(doc => batch.delete(doc.ref));
    }

    if (studentsCol) {
      const studentsSnapshot = await getDocs(query(studentsCol));
      studentsSnapshot.forEach(doc => batch.delete(doc.ref));
    }

    if (experimentsCol) {
      const experimentsSnapshot = await getDocs(query(experimentsCol));
      experimentsSnapshot.forEach(doc => batch.delete(doc.ref));
    }

    await batch.commit();
  };

  return {
    students, experiments, grades, settings, rankOptions, loading, syncState, fetchAll,
    addStudent, updateStudent, deleteStudent,
    addExperiment, updateExperiment, deleteExperiment,
    upsertGrade, upsertGrades, getGrade, getGrades, updateSettings,
    updateRankOptions, exportBackup, restoreBackup,
    resetAll,
  };
}
