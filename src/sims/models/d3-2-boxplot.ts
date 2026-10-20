/**
 * Descriptive statistics and box-and-whisker plots for a continuous variable (D3.2.14, D3.2.15).
 * Quartiles are the medians of the lower and upper halves of the ordered data (the median itself is
 * left out of both halves when n is odd). Outliers lie more than 1.5 × IQR below Q1 or above Q3; the
 * whiskers end at the smallest and largest values that are not outliers.
 */

export const sorted = (xs: number[]) => [...xs].sort((a, b) => a - b);

export function median(xs: number[]): number {
  const s = sorted(xs);
  const n = s.length;
  if (n === 0) return NaN;
  return n % 2 ? s[(n - 1) / 2]! : (s[n / 2 - 1]! + s[n / 2]!) / 2;
}

export const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN);

/** All values that occur most often (empty if every value occurs once). */
export function modes(xs: number[]): number[] {
  const counts = new Map<number, number>();
  for (const x of xs) counts.set(x, (counts.get(x) ?? 0) + 1);
  const top = Math.max(0, ...counts.values());
  if (top <= 1) return [];
  return sorted([...counts].filter(([, c]) => c === top).map(([v]) => v));
}

export function quartiles(xs: number[]): { q1: number; q2: number; q3: number } {
  const s = sorted(xs);
  const n = s.length;
  const half = Math.floor(n / 2);
  const lower = s.slice(0, half);
  const upper = s.slice(n % 2 ? half + 1 : half);
  return { q1: median(lower.length ? lower : s), q2: median(s), q3: median(upper.length ? upper : s) };
}

export interface Summary {
  n: number; min: number; max: number; q1: number; median: number; q3: number; iqr: number;
  lowFence: number; highFence: number; whiskerLow: number; whiskerHigh: number; outliers: number[];
  mean: number; modes: number[];
}

export function summarise(xs: number[]): Summary {
  const s = sorted(xs);
  const { q1, q2, q3 } = quartiles(s);
  const iqr = q3 - q1;
  const lowFence = q1 - 1.5 * iqr, highFence = q3 + 1.5 * iqr;
  const inside = s.filter((x) => x >= lowFence && x <= highFence);
  return {
    n: s.length, min: s[0]!, max: s[s.length - 1]!, q1, median: q2, q3, iqr, lowFence, highFence,
    whiskerLow: inside[0]!, whiskerHigh: inside[inside.length - 1]!,
    outliers: s.filter((x) => x < lowFence || x > highFence), mean: mean(s), modes: modes(s),
  };
}

/** Read numbers from typed text (commas, spaces or new lines between values). */
export function parseData(text: string): number[] {
  return text.split(/[\s,;]+/).map((t) => t.trim()).filter(Boolean).map(Number).filter((x) => Number.isFinite(x));
}

/** Illustrative data sets (not real measurements). */
export const DATA_SETS: { id: string; label: string; unit: string; values: number[] }[] = [
  { id: 'height', label: 'Heights of 21 students (cm)', unit: 'cm',
    values: [152, 155, 158, 160, 161, 162, 163, 164, 165, 165, 166, 167, 168, 169, 170, 171, 172, 174, 176, 178, 181] },
  { id: 'height-outlier', label: 'Heights of 20 students, one very tall (cm)', unit: 'cm',
    values: [154, 157, 159, 160, 161, 162, 162, 163, 164, 165, 166, 166, 167, 168, 169, 170, 171, 173, 175, 198] },
  { id: 'skin', label: 'Melanin index of the skin of 16 people', unit: 'units',
    values: [21, 24, 26, 27, 29, 30, 31, 31, 33, 35, 36, 38, 41, 44, 47, 68] },
];
