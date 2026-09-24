import { useState, useEffect, useRef } from 'react';
import { useApp } from '../hooks/useAppContext';
import { Plus, Minus, Search, TrendingUp, AlertTriangle, RotateCcw, SkipForward } from 'lucide-react';

export default function SignTracker() {
  const { students, settings, updateStudent } = useApp();
  const totalSignsRequired = settings?.total_signs_required ?? 10;
  const [search, setSearch] = useState('');
  const [mode, setMode] = useState<'obtained' | 'redraw'>('obtained');
  const [recentAction, setRecentAction] = useState<string | null>(null);
  const [remarksInput, setRemarksInput] = useState<Record<string, string>>({});
  const remarksTimeouts = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const remarksFocused = useRef<Record<string, boolean>>({});

  // Sync remarks input with Firestore data when not focused
  useEffect(() => {
    students.forEach(student => {
      if (!remarksFocused.current[student.id] && remarksInput[student.id] !== (student.remarks ?? '')) {
        setRemarksInput(prev => ({ ...prev, [student.id]: student.remarks ?? '' }));
      }
    });
  }, [students]);

  // Filter and sort students by roll_number in ascending order
  const filtered = students
    .filter(s =>
      String(s.name ?? '').toLowerCase().includes(search.toLowerCase()) ||
      String(s.roll_number ?? '').toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => String(a.roll_number ?? '').localeCompare(String(b.roll_number ?? ''), undefined, { numeric: true }));

  // Redraw count = total_signs_required - signs_obtained
  const totalObtained = students.reduce((a, s) => a + s.signs_obtained, 0);
  const totalRedraw = students.reduce((a, s) => a + Math.max(0, totalSignsRequired - s.signs_obtained), 0);
  const completedCount = students.filter(s => s.signs_obtained >= totalSignsRequired).length;

  const handleIncrement = async (studentId: string, current: number) => {
    const next = mode === 'obtained' ? current + 1 : Math.max(0, current - 1);
    await updateStudent(studentId, { signs_obtained: next });
    setRecentAction(studentId + '+');
    setTimeout(() => setRecentAction(null), 400);
  };

  const handleDecrement = async (studentId: string, current: number) => {
    const next = mode === 'obtained' ? Math.max(0, current - 1) : current + 1;
    if (mode === 'obtained' && current <= 0) return;
    if (mode === 'redraw' && current >= totalSignsRequired) return;
    await updateStudent(studentId, { signs_obtained: next });
    setRecentAction(studentId + '-');
    setTimeout(() => setRecentAction(null), 400);
  };

  const handleReset = async (studentId: string) => {
    await updateStudent(studentId, { signs_obtained: 0 });
    setRecentAction(studentId + 'reset');
    setTimeout(() => setRecentAction(null), 400);
  };

  const handleMax = async (studentId: string) => {
    await updateStudent(studentId, { signs_obtained: totalSignsRequired });
    setRecentAction(studentId + 'max');
    setTimeout(() => setRecentAction(null), 400);
  };

  const handleRemarksChange = (studentId: string, remarks: string) => {
    setRemarksInput(prev => ({ ...prev, [studentId]: remarks }));
    // Clear existing timeout for this student
    if (remarksTimeouts.current[studentId]) {
      clearTimeout(remarksTimeouts.current[studentId]);
    }
    // Set new timeout to debounce the update
    remarksTimeouts.current[studentId] = setTimeout(() => {
      updateStudent(studentId, { remarks });
    }, 300);
  };

  const handleRemarksBlur = (studentId: string) => {
    remarksFocused.current[studentId] = false;
    // Immediately save on blur
    if (remarksTimeouts.current[studentId]) {
      clearTimeout(remarksTimeouts.current[studentId]);
    }
    updateStudent(studentId, { remarks: remarksInput[studentId] ?? '' });
  };

  const handleRemarksFocus = (studentId: string) => {
    remarksFocused.current[studentId] = true;
  };

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      Object.values(remarksTimeouts.current).forEach(timeout => clearTimeout(timeout));
    };
  }, []);

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-gradient-to-br from-teal-500 to-teal-600 rounded-xl p-4 text-white text-center">
          <p className="text-xs font-medium opacity-80">Total Obtained</p>
          <p className="text-3xl font-bold mt-1">{totalObtained}</p>
        </div>
        <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl p-4 text-white text-center">
          <p className="text-xs font-medium opacity-80">Total Redraw</p>
          <p className="text-3xl font-bold mt-1">{totalRedraw}</p>
        </div>
        <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl p-4 text-white text-center">
          <p className="text-xs font-medium opacity-80">Completed</p>
          <p className="text-3xl font-bold mt-1">{completedCount}/{students.length}</p>
        </div>
      </div>

      {/* Toggle & Search */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5">
          <button
            onClick={() => setMode('obtained')}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
              mode === 'obtained' ? 'bg-white dark:bg-gray-700 text-teal-600 dark:text-teal-400 shadow-sm' : 'text-gray-500 dark:text-gray-400'
            }`}
          >
            Signs Obtained
          </button>
          <button
            onClick={() => setMode('redraw')}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
              mode === 'redraw' ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-gray-500 dark:text-gray-400'
            }`}
          >
            Redraw Count ({totalSignsRequired})
          </button>
        </div>
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search student..."
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-teal-500 outline-none"
          />
        </div>
      </div>

      {/* Student sign cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {filtered.length === 0 && (
          <div className="col-span-full py-12 text-center text-gray-400 dark:text-gray-500">No students found</div>
        )}
        {filtered.map(student => {
          const signs = student.signs_obtained;
          const redraw = Math.max(0, totalSignsRequired - signs);
          const displayCount = mode === 'obtained' ? signs : redraw;
          const isComplete = signs >= totalSignsRequired;
          const justInc = recentAction === student.id + '+';
          const justDec = recentAction === student.id + '-';
          const justReset = recentAction === student.id + 'reset';
          const justMax = recentAction === student.id + 'max';

          return (
            <div
              key={student.id}
              className={`bg-white dark:bg-gray-900 rounded-xl border p-4 transition-all ${
                isComplete ? 'border-emerald-300 dark:border-emerald-700 bg-emerald-50/50 dark:bg-emerald-900/10' : 'border-gray-200 dark:border-gray-700'
              } ${justReset ? 'ring-2 ring-amber-400' : ''} ${justMax ? 'ring-2 ring-emerald-400' : ''}`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-gray-800 dark:text-gray-100 truncate">{student.name}</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Roll: {student.roll_number}</p>
                </div>
                <div className="flex items-center gap-2">
                  {isComplete ? (
                    <TrendingUp size={18} className="text-emerald-500 flex-shrink-0" />
                  ) : (
                    <AlertTriangle size={18} className="text-amber-500 flex-shrink-0" />
                  )}
                  <button
                    onClick={() => handleMax(student.id)}
                    disabled={mode === 'obtained' && signs >= totalSignsRequired}
                    className="p-1 rounded hover:bg-emerald-100 dark:hover:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 transition-all active:scale-90 disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Set to max signs"
                  >
                    <SkipForward size={16} />
                  </button>
                  <button
                    onClick={() => handleReset(student.id)}
                    className="p-1 rounded hover:bg-amber-100 dark:hover:bg-amber-900/30 text-amber-600 dark:text-amber-400 transition-all active:scale-90"
                    title="Reset signs to 0"
                  >
                    <RotateCcw size={16} />
                  </button>
                </div>
              </div>

              <div className={`text-center py-3 rounded-lg mb-3 transition-all ${
                isComplete ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-gray-100 dark:bg-gray-800'
              } ${justInc ? 'scale-105' : ''} ${justDec ? 'scale-95' : ''}`}>
                <div className="text-3xl font-bold text-gray-800 dark:text-gray-100">{displayCount}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {mode === 'obtained' ? 'signs obtained' : 'redraw count'}
                </div>
                {!isComplete && (
                  <div className="text-xs text-amber-600 dark:text-amber-400 mt-1 font-medium">{redraw} redraw</div>
                )}
              </div>

              <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mb-3">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${isComplete ? 'bg-emerald-500' : 'bg-teal-500'}`}
                  style={{ width: `${Math.min(100, (signs / totalSignsRequired) * 100)}%` }}
                />
              </div>

              {/* Remarks */}
              <div className="mb-3">
                <input
                  type="text"
                  value={remarksInput[student.id] ?? student.remarks ?? ''}
                  onChange={e => handleRemarksChange(student.id, e.target.value)}
                  onFocus={() => handleRemarksFocus(student.id)}
                  onBlur={() => handleRemarksBlur(student.id)}
                  placeholder="Add remarks..."
                  className="w-full px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-teal-500 outline-none"
                />
              </div>

              <div className="flex items-center justify-center gap-4">
              
                <button
                  onClick={() => handleDecrement(student.id, signs)}
                  disabled={mode === 'obtained' ? signs <= 0 : signs >= totalSignsRequired}
                  className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-all active:scale-90"
                >
                  <Minus size={20} />
                </button>
                <span className="text-lg font-bold text-gray-700 dark:text-gray-300 w-8 text-center">{displayCount}</span>
                <button
                  onClick={() => handleIncrement(student.id, signs)}
                  disabled={mode === 'redraw' && signs <= 0}
                  className="w-12 h-12 rounded-full bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-all active:scale-90 shadow-lg shadow-teal-600/25"
                >
                  <Plus size={24} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
