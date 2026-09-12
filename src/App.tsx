import { useCallback, useEffect, useState } from 'react';
import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import { disableNetwork, enableNetwork } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';
import { auth, db, firestoreNetworkHeld } from './firebase';
import {
  checkCurrentUserAccess,
  FIREBASE_APP_ID,
  type AccessResult,
} from './authorization';
import { AppProvider, useApp } from './hooks/useAppContext';
import { useTheme } from './hooks/useTheme';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import StudentList from './pages/StudentList';
import BatchPanel from './pages/BatchPanel';
import Experiments from './pages/Experiments';
import SignTracker from './pages/SignTracker';
import Settings from './pages/Settings';
import Login from './pages/Login';
import type { Page } from './lib/types';

type AccessState = 'checking' | 'signed-out' | 'authorized' | 'offline-authorized' | 'unauthorized' | 'verification-required' | 'error';
const ACCESS_CACHE_KEY = `labmetrics-access:${FIREBASE_APP_ID}`;

function hasOfflineGrant(user: User) {
  try {
    const cached = JSON.parse(localStorage.getItem(ACCESS_CACHE_KEY) || 'null');
    return cached?.uid === user.uid && cached?.appId === FIREBASE_APP_ID && cached?.allowed === true;
  } catch {
    return false;
  }
}

function cacheGrant(user: User) {
  localStorage.setItem(ACCESS_CACHE_KEY, JSON.stringify({
    uid: user.uid,
    appId: FIREBASE_APP_ID,
    allowed: true,
    lastAuthorizedAt: new Date().toISOString(),
  }));
}

function LoadingScreen({ message }: { message: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
      <div className="text-center">
        <Loader2 size={32} className="animate-spin text-teal-600 mx-auto mb-3" />
        <p className="text-sm text-gray-500 dark:text-gray-400">{message}</p>
      </div>
    </div>
  );
}

function AppContent({ user }: { user: User }) {
  const { loading, settings, updateSettings, syncState } = useApp();
  const { dark, toggleDark } = useTheme();
  const [page, setPage] = useState<Page>('dashboard');

  useEffect(() => {
    if (settings && settings.dark_mode !== dark) updateSettings({ dark_mode: dark });
  }, [dark]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (settings?.dark_mode !== undefined && settings.dark_mode !== dark) toggleDark();
  }, [settings?.dark_mode]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) return <LoadingScreen message="Loading LabMetrics…" />;

  return (
    <Layout
      currentPage={page}
      onNavigate={setPage}
      dark={dark}
      toggleDark={toggleDark}
      user={user}
      onLogout={() => void signOut(auth)}
      syncState={syncState}
    >
      {page === 'dashboard' && <Dashboard />}
      {page === 'students' && <StudentList />}
      {page === 'batches' && <BatchPanel />}
      {page === 'experiments' && <Experiments />}
      {page === 'sign-tracker' && <SignTracker />}
      {page === 'settings' && <Settings dark={dark} toggleDark={toggleDark} />}
    </Layout>
  );
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [accessState, setAccessState] = useState<AccessState>('checking');
  const [access, setAccess] = useState<AccessResult | null>(null);
  const [accessError, setAccessError] = useState('');

  const verifyAccess = useCallback(async (currentUser: User) => {
    setAccessState('checking');
    setAccessError('');
    await firestoreNetworkHeld;

    if (!navigator.onLine) {
      await disableNetwork(db);
      if (hasOfflineGrant(currentUser)) {
        setAccessState('offline-authorized');
        return;
      }
      setAccessState('error');
      setAccessError('Connect to the internet once so Access Manager can verify this account.');
      return;
    }

    try {
      const result = await checkCurrentUserAccess(currentUser);
      if (result.uid !== currentUser.uid || auth.currentUser?.uid !== currentUser.uid) {
        throw new Error('Firebase UID changed while Access Manager authorization was being checked.');
      }
      setAccess(result);
      if (result.allowed) {
        cacheGrant(currentUser);
        await enableNetwork(db);
        console.info('[LabMetrics Auth] Opening protected Firestore paths', {
          uid: currentUser.uid,
          paths: [
            `users/${currentUser.uid}/students`,
            `users/${currentUser.uid}/experiments`,
            `users/${currentUser.uid}/grades`,
            `users/${currentUser.uid}/settings/default`,
          ],
        });
        setAccessState('authorized');
      } else {
        await disableNetwork(db);
        const needsVerification = result.requireEmailVerification
          && result.signInProvider === 'password'
          && !currentUser.emailVerified;
        setAccessState(needsVerification ? 'verification-required' : 'unauthorized');
      }
    } catch (error) {
      await disableNetwork(db);
      console.error('[LabMetrics Auth] Authorization check failed.', error);
      setAccessState('error');
      setAccessError('Application access could not be verified. Please try again.');
    }
  }, []);

  useEffect(() => onAuthStateChanged(auth, (currentUser) => {
    setUser(currentUser);
    setAccess(null);
    if (!currentUser) {
      void disableNetwork(db);
      setAccessState('signed-out');
      setAccessError('');
      return;
    }
    void verifyAccess(currentUser);
  }), [verifyAccess]);

  useEffect(() => {
    const handleOffline = () => {
      void disableNetwork(db);
      if (user && hasOfflineGrant(user)) setAccessState('offline-authorized');
    };
    const handleOnline = () => {
      if (!user) return;
      void disableNetwork(db).then(() => verifyAccess(user));
    };
    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);
    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, [user, verifyAccess]);

  if (accessState === 'checking') return <LoadingScreen message="Checking application access…" />;

  if (user && (accessState === 'authorized' || accessState === 'offline-authorized')) {
    return (
      <AppProvider user={user}>
        <AppContent user={user} />
      </AppProvider>
    );
  }

  return (
    <Login
      user={user}
      access={access}
      accessState={accessState}
      accessError={accessError}
      onCheckAgain={() => user && verifyAccess(user)}
    />
  );
}
