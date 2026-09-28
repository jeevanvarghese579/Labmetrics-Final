import { useState, useEffect } from 'react';
import { useApp } from '../hooks/useAppContext';
import { COLUMN_LABELS, type RankOption } from '../lib/types';
import { Download, Upload, Sun, Moon, Info, Save, Plus, Trash2, ArrowUp, ArrowDown, AlertTriangle } from 'lucide-react';
import { exportStudentsCSV, importStudentsCSV, exportExperimentsCSV, importExperimentsCSV } from '../lib/csv';
import { DEFAULT_RANKS, normalizeRanks } from '../lib/ranks';

export default function Settings({ dark, toggleDark }: { dark: boolean; toggleDark: () => void }) {
  const { students, experiments, settings, rankOptions, updateSettings, updateRankOptions, addStudent, addExperiment, getGrade, exportBackup, restoreBackup, resetAll } = useApp();
  const [totalExperiments, setTotalExperiments] = useState(settings?.total_experiments ?? 10);
  const [totalSigns, setTotalSigns] = useState(settings?.total_signs_required ?? 10);
  const [visibleCols, setVisibleCols] = useState<string[]>(settings?.visible_columns ?? Object.keys(COLUMN_LABELS));
  const [freezeNameRoll, setFreezeNameRoll] = useState(settings?.freeze_name_roll ?? true);
  const [freezeTableHeadings, setFreezeTableHeadings] = useState(settings?.freeze_table_headings ?? true);
  const [rankDraft, setRankDraft] = useState<RankOption[]>(rankOptions);
  const [saved, setSaved] = useState(false);
  const [restoreStatus, setRestoreStatus] = useState('');

  useEffect(() => {
    if (settings) {
      setTotalExperiments(settings.total_experiments);
      setTotalSigns(settings.total_signs_required);
      setVisibleCols(settings.visible_columns);
      setFreezeNameRoll(settings.freeze_name_roll ?? false);
      setFreezeTableHeadings(settings.freeze_table_headings ?? false);
    }
  }, [settings]);

  useEffect(() => {
    setRankDraft(rankOptions);
  }, [rankOptions]);

  const handleSave = async () => {
    await updateSettings({
      total_experiments: totalExperiments,
      total_signs_required: totalSigns,
      visible_columns: visibleCols,
      dark_mode: dark,
      freeze_name_roll: freezeNameRoll,
      freeze_table_headings: freezeTableHeadings,
    });
    await updateRankOptions(rankDraft);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleResetAll = async () => {
    if (window.confirm('Reset this account\'s LabMetrics data? This deletes only LabMetrics students, experiments, and grades. Other apps and LabMetrics settings are not affected. This action cannot be undone.')) {
      try {
        await resetAll();
        setRestoreStatus('LabMetrics students, experiments, and grades were reset successfully');
      } catch (error) {
        setRestoreStatus(error instanceof Error ? error.message : 'Reset failed');
      }
    }
  };

  const toggleCol = (col: string) => {
    setVisibleCols(prev => prev.includes(col) ? prev.filter(c => c !== col) : [...prev, col]);
  };

  const updateRank = (index: number, patch: Partial<RankOption>) => {
    setRankDraft(prev => prev.map((rank, i) => i === index ? { ...rank, ...patch } : rank));
  };

  const moveRank = (index: number, direction: -1 | 1) => {
    setRankDraft(prev => {
      const next = [...prev];
      const target = index + direction;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const downloadBackup = () => {
    const blob = new Blob([JSON.stringify(exportBackup(), null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `labmetrics-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleRestore = async (file: File) => {
    setRestoreStatus('Restoring...');
    try {
      await restoreBackup(JSON.parse(await file.text()));
      setRestoreStatus('Restore complete');
    } catch (error) {
      setRestoreStatus(error instanceof Error ? error.message : 'Restore failed');
    }
  };

  const inputCls = 'w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 text-sm focus:ring-2 focus:ring-teal-500 outline-none transition-all';

  return (
    <div className="max-w-4xl space-y-6">
      {/* General */}
      <section className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
        <h3 className="font-semibold text-gray-800 dark:text-gray-100 mb-4">General Settings</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Total Number of Experiments</label>
            <input type="number" min={1} className={inputCls} value={totalExperiments} onChange={e => setTotalExperiments(parseInt(e.target.value) || 1)} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Total Signs Required</label>
            <input type="number" min={1} className={inputCls} value={totalSigns} onChange={e => setTotalSigns(parseInt(e.target.value) || 1)} />
          </div>
        </div>
      </section>

      {/* Ranks */}
      <section className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="font-semibold text-gray-800 dark:text-gray-100">Rank Options</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Order, names, and colors used for experiment grades</p>
          </div>
          <button onClick={() => setRankDraft(DEFAULT_RANKS)} className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 text-xs text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">
            Reset
          </button>
        </div>
        <div className="space-y-2">
          {rankDraft.map((rank, index) => (
            <div key={`${rank.label}-${index}`} className="grid grid-cols-[auto_1fr_auto_auto_auto] items-center gap-2">
              <input
                type="color"
                value={/^#[0-9a-f]{6}$/i.test(rank.color) ? rank.color : '#64748b'}
                onChange={e => updateRank(index, { color: e.target.value })}
                className="h-9 w-10 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
              />
              <input
                className={inputCls}
                value={rank.label}
                onChange={e => updateRank(index, { label: e.target.value })}
                placeholder="Rank"
              />
              <button onClick={() => moveRank(index, -1)} disabled={index === 0} className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-500 disabled:opacity-30 hover:bg-gray-50 dark:hover:bg-gray-800">
                <ArrowUp size={14} />
              </button>
              <button onClick={() => moveRank(index, 1)} disabled={index === rankDraft.length - 1} className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-500 disabled:opacity-30 hover:bg-gray-50 dark:hover:bg-gray-800">
                <ArrowDown size={14} />
              </button>
              <button onClick={() => setRankDraft(prev => prev.filter((_, i) => i !== index))} className="p-2 rounded-lg border border-red-200 dark:border-red-800 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20">
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
        <button onClick={() => setRankDraft(prev => [...prev, { label: '', color: '#64748b' }])} className="mt-3 flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">
          <Plus size={14} /> Add Rank
        </button>
        {normalizeRanks(rankDraft).length !== rankDraft.filter(rank => rank.label.trim()).length && (
          <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">Empty names or invalid colors are ignored when saved.</p>
        )}
      </section>

      {/* Dark Mode */}
      <section className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-800 dark:text-gray-100">Dark Mode</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Toggle between light and dark theme</p>
          </div>
          <button
            onClick={toggleDark}
            className={`relative w-14 h-7 rounded-full transition-colors duration-300 ${dark ? 'bg-teal-600' : 'bg-gray-300'}`}
          >
            <span className={`absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-white shadow transition-transform duration-300 flex items-center justify-center ${dark ? 'translate-x-7' : 'translate-x-0'}`}>
              {dark ? <Moon size={12} className="text-teal-600" /> : <Sun size={12} className="text-amber-500" />}
            </span>
          </button>
        </div>
      </section>

      {/* Freeze Name/Roll */}
      <section className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-800 dark:text-gray-100">Freeze Name & Roll No</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Keep name and roll number visible when scrolling horizontally</p>
          </div>
          <button
            onClick={() => setFreezeNameRoll(f => !f)}
            className={`relative w-14 h-7 rounded-full transition-colors duration-300 ${freezeNameRoll ? 'bg-teal-600' : 'bg-gray-300'}`}
          >
            <span className={`absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-white shadow transition-transform duration-300 ${freezeNameRoll ? 'translate-x-7' : 'translate-x-0'}`} />
          </button>
        </div>
      </section>

      {/* Freeze Table Headings */}
      <section className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-800 dark:text-gray-100">Freeze Table Headings</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Keep table headings visible when scrolling vertically</p>
          </div>
          <button
            onClick={() => setFreezeTableHeadings(f => !f)}
            className={`relative w-14 h-7 rounded-full transition-colors duration-300 ${freezeTableHeadings ? 'bg-teal-600' : 'bg-gray-300'}`}
          >
            <span className={`absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-white shadow transition-transform duration-300 ${freezeTableHeadings ? 'translate-x-7' : 'translate-x-0'}`} />
          </button>
        </div>
      </section>

      {/* Reset All */}
      <section className="bg-white dark:bg-gray-900 rounded-xl border border-red-200 dark:border-red-800 p-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-red-600 dark:text-red-400">Reset All Data</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Delete only this account's LabMetrics students, experiments, and grades</p>
          </div>
          <button
            onClick={handleResetAll}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-red-200 dark:border-red-800 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          >
            <AlertTriangle size={14} /> Reset All
          </button>
        </div>
      </section>

      {/* Backup */}
      <section className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
        <h3 className="font-semibold text-gray-800 dark:text-gray-100 mb-2">Universal Backup / Restore</h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Export or restore students, experiments, grades, settings, and rank options</p>
        <div className="flex flex-wrap gap-2">
          <button onClick={downloadBackup} className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            <Download size={14} /> Backup
          </button>
          <label className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-red-200 dark:border-red-800 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors cursor-pointer">
            <Upload size={14} /> Restore
            <input type="file" accept=".json" className="hidden" onChange={e => { if (e.target.files?.[0]) handleRestore(e.target.files[0]); e.currentTarget.value = ''; }} />
          </label>
        </div>
        {restoreStatus && <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">{restoreStatus}</p>}
      </section>

      {/* Columns */}
      <section className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
        <h3 className="font-semibold text-gray-800 dark:text-gray-100 mb-2">Dashboard Column Visibility</h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">Toggle which columns appear in the dashboard table</p>
        <div className="flex flex-wrap gap-2">
          {Object.entries(COLUMN_LABELS).map(([key, label]) => (
            <button
              key={key}
              onClick={() => toggleCol(key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                visibleCols.includes(key)
                  ? 'bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 ring-1 ring-teal-300 dark:ring-teal-700'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </section>

      {/* CSV */}
      <section className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
        <h3 className="font-semibold text-gray-800 dark:text-gray-100 mb-2">Data Import / Export</h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Import or export data as CSV files</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-2">
            <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Students</p>
            <div className="flex gap-2">
              <button onClick={() => exportStudentsCSV(students, experiments, getGrade)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                <Download size={14} /> Export
              </button>
              <label className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer">
                <Upload size={14} /> Import
                <input type="file" accept=".csv" className="hidden" onChange={e => { if (e.target.files?.[0]) importStudentsCSV(e.target.files[0], addStudent); }} />
              </label>
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Experiments</p>
            <div className="flex gap-2">
              <button onClick={() => exportExperimentsCSV(experiments)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                <Download size={14} /> Export
              </button>
              <label className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer">
                <Upload size={14} /> Import
                <input type="file" accept=".csv" className="hidden" onChange={e => { if (e.target.files?.[0]) importExperimentsCSV(e.target.files[0], addExperiment); }} />
              </label>
            </div>
          </div>
        </div>
      </section>

      {/* Save */}
      <button
        onClick={handleSave}
        className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium transition-colors"
      >
        <Save size={16} />
        {saved ? 'Saved!' : 'Save Settings'}
      </button>

      {/* About */}
      <section className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
        <div className="flex items-center gap-2 mb-3">
          <Info size={18} className="text-teal-600 dark:text-teal-400" />
          <h3 className="font-semibold text-gray-800 dark:text-gray-100">About</h3>
        </div>
        <div className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
          <p className="font-semibold text-gray-800 dark:text-gray-100">LabMetrics - Student Practical Tracker 1.71</p>
          <p>Developed by <span className="font-medium">Jeevan Varghese</span></p>
          <p>St. Gemma's Girls' HSS Malappuram</p>
          <a href="https://itsjeevanvarghese.web.app" target="_blank" rel="noopener noreferrer" className="text-teal-600 dark:text-teal-400 hover:underline">
            itsjeevanvarghese.web.app
          </a>
        </div>
      </section>
    </div>
  );
}
