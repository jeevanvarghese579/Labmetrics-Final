import { useState } from 'react';
import { useApp } from '../hooks/useAppContext';
import Modal from '../components/Modal';
import type { Experiment, ExperimentFormData } from '../lib/types';
import { Plus, Edit2, Trash2, Check, X, Download, Upload } from 'lucide-react';
import { exportExperimentsCSV, importExperimentsCSV } from '../lib/csv';

const EMPTY_FORM: ExperimentFormData = {
  title: '', experiment_number: 0, description: '',
};

export default function Experiments() {
  const { experiments, students, rankOptions, addExperiment, updateExperiment, deleteExperiment, upsertGrade, getGrade } = useApp();
  const [showAdd, setShowAdd] = useState(false);
  const [editExp, setEditExp] = useState<Experiment | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [selectedExp, setSelectedExp] = useState<string | null>(null);
  const [gradeInput, setGradeInput] = useState<Record<string, string>>({});

  const handleSave = async (data: ExperimentFormData) => {
    if (editExp) await updateExperiment(editExp.id, data);
    else await addExperiment(data);
    setEditExp(null);
    setShowAdd(false);
  };

  const handleGradeSave = async (studentId: string, experimentId: string, grade: string) => {
    await upsertGrade(studentId, experimentId, grade);
  };

  const selected = selectedExp ? experiments.find(e => e.id === selectedExp) : null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium transition-colors">
          <Plus size={16} /> Add Experiment
        </button>
        <button onClick={() => exportExperimentsCSV(experiments)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
          <Download size={16} /> Export
        </button>
        <label className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer">
          <Upload size={16} /> Import
          <input type="file" accept=".csv" className="hidden" onChange={e => { if (e.target.files?.[0]) importExperimentsCSV(e.target.files[0], addExperiment); }} />
        </label>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {experiments.length === 0 && (
          <div className="col-span-full py-12 text-center text-gray-400 dark:text-gray-500">No experiments yet</div>
        )}
        {experiments.map(exp => (
          <div
            key={exp.id}
            onClick={() => setSelectedExp(selectedExp === exp.id ? null : exp.id)}
            className={`bg-white dark:bg-gray-900 rounded-xl border p-4 cursor-pointer transition-all ${
              selectedExp === exp.id ? 'border-teal-400 dark:border-teal-500 shadow-md ring-1 ring-teal-200 dark:ring-teal-800' : 'border-gray-200 dark:border-gray-700 hover:shadow-sm'
            }`}
          >
            <div className="flex items-start justify-between mb-2">
              <div>
                <h3 className="font-semibold text-gray-800 dark:text-gray-100">{exp.title}</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">Experiment #{exp.experiment_number}</p>
              </div>
              <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                <button onClick={() => setEditExp(exp)} className="p-1.5 rounded-lg hover:bg-teal-50 dark:hover:bg-teal-900/20 text-teal-600 dark:text-teal-400 transition-colors">
                  <Edit2 size={14} />
                </button>
                {confirmDelete === exp.id ? (
                  <div className="flex gap-1 items-center">
                    <button onClick={() => { deleteExperiment(exp.id); setConfirmDelete(null); }} className="p-1 rounded bg-red-600 text-white hover:bg-red-700"><Check size={12} /></button>
                    <button onClick={() => setConfirmDelete(null)} className="p-1 rounded bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200"><X size={12} /></button>
                  </div>
                ) : (
                  <button onClick={() => setConfirmDelete(exp.id)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 dark:text-red-400 transition-colors">
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>
            {exp.description && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{exp.description}</p>}
            <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">
              Grades assigned: {students.filter(s => getGrade(s.id, exp.id)).length} / {students.length}
            </div>
          </div>
        ))}
      </div>

      {selected && (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 animate-fade-in">
          <h3 className="font-semibold text-gray-800 dark:text-gray-100 mb-3">
            Grades for: {selected.title}
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400">Name</th>
                  <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400">Roll No.</th>
                  <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400">Grade</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {students.map(student => {
                  const currentGrade = getGrade(student.id, selected.id);
                  return (
                    <tr key={student.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                      <td className="px-3 py-2 text-gray-700 dark:text-gray-300 font-medium">{student.name}</td>
                      <td className="px-3 py-2 text-gray-500 dark:text-gray-400">{student.roll_number}</td>
                      <td className="px-3 py-2">
                        <select
                          value={gradeInput[student.id] ?? currentGrade ?? ''}
                          onChange={e => setGradeInput({ ...gradeInput, [student.id]: e.target.value })}
                          onBlur={() => {
                            const val = gradeInput[student.id];
                            if (val !== undefined) handleGradeSave(student.id, selected.id, val);
                          }}
                          className="px-2 py-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-teal-500 outline-none"
                        >
                          <option value="">-</option>
                          {rankOptions.map(g => (
                            <option key={g.label} value={g.label}>{g.label}</option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal open={showAdd || !!editExp} onClose={() => { setShowAdd(false); setEditExp(null); }} title={editExp ? 'Edit Experiment' : 'Add Experiment'}>
        <ExperimentForm experiment={editExp} onSubmit={handleSave} onCancel={() => { setShowAdd(false); setEditExp(null); }} />
      </Modal>
    </div>
  );
}

function ExperimentForm({ experiment, onSubmit, onCancel }: { experiment?: Experiment | null; onSubmit: (data: ExperimentFormData) => Promise<void>; onCancel: () => void }) {
  const [form, setForm] = useState<ExperimentFormData>(experiment ?? EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try { await onSubmit(form); } finally { setSaving(false); }
  };

  const inputCls = 'w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all';

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Title *</label>
        <input className={inputCls} required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Experiment Number *</label>
        <input type="number" className={inputCls} required min={1} value={form.experiment_number} onChange={e => setForm({ ...form, experiment_number: parseInt(e.target.value) || 1 })} />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Description</label>
        <textarea className={inputCls + ' resize-none'} rows={3} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
      </div>
      <div className="flex gap-3 justify-end pt-2">
        <button type="button" onClick={onCancel} className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">Cancel</button>
        <button type="submit" disabled={saving} className="px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium transition-colors disabled:opacity-50">
          {saving ? 'Saving...' : experiment ? 'Update' : 'Add Experiment'}
        </button>
      </div>
    </form>
  );
}
