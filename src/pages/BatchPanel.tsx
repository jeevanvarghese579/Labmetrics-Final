import { useMemo, useState } from 'react';
import { Check, Edit2, Search, Trash2, Users } from 'lucide-react';
import { useApp } from '../hooks/useAppContext';
import Modal from '../components/Modal';
import StudentForm from '../components/StudentForm';
import type { Student, StudentFormData } from '../lib/types';
import { rankStyle } from '../lib/ranks';

export default function BatchPanel() {
  const { students, experiments, settings, rankOptions, updateStudent, deleteStudent, upsertGrade, getGrade } = useApp();
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [editStudent, setEditStudent] = useState<Student | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const totalSignsRequired = settings?.total_signs_required ?? 10;

  const batches = useMemo(() => {
    const grouped = new Map<string, Student[]>();
    students.forEach(student => {
      const key = student.batch_number?.trim() || 'No Batch';
      grouped.set(key, [...(grouped.get(key) ?? []), student]);
    });
    return Array.from(grouped.entries())
      .map(([name, members]) => ({
        name,
        members: members.sort((a, b) => String(a.roll_number ?? '').localeCompare(String(b.roll_number ?? ''), undefined, { numeric: true })),
      }))
      .filter(batch =>
        batch.name.toLowerCase().includes(search.toLowerCase()) ||
        batch.members.some(student =>
          String(student.name ?? '').toLowerCase().includes(search.toLowerCase()) ||
          String(student.roll_number ?? '').toLowerCase().includes(search.toLowerCase())
        )
      )
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
  }, [search, students]);

  const updateBatch = async (batchName: string, patch: Partial<Student>) => {
    const members = batches.find(batch => batch.name === batchName)?.members ?? [];
    await Promise.all(members.map(student => updateStudent(student.id, patch)));
  };

  const updateBatchSigns = async (batchName: string, delta: number) => {
    const members = batches.find(batch => batch.name === batchName)?.members ?? [];
    await Promise.all(members.map(student => updateStudent(student.id, { signs_obtained: Math.max(0, student.signs_obtained + delta) })));
  };

  const updateBatchGrade = async (batchName: string, experimentId: string, grade: string) => {
    const members = batches.find(batch => batch.name === batchName)?.members ?? [];
    await Promise.all(members.map(student => upsertGrade(student.id, experimentId, grade)));
  };

  const handleSaveStudent = async (data: StudentFormData) => {
    if (!editStudent) return;
    await updateStudent(editStudent.id, data);
    setEditStudent(null);
  };

  return (
    <div className="space-y-4">
      <div className="relative max-w-md">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search batches or students..."
          className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-teal-500 outline-none"
        />
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Batch</th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Students</th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Submitted</th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Bought</th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Signs</th>
                {experiments.map(exp => (
                  <th key={exp.id} className="px-3 py-2 text-left text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">{exp.title}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {batches.length === 0 && (
                <tr><td colSpan={5 + experiments.length} className="px-3 py-8 text-center text-gray-400">No batches found</td></tr>
              )}
              {batches.map(batch => {
                const submittedCount = batch.members.filter(student => student.submitted_record).length;
                const boughtCount = batch.members.filter(student => student.bought_record).length;
                const avgSigns = batch.members.length ? Math.round(batch.members.reduce((sum, student) => sum + student.signs_obtained, 0) / batch.members.length) : 0;
                const allSubmitted = submittedCount === batch.members.length;
                const allBought = boughtCount === batch.members.length;

                return (
                  <tr key={batch.name} className="align-top">
                    <td className="px-3 py-3 font-semibold text-gray-800 dark:text-gray-100">
                      <button onClick={() => setExpanded(expanded === batch.name ? null : batch.name)} className="flex items-center gap-2 hover:text-teal-600 dark:hover:text-teal-400">
                        <Users size={16} />
                        {batch.name}
                      </button>
                    </td>
                    <td className="px-3 py-3 text-gray-600 dark:text-gray-300">{batch.members.length}</td>
                    <td className="px-3 py-3">
                      <Toggle checked={allSubmitted} onClick={() => updateBatch(batch.name, { submitted_record: !allSubmitted })} />
                      <span className="ml-2 text-xs text-gray-500">{submittedCount}/{batch.members.length}</span>
                    </td>
                    <td className="px-3 py-3">
                      <Toggle checked={allBought} onClick={() => updateBatch(batch.name, { bought_record: !allBought })} />
                      <span className="ml-2 text-xs text-gray-500">{boughtCount}/{batch.members.length}</span>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <button onClick={() => updateBatchSigns(batch.name, -1)} className="h-7 w-7 rounded-full bg-red-100 text-red-600 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400">-</button>
                        <span className="w-12 text-center text-gray-700 dark:text-gray-300">{avgSigns}/{totalSignsRequired}</span>
                        <button onClick={() => updateBatchSigns(batch.name, 1)} className="h-7 w-7 rounded-full bg-teal-600 text-white hover:bg-teal-700">+</button>
                      </div>
                    </td>
                    {experiments.map(exp => (
                      <td key={exp.id} className="px-3 py-3">
                        <select
                          onChange={e => updateBatchGrade(batch.name, exp.id, e.target.value)}
                          defaultValue=""
                          className="px-2 py-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-xs text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-teal-500 outline-none"
                        >
                          <option value="">Set</option>
                          {rankOptions.map(rank => <option key={rank.label} value={rank.label}>{rank.label}</option>)}
                        </select>
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {batches.map(batch => expanded === batch.name && (
        <section key={batch.name} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 animate-fade-in">
          <h3 className="font-semibold text-gray-800 dark:text-gray-100 mb-3">{batch.name} Students</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 dark:text-gray-400">Actions</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 dark:text-gray-400">Name</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 dark:text-gray-400">Roll No.</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 dark:text-gray-400">Submitted</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 dark:text-gray-400">Signs</th>
                  {experiments.map(exp => <th key={exp.id} className="px-3 py-2 text-left text-xs font-semibold text-gray-500 dark:text-gray-400">{exp.title}</th>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {batch.members.map(student => (
                  <tr key={student.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                    <td className="px-3 py-2">
                      <div className="flex gap-1">
                        <button onClick={() => setEditStudent(student)} className="p-1 rounded text-teal-600 hover:bg-teal-50 dark:text-teal-400 dark:hover:bg-teal-900/20"><Edit2 size={14} /></button>
                        {confirmDelete === student.id ? (
                          <button onClick={() => { deleteStudent(student.id); setConfirmDelete(null); }} className="p-1 rounded bg-red-600 text-white"><Check size={12} /></button>
                        ) : (
                          <button onClick={() => setConfirmDelete(student.id)} className="p-1 rounded text-red-500 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"><Trash2 size={14} /></button>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2 font-medium text-gray-800 dark:text-gray-100">{student.name}</td>
                    <td className="px-3 py-2 text-gray-600 dark:text-gray-300">{student.roll_number}</td>
                    <td className="px-3 py-2"><Toggle checked={student.submitted_record} onClick={() => updateStudent(student.id, { submitted_record: !student.submitted_record })} /></td>
                    <td className="px-3 py-2 text-gray-600 dark:text-gray-300">{student.signs_obtained}/{totalSignsRequired}</td>
                    {experiments.map(exp => {
                      const grade = getGrade(student.id, exp.id);
                      return <td key={exp.id} className="px-3 py-2 font-semibold" style={rankStyle(rankOptions, grade)}>{grade || '-'}</td>;
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}

      <Modal open={!!editStudent} onClose={() => setEditStudent(null)} title="Edit Student">
        <StudentForm student={editStudent} onSubmit={handleSaveStudent} onCancel={() => setEditStudent(null)} />
      </Modal>
    </div>
  );
}

function Toggle({ checked, onClick }: { checked: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${checked ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-700'}`}
    >
      <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-5' : 'translate-x-0.5'}`} />
    </button>
  );
}
