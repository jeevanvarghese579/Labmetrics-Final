import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Plus, X } from 'lucide-react';
import type { RankOption } from '../lib/types';
import { rankStyle } from '../lib/ranks';

interface GradePickerProps {
  grades: string[];
  rankOptions: RankOption[];
  onChange: (grades: string[]) => Promise<void> | void;
  label?: string;
}

export default function GradePicker({ grades, rankOptions, onChange, label = 'Select grades' }: GradePickerProps) {
  const [open, setOpen] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [localGrades, setLocalGrades] = useState(grades);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => setLocalGrades(grades), [grades]);

  useEffect(() => {
    const media = window.matchMedia('(max-width: 767px)');
    const update = () => setMobile(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  useLayoutEffect(() => {
    if (!open || mobile || !triggerRef.current) return;
    const updatePosition = () => {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const width = 224;
      const height = panelRef.current?.offsetHeight ?? 260;
      const gap = 6;
      const left = Math.min(Math.max(8, rect.left), window.innerWidth - width - 8);
      const below = rect.bottom + gap;
      const top = below + height <= window.innerHeight - 8
        ? below
        : Math.max(8, rect.top - height - gap);
      setPosition({ top, left });
    };
    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [open, mobile]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open]);

  const addGrade = async (grade: string) => {
    const next = [...localGrades, grade];
    setLocalGrades(next);
    await onChange(next);
  };

  const removeGrade = async (index: number) => {
    const next = localGrades.filter((_, itemIndex) => itemIndex !== index);
    setLocalGrades(next);
    await onChange(next);
  };

  const clearGrades = async () => {
    setLocalGrades([]);
    await onChange([]);
  };

  const panel = open ? (
    <>
      <button
        type="button"
        aria-label="Close grade picker"
        className={`fixed inset-0 z-[90] ${mobile ? 'bg-black/50 backdrop-blur-sm' : 'bg-transparent'}`}
        onClick={() => setOpen(false)}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal={mobile || undefined}
        aria-label={label}
        className={mobile
          ? 'fixed inset-x-4 top-1/2 z-[100] max-h-[80dvh] -translate-y-1/2 overflow-y-auto rounded-2xl border border-gray-200 bg-white p-4 shadow-2xl dark:border-gray-700 dark:bg-gray-900'
          : 'fixed z-[100] w-56 max-h-72 overflow-y-auto rounded-xl border border-gray-200 bg-white p-2 shadow-2xl dark:border-gray-700 dark:bg-gray-900'}
        style={mobile ? undefined : { top: position.top, left: position.left }}
        onClick={event => event.stopPropagation()}
      >
        <div className="mb-2 flex items-center justify-between gap-3 px-1">
          <div>
            <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{label}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Tap a grade to add another</p>
          </div>
          <button type="button" onClick={() => setOpen(false)} className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800" aria-label="Done">
            <X size={18} />
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {rankOptions.map(rank => {
            const count = localGrades.filter(grade => grade === rank.label).length;
            return (
              <button
                type="button"
                key={rank.label}
                onClick={() => void addGrade(rank.label)}
                className={`flex min-h-10 items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm font-semibold transition-colors ${count ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/30' : 'border-gray-200 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800'}`}
                style={{ color: rank.color }}
              >
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: rank.color }} />
                <span className="flex-1">{rank.label}</span>
                {count > 0 && <span className="rounded-full bg-teal-600 px-1.5 py-0.5 text-[10px] leading-none text-white">{count}</span>}
              </button>
            );
          })}
        </div>
        {localGrades.length > 0 && (
          <div className="mt-3 border-t border-gray-200 pt-3 dark:border-gray-700">
            <p className="mb-2 px-1 text-xs font-medium text-gray-500 dark:text-gray-400">Selected — tap × to remove one</p>
            <div className="flex flex-wrap gap-1.5">
              {localGrades.map((grade, index) => (
                <button
                  type="button"
                  key={`${grade}-${index}`}
                  onClick={() => void removeGrade(index)}
                  className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-2 py-1 text-xs font-semibold hover:bg-red-50 dark:bg-gray-800 dark:hover:bg-red-900/20"
                  style={rankStyle(rankOptions, grade)}
                  aria-label={`Remove one ${grade} grade`}
                >
                  {grade}<X size={12} />
                </button>
              ))}
            </div>
            <button type="button" onClick={() => void clearGrades()} className="mt-2 w-full rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20">
              Clear all grades
            </button>
          </div>
        )}
        {mobile && (
          <button type="button" onClick={() => setOpen(false)} className="mt-2 w-full rounded-lg bg-teal-600 px-3 py-2.5 text-sm font-semibold text-white hover:bg-teal-700">
            Done
          </button>
        )}
      </div>
    </>
  ) : null;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={event => { event.stopPropagation(); setOpen(true); }}
        className="group flex min-h-8 min-w-10 items-center gap-1 rounded-lg px-1.5 py-1 text-left hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-teal-500 dark:hover:bg-blue-900/20"
        aria-label={label}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        {localGrades.length ? localGrades.map((grade, index) => (
          <span key={`${grade}-${index}`} className="rounded-md bg-gray-100 px-1.5 py-0.5 text-xs font-semibold dark:bg-gray-800" style={rankStyle(rankOptions, grade)}>
            {grade}
          </span>
        )) : <span className="text-gray-400">-</span>}
        <span className="ml-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-teal-600 text-white shadow-sm group-hover:bg-teal-700" title="Add another grade">
          <Plus size={13} strokeWidth={3} />
        </span>
      </button>
      {panel && createPortal(panel, document.body)}
    </>
  );
}
