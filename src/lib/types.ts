export interface Student {
  id: string;
  user_id: string;
  name: string;
  roll_number: string;
  class: string;
  division: string;
  year: string;
  batch_number: string;
  sex: string;
  bought_record: boolean;
  submitted_record: boolean;
  signs_obtained: number;
  remarks: string;
  overall_grade: string;
  created_at: string;
  updated_at: string;
}

export interface Experiment {
  id: string;
  user_id: string;
  title: string;
  experiment_number: number;
  description: string;
  created_at: string;
  updated_at: string;
}

export interface Grade {
  id: string;
  user_id: string;
  student_id: string;
  experiment_id: string;
  grade: string;
  grades?: string[];
  created_at: string;
  updated_at: string;
}

export interface AppSettings {
  id: string;
  user_id: string;
  total_experiments: number;
  total_signs_required: number;
  visible_columns: string[];
  dark_mode: boolean;
  freeze_name_roll: boolean;
  freeze_table_headings: boolean;
  rank_options?: RankOption[];
  created_at: string;
  updated_at: string;
}

export interface RankOption {
  label: string;
  color: string;
}

export type StudentFormData = Omit<Student, 'id' | 'user_id' | 'created_at' | 'updated_at'>;
export type ExperimentFormData = Omit<Experiment, 'id' | 'user_id' | 'created_at' | 'updated_at'>;
export type Page = 'login' | 'dashboard' | 'students' | 'batches' | 'experiments' | 'sign-tracker' | 'settings';

export const COLUMN_LABELS: Record<string, string> = {
  name: 'Name',
  roll_number: 'Roll No.',
  class: 'Class',
  division: 'Division',
  year: 'Year',
  batch_number: 'Batch',
  sex: 'Sex',
  bought_record: 'Bought Record',
  submitted_record: 'Submitted Record',
  signs_obtained: 'Signs Obtained',
  missing_signs: 'Missing Signs',
  overall_grade: 'Grade',
  remarks: 'Remarks',
};
