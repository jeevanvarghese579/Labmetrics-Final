import { useState, useMemo } from 'react';
import { useApp } from '../hooks/useAppContext';
import Modal from '../components/Modal';
import StudentForm from '../components/StudentForm';
import GradePicker from '../components/GradePicker';
import type { Student, StudentFormData } from '../lib/types';
import { COLUMN_LABELS } from '../lib/types';
import { Search, Edit2, Trash2, ChevronUp, ChevronDown, Plus, Download, Upload, Eye, EyeOff, Filter, BarChart3 } from 'lucide-react';
import { exportStudentsCSV, importStudentsCSV } from '../lib/csv';

export default function Dashboard() {
  const { students, experiments, settings, rankOptions, addStudent, updateStudent, deleteStudent, getGrade, getGrades, upsertGrade, upsertGrades, updateSettings } = useApp();
  const totalSignsRequired = settings?.total_signs_required ?? 10;
  const freezeNameRoll = settings?.freeze_name_roll ?? false;
  const freezeTableHeadings = settings?.freeze_table_headings ?? false;

  const [search, setSearch] = useState('');
  const [batchFilter, setBatchFilter] = useState<string>('all');
  const [sortKey, setSortKey] = useState<string>('roll_number');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [expSortByRank, setExpSortByRank] = useState(false);
  const [editStudent, setEditStudent] = useState<Student | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [showCols, setShowCols] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [editCell, setEditCell] = useState<{ id: string; field: string; value: string | boolean | number } | null>(null);

  // Get unique batches for filter
  const batches = useMemo(() => {
    const batchSet = new Set(students.map(s => s.batch_number).filter(Boolean));
    return ['all', ...Array.from(batchSet).sort()];
  }, [students]);

  // Get rank order for sorting
  const getRankOrder = (grade: string): number => {
    const index = rankOptions.findIndex(r => r.label === grade);
    return index >= 0 ? index : rankOptions.length; // Empty/blank grades go to the end
  };

  // Get average grade for an experiment (for sorting purposes)
  const getGradeForExperiment = (expId: string): string => {
    const grades = students.map(s => getGrades(s.id, expId)[0]).filter(Boolean);
    if (grades.length === 0) return '';
    // Return the most common grade
    const gradeCounts = grades.reduce((acc, g) => {
      acc[g] = (acc[g] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    return Object.entries(gradeCounts).sort((a, b) => b[1] - a[1])[0][0];
  };

  // Sort experiments by rank order
  const sortedExperiments = useMemo(() => {
    if (!expSortByRank) return experiments;
    return [...experiments].sort((a, b) => {
      const gradeA = getRankOrder(getGradeForExperiment(a.id));
      const gradeB = getRankOrder(getGradeForExperiment(b.id));
      return sortDir === 'asc' ? gradeA - gradeB : gradeB - gradeA;
    });
  }, [experiments, rankOptions, students, expSortByRank, sortDir]);

  const visibleColumns = useMemo(() => {
    const base = settings?.visible_columns ?? ['name', 'roll_number', 'class', 'signs_obtained', 'missing_signs', 'overall_grade'];
    const cols = [...base];
    // Use sorted experiments if rank sorting is enabled
    const exps = expSortByRank ? sortedExperiments : experiments;
    exps.forEach(exp => {
      if (!cols.includes(`exp_${exp.id}`)) cols.push(`exp_${exp.id}`);
    });
    return cols;
  }, [settings?.visible_columns, experiments, sortedExperiments, expSortByRank]);

  const toggleColumn = async (col: string) => {
    if (col.startsWith('exp_')) return;
    const current = settings?.visible_columns ?? [];
    const next = current.includes(col) ? current.filter(c => c !== col) : [...current, col];
    if (settings) await updateSettings({ visible_columns: next });
  };

  const getStudentField = (student: Student, col: string) => (student as unknown as Record<string, unknown>)[col];

  const filteredStudents = useMemo(() => {
    let list = students.filter(s =>
      String(s.name ?? '').toLowerCase().includes(search.toLowerCase()) ||
      String(s.roll_number ?? '').toLowerCase().includes(search.toLowerCase()) ||
      String(s.class ?? '').toLowerCase().includes(search.toLowerCase())
    );
    // Apply batch filter
    if (batchFilter !== 'all') {
      list = list.filter(s => s.batch_number === batchFilter);
    }
    list.sort((a, b) => {
      const getVal = (s: Student, k: string) => k === 'missing_signs' ? totalSignsRequired - s.signs_obtained : (s as unknown as Record<string, unknown>)[k];
      const aVal = getVal(a, sortKey), bVal = getVal(b, sortKey);
      const aS = String(aVal ?? ''), bS = String(bVal ?? '');
      return sortDir === 'asc' ? aS.localeCompare(bS, undefined, { numeric: true }) : bS.localeCompare(aS, undefined, { numeric: true });
    });
    return list;
  }, [students, search, sortKey, sortDir, totalSignsRequired, batchFilter]);

  const handleSort = (key: string) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  const handleSaveStudent = async (data: StudentFormData) => {
    if (editStudent) await updateStudent(editStudent.id, data);
    else await addStudent(data);
    setEditStudent(null);
    setShowAdd(false);
  };

  const handleCellEdit = async () => {
    if (!editCell) return;
    const { id, field, value } = editCell;
    if (field.startsWith('exp_')) {
      const expId = field.replace('exp_', '');
      await upsertGrade(id, expId, String(value));
    } else {
      await updateStudent(id, { [field]: value });
    }
    setEditCell(null);
  };

  const SortIcon = ({ col }: { col: string }) => (
    sortKey === col ? (sortDir === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />) : null
  );

  const renderCellValue = (student: Student, col: string): React.ReactNode => {
    if (col === 'missing_signs') return String(totalSignsRequired - student.signs_obtained);
    if (col === 'bought_record' || col === 'submitted_record') {
      const val = getStudentField(student, col) as boolean;
      return (
        <button
          onClick={e => {
            e.stopPropagation();
            updateStudent(student.id, { [col]: !val });
          }}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${val ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-700'}`}
          title={val ? 'Submitted' : 'Not submitted'}
        >
          <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${val ? 'translate-x-5' : 'translate-x-0.5'}`} />
        </button>
      );
    }
    if (col.startsWith('exp_')) {
      const expId = col.replace('exp_', '');
      return (
        <GradePicker
          grades={getGrades(student.id, expId)}
          rankOptions={rankOptions}
          onChange={next => upsertGrades(student.id, expId, next)}
          label={`Grades for ${student.name}`}
        />
      );
    }
    return String(getStudentField(student, col) ?? '-');
  };

  return (
    <div className="space-y-4">
      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total Students', value: students.length, color: 'from-teal-500 to-teal-600' },
          { label: 'Experiments', value: experiments.length, color: 'from-blue-500 to-blue-600' },
          { label: 'Records Submitted', value: students.filter(s => s.submitted_record).length, color: 'from-emerald-500 to-emerald-600' },
          { label: 'Missing Signs', value: students.reduce((a, s) => a + Math.max(0, totalSignsRequired - s.signs_obtained), 0), color: 'from-amber-500 to-amber-600' },
        ].map(card => (
          <div key={card.label} className={`bg-gradient-to-br ${card.color} rounded-xl p-4 text-white`}>
            <p className="text-xs font-medium opacity-80">{card.label}</p>
            <p className="text-2xl font-bold mt-1">{card.value}</p>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search students..."
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-teal-500 outline-none"
          />
        </div>
        {/* Batch Filter */}
        <div className="relative">
          <Filter size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <select
            value={batchFilter}
            onChange={e => setBatchFilter(e.target.value)}
            className="pl-9 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-teal-500 outline-none appearance-none"
          >
            {batches.map(batch => (
              <option key={batch} value={batch}>{batch === 'all' ? 'All Batches' : batch}</option>
            ))}
          </select>
        </div>
        {/* Experiment Rank Sort Toggle */}
        <button
          onClick={() => setExpSortByRank(v => !v)}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
            expSortByRank ? 'border-teal-600 bg-teal-50 dark:bg-teal-900/20 text-teal-600 dark:text-teal-400' : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300'
          }`}
          title="Sort experiments by rank"
        >
          <BarChart3 size={16} />
          {expSortByRank ? 'Sorted by Rank' : 'Sort by Rank'}
        </button>
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium transition-colors">
          <Plus size={16} /> Add Student
        </button>
        <button onClick={() => setShowCols(v => !v)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
          {showCols ? <EyeOff size={16} /> : <Eye size={16} />} Columns
        </button>
        <button onClick={() => exportStudentsCSV(students, experiments, getGrade)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
          <Download size={16} /> Export
        </button>
        <label className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer">
          <Upload size={16} /> Import
          <input type="file" accept=".csv" className="hidden" onChange={e => { if (e.target.files?.[0]) importStudentsCSV(e.target.files[0], addStudent); }} />
        </label>
      </div>

      {/* Column visibility */}
      {showCols && (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 animate-fade-in">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Toggle visible columns</p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(COLUMN_LABELS).map(([key, label]) => (
              <button
                key={key}
                onClick={() => toggleColumn(key)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                  visibleColumns.includes(key) ? 'bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300' : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
                }`}
              >
                {label}
              </button>
            ))}
            {experiments.map(exp => (
              <span
                key={`exp_${exp.id}`}
                className={`px-2.5 py-1 rounded-md text-xs font-medium ${
                  visibleColumns.includes(`exp_${exp.id}`) ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
                }`}
              >
                {exp.title}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto overflow-y-auto max-h-[calc(100dvh-12rem)] min-h-[320px]">
          <table className="w-full text-sm">
            <thead>
              <tr className={`border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 ${freezeTableHeadings ? 'sticky top-0 z-20' : ''}`}>
                <th className="text-left px-3 py-2.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider w-24">Actions</th>
                {visibleColumns.map((col, idx) => {
                  const isFrozen = freezeNameRoll && (idx < 2);
                  return (
                    <th
                      key={col}
                      onClick={() => handleSort(col)}
                      className={`text-left px-3 py-2.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:text-gray-700 dark:hover:text-gray-200 whitespace-nowrap select-none ${isFrozen ? 'sticky z-10 bg-gray-50 dark:bg-gray-800/50' : ''}`}
                      style={isFrozen ? { left: idx === 0 ? 0 : 180 } : undefined}
                    >
                      <span className="flex items-center gap-1">
                        {COLUMN_LABELS[col] ?? (experiments.find(e => `exp_${e.id}` === col)?.title ?? col)}
                        <SortIcon col={col} />
                      </span>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {filteredStudents.length === 0 && (
                <tr><td colSpan={visibleColumns.length + 1} className="px-3 py-8 text-center text-gray-400 dark:text-gray-500">No students found</td></tr>
              )}
              {filteredStudents.map(student => (
                <tr key={student.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                  <td className="px-3 py-2 whitespace-nowrap">
                    <div className="flex items-center gap-1">
                      <button onClick={() => setEditStudent(student)} className="p-1 rounded hover:bg-teal-50 dark:hover:bg-teal-900/20 text-teal-600 dark:text-teal-400 transition-colors" title="Edit">
                        <Edit2 size={14} />
                      </button>
                      {confirmDelete === student.id ? (
                        <div className="flex gap-1">
                          <button onClick={() => { deleteStudent(student.id); setConfirmDelete(null); }} className="px-2 py-0.5 rounded text-xs bg-red-600 text-white hover:bg-red-700">Confirm</button>
                          <button onClick={() => setConfirmDelete(null)} className="px-2 py-0.5 rounded text-xs bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300">Cancel</button>
                        </div>
                      ) : (
                        <button onClick={() => setConfirmDelete(student.id)} className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 dark:text-red-400 transition-colors" title="Delete">
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                  {visibleColumns.map((col, idx) => {
                    const isFrozen = freezeNameRoll && (idx < 2);
                    return (
                      <td
                        key={col}
                        className={`relative px-3 py-2 text-gray-700 dark:text-gray-300 whitespace-nowrap ${col === 'name' ? 'font-medium' : ''} ${isFrozen ? 'sticky z-10 bg-white dark:bg-gray-900' : ''}`}
                        style={isFrozen ? { left: idx === 0 ? 0 : 180 } : undefined}
                        onDoubleClick={() => {
                          if (col === 'missing_signs' || col === 'submitted_record' || col === 'bought_record' || col.startsWith('exp_')) return;
                          const val = col.startsWith('exp_') ? getGrade(student.id, col.replace('exp_', '')) : getStudentField(student, col);
                          setEditCell({ id: student.id, field: col, value: val as string | boolean | number });
                        }}
                      >
                        {editCell?.id === student.id && editCell?.field === col ? (
                          <input
                            autoFocus
                            className="w-20 px-1.5 py-0.5 rounded border border-teal-400 bg-white dark:bg-gray-800 text-sm text-gray-800 dark:text-gray-100 outline-none"
                            value={String(editCell.value)}
                            onChange={e => setEditCell({ ...editCell, value: e.target.value })}
                            onBlur={handleCellEdit}
                            onKeyDown={e => { if (e.key === 'Enter') handleCellEdit(); if (e.key === 'Escape') setEditCell(null); }}
                          />
                        ) : renderCellValue(student, col)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={showAdd || !!editStudent} onClose={() => { setShowAdd(false); setEditStudent(null); }} title={editStudent ? 'Edit Student' : 'Add Student'}>
        <StudentForm student={editStudent} onSubmit={handleSaveStudent} onCancel={() => { setShowAdd(false); setEditStudent(null); }} />
      </Modal>
    </div>
  );
}
