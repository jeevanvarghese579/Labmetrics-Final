import type { Student, Experiment, StudentFormData, ExperimentFormData } from './types';

function downloadCSV(filename: string, csv: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') { current += '"'; i++; }
        else inQuotes = false;
      } else { current += ch; }
    } else {
      if (ch === '"') inQuotes = true;
      else if (ch === ',') { result.push(current.trim()); current = ''; }
      else current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

export function exportStudentsCSV(students: Student[], experiments: Experiment[], getGrade: (studentId: string, experimentId: string) => string) {
  const expHeaders = experiments.map(e => e.title);
  const headers = ['Name', 'Roll Number', 'Class', 'Division', 'Year', 'Batch Number', 'Sex', 'Bought Record', 'Submitted Record', 'Signs Obtained', 'Remarks', 'Overall Grade', ...expHeaders];
  const rows = students.map(s => {
    const base = [s.name, s.roll_number, s.class, s.division, s.year, s.batch_number, s.sex, s.bought_record ? 'Yes' : 'No', s.submitted_record ? 'Yes' : 'No', s.signs_obtained, s.remarks, s.overall_grade];
    const expGrades = experiments.map(e => getGrade(s.id, e.id));
    return [...base, ...expGrades].map(v => `"${String(v).replace(/"/g, '""')}"`).join(',');
  });
  downloadCSV('students.csv', [headers.join(','), ...rows].join('\n'));
}

export async function importStudentsCSV(file: File, addStudent: (data: StudentFormData) => Promise<void>) {
  const text = await file.text();
  const lines = text.split('\n').filter(l => l.trim());
  if (lines.length < 2) return;
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i]);
    if (cols.length < 6) continue;
    await addStudent({
      name: cols[0] || '', roll_number: cols[1] || '', class: cols[2] || '',
      division: cols[3] || '', year: cols[4] || '', batch_number: cols[5] || '',
      sex: cols[6] || '', bought_record: cols[7]?.toLowerCase() === 'yes',
      submitted_record: cols[8]?.toLowerCase() === 'yes',
      signs_obtained: parseInt(cols[9]) || 0,
      remarks: cols[10] || '', overall_grade: cols[11] || '',
    });
  }
}

export function exportExperimentsCSV(experiments: Experiment[]) {
  const headers = ['Title', 'Experiment Number', 'Description'];
  const rows = experiments.map(e =>
    [e.title, e.experiment_number, e.description].map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')
  );
  downloadCSV('experiments.csv', [headers.join(','), ...rows].join('\n'));
}

export async function importExperimentsCSV(file: File, addExperiment: (data: ExperimentFormData) => Promise<void>) {
  const text = await file.text();
  const lines = text.split('\n').filter(l => l.trim());
  if (lines.length < 2) return;
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i]);
    if (cols.length < 2) continue;
    await addExperiment({
      title: cols[0] || '', experiment_number: parseInt(cols[1]) || 1, description: cols[2] || '',
    });
  }
}
