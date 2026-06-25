import { useState, type FormEvent } from 'react';
import type { Student, StudentFormData } from '../lib/types';

const EMPTY_FORM: StudentFormData = {
  name: '', roll_number: '', class: '', division: '', year: '', batch_number: '', sex: '',
  bought_record: false, submitted_record: false, signs_obtained: 0,
  remarks: '', overall_grade: '',
};

interface StudentFormProps {
  student?: Student | null;
  onSubmit: (data: StudentFormData) => Promise<void>;
  onCancel: () => void;
}

export default function StudentForm({ student, onSubmit, onCancel }: StudentFormProps) {
  const [form, setForm] = useState<StudentFormData>(student ?? EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try { await onSubmit(form); } finally { setSaving(false); }
  };

  const inputCls = 'w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all';
  const labelCls = 'block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1';

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>Name *</label>
          <input className={inputCls} required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
        </div>
        <div>
          <label className={labelCls}>Roll Number *</label>
          <input className={inputCls} required value={form.roll_number} onChange={e => setForm({ ...form, roll_number: e.target.value })} />
        </div>
        <div>
          <label className={labelCls}>Class</label>
          <input className={inputCls} value={form.class} onChange={e => setForm({ ...form, class: e.target.value })} />
        </div>
        <div>
          <label className={labelCls}>Division</label>
          <input className={inputCls} value={form.division} onChange={e => setForm({ ...form, division: e.target.value })} />
        </div>
        <div>
          <label className={labelCls}>Year</label>
          <input className={inputCls} value={form.year} onChange={e => setForm({ ...form, year: e.target.value })} />
        </div>
        <div>
          <label className={labelCls}>Batch Number</label>
          <input className={inputCls} value={form.batch_number} onChange={e => setForm({ ...form, batch_number: e.target.value })} />
        </div>
        <div>
          <label className={labelCls}>Sex</label>
          <select className={inputCls} value={form.sex} onChange={e => setForm({ ...form, sex: e.target.value })}>
            <option value="">Select</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Other">Other</option>
          </select>
        </div>
        <div>
          <label className={labelCls}>Overall Grade</label>
          <input className={inputCls} value={form.overall_grade} onChange={e => setForm({ ...form, overall_grade: e.target.value })} placeholder="A, B, C..." />
        </div>
      </div>

      <div className="flex gap-6">
        <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
          <input type="checkbox" checked={form.bought_record} onChange={e => setForm({ ...form, bought_record: e.target.checked })} className="w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500" />
          Bought Record
        </label>
        <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
          <input type="checkbox" checked={form.submitted_record} onChange={e => setForm({ ...form, submitted_record: e.target.checked })} className="w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500" />
          Submitted Record
        </label>
      </div>

      <div>
        <label className={labelCls}>Signs Obtained</label>
        <input type="number" min={0} className={inputCls} value={form.signs_obtained} onChange={e => setForm({ ...form, signs_obtained: parseInt(e.target.value) || 0 })} />
      </div>

      <div>
        <label className={labelCls}>Remarks</label>
        <textarea className={inputCls + ' resize-none'} rows={2} value={form.remarks} onChange={e => setForm({ ...form, remarks: e.target.value })} />
      </div>

      <div className="flex gap-3 justify-end pt-2">
        <button type="button" onClick={onCancel} className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">Cancel</button>
        <button type="submit" disabled={saving} className="px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium transition-colors disabled:opacity-50">
          {saving ? 'Saving...' : student ? 'Update Student' : 'Add Student'}
        </button>
      </div>
    </form>
  );
}
