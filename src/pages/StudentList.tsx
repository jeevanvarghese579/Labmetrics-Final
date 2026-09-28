import { useState, useMemo } from 'react';
import { useApp } from '../hooks/useAppContext';
import Modal from '../components/Modal';
import StudentForm from '../components/StudentForm';
import type { Student, StudentFormData } from '../lib/types';
import { Search, Plus, Edit2, Trash2, Download, Upload, Check, X } from 'lucide-react';
import { exportStudentsCSV, importStudentsCSV } from '../lib/csv';

export default function StudentList() {
  const { students, settings, addStudent, updateStudent, deleteStudent } = useApp();
  const totalSignsRequired = settings?.total_signs_required ?? 10;
  const [search, setSearch] = useState('');
  const [editStudent, setEditStudent] = useState<Student | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const filtered = useMemo(() =>
    students.filter(s =>
      String(s.name ?? '').toLowerCase().includes(search.toLowerCase()) ||
      String(s.roll_number ?? '').toLowerCase().includes(search.toLowerCase()) ||
      String(s.class ?? '').toLowerCase().includes(search.toLowerCase()) ||
      String(s.batch_number ?? '').toLowerCase().includes(search.toLowerCase())
    ), [students, search]);

  const handleSave = async (data: StudentFormData) => {
    if (editStudent) await updateStudent(editStudent.id, data);
    else await addStudent(data);
    setEditStudent(null);
    setShowAdd(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, roll no, class, batch..."
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-teal-500 outline-none"
          />
        </div>
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium transition-colors">
          <Plus size={16} /> Add Student
        </button>
        <button onClick={() => exportStudentsCSV(students, [], () => '')} className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
          <Download size={16} /> Export
        </button>
        <label className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer">
          <Upload size={16} /> Import
          <input type="file" accept=".csv" className="hidden" onChange={e => { if (e.target.files?.[0]) importStudentsCSV(e.target.files[0], addStudent); }} />
        </label>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.length === 0 && (
          <div className="col-span-full py-12 text-center text-gray-400 dark:text-gray-500">No students found</div>
        )}
        {filtered.map(student => (
          <div key={student.id} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-semibold text-gray-800 dark:text-gray-100">{student.name}</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Roll: {student.roll_number}</p>
              </div>
              <div className="flex gap-1">
                <button onClick={() => setEditStudent(student)} className="p-1.5 rounded-lg hover:bg-teal-50 dark:hover:bg-teal-900/20 text-teal-600 dark:text-teal-400 transition-colors">
                  <Edit2 size={14} />
                </button>
                {confirmDelete === student.id ? (
                  <div className="flex gap-1 items-center">
                    <button onClick={() => { deleteStudent(student.id); setConfirmDelete(null); }} className="p-1 rounded bg-red-600 text-white hover:bg-red-700"><Check size={12} /></button>
                    <button onClick={() => setConfirmDelete(null)} className="p-1 rounded bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200"><X size={12} /></button>
                  </div>
                ) : (
                  <button onClick={() => setConfirmDelete(student.id)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 dark:text-red-400 transition-colors">
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
              <InfoRow label="Class" value={student.class} />
              <InfoRow label="Division" value={student.division} />
              <InfoRow label="Year" value={student.year} />
              <InfoRow label="Batch" value={student.batch_number} />
              <InfoRow label="Sex" value={student.sex} />
              <InfoRow label="Grade" value={student.overall_grade || '-'} />
              <InfoRow label="Signs" value={`${student.signs_obtained}/${totalSignsRequired}`} highlight={student.signs_obtained >= totalSignsRequired} />
              <InfoRow label="Missing" value={String(Math.max(0, totalSignsRequired - student.signs_obtained))} highlight={totalSignsRequired - student.signs_obtained <= 0} />
            </div>
            <div className="flex gap-4 mt-2 pt-2 border-t border-gray-100 dark:border-gray-800 text-xs">
              <span className={student.bought_record ? 'text-green-600 dark:text-green-400' : 'text-gray-400'}>
                Bought: {student.bought_record ? 'Yes' : 'No'}
              </span>
              <span className={student.submitted_record ? 'text-green-600 dark:text-green-400' : 'text-gray-400'}>
                Submitted: {student.submitted_record ? 'Yes' : 'No'}
              </span>
            </div>
            {student.remarks && (
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400 italic">{student.remarks}</p>
            )}
          </div>
        ))}
      </div>

      <Modal open={showAdd || !!editStudent} onClose={() => { setShowAdd(false); setEditStudent(null); }} title={editStudent ? 'Edit Student' : 'Add Student'}>
        <StudentForm student={editStudent} onSubmit={handleSave} onCancel={() => { setShowAdd(false); setEditStudent(null); }} />
      </Modal>
    </div>
  );
}

function InfoRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-500 dark:text-gray-400">{label}</span>
      <span className={highlight ? 'text-green-600 dark:text-green-400 font-medium' : 'text-gray-800 dark:text-gray-200'}>{value}</span>
    </div>
  );
}
