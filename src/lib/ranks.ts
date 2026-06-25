import type { RankOption } from './types';

export const DEFAULT_RANKS: RankOption[] = [
  { label: 'S', color: '#3b82f6' },
  { label: 'A+', color: '#16a34a' },
  { label: 'A', color: '#22c55e' },
  { label: 'B+', color: '#f97316' },
  { label: 'B', color: '#fb923c' },
  { label: 'C+', color: '#f59e0b' },
  { label: 'C', color: '#ef4444' },
  { label: 'D', color: '#dc2626' },
  { label: 'Ab', color: '#000000' },
];

export function normalizeRanks(value: unknown): RankOption[] {
  if (!Array.isArray(value)) return DEFAULT_RANKS;
  const ranks = value
    .map(item => ({
      label: String((item as Partial<RankOption>)?.label ?? '').trim(),
      color: String((item as Partial<RankOption>)?.color ?? '').trim(),
    }))
    .filter(item => item.label && /^#[0-9a-f]{6}$/i.test(item.color));
  return ranks.length ? ranks : DEFAULT_RANKS;
}

export function rankStyle(ranks: RankOption[], label: string) {
  const rank = ranks.find(item => item.label === label);
  return rank ? { color: rank.color } : undefined;
}
