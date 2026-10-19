/**
 * Chi-squared test for association between two species (C4.1.15), from presence/absence in quadrats.
 * 2 × 2 contingency table; expected frequency = row total × column total ÷ grand total;
 * χ² = Σ (O − E)² ÷ E; degrees of freedom = (rows − 1)(columns − 1) = 1;
 * critical value at p = 0.05 with df = 1 is 3.84 (3.841).
 */
import { mulberry32 } from './c4-1-rng';

/** Observed counts: [both present, A only, B only, neither]. */
export interface Table { both: number; aOnly: number; bOnly: number; neither: number }
export const CRITICAL_05_DF1 = 3.841;
export const df = (rows: number, cols: number) => (rows - 1) * (cols - 1);

export function totals(o: Table) {
  const aPresent = o.both + o.aOnly, aAbsent = o.bOnly + o.neither;
  const bPresent = o.both + o.bOnly, bAbsent = o.aOnly + o.neither;
  return { aPresent, aAbsent, bPresent, bAbsent, grand: aPresent + aAbsent };
}

export function expected(o: Table): Table {
  const t = totals(o);
  const g = t.grand || 1;
  return {
    both: (t.bPresent * t.aPresent) / g,
    aOnly: (t.bAbsent * t.aPresent) / g,
    bOnly: (t.bPresent * t.aAbsent) / g,
    neither: (t.bAbsent * t.aAbsent) / g,
  };
}

const keys = ['both', 'aOnly', 'bOnly', 'neither'] as const;

/** Each cell's (O − E)² ÷ E. */
export function contributions(o: Table): Table {
  const e = expected(o);
  const c = {} as Table;
  for (const k of keys) c[k] = e[k] > 0 ? (o[k] - e[k]) ** 2 / e[k] : 0;
  return c;
}

export function chiSquared(o: Table): number {
  const c = contributions(o);
  return keys.reduce((s, k) => s + c[k], 0);
}

export type Verdict = 'positive' | 'negative' | 'none';

/** Significant association and its direction (positive: found together more often than expected). */
export function verdict(o: Table): Verdict {
  if (chiSquared(o) <= CRITICAL_05_DF1) return 'none';
  return o.both > expected(o).both ? 'positive' : 'negative';
}

export const smallExpected = (o: Table) => keys.some((k) => expected(o)[k] < 5);

/** Worked example used on the page: 50 quadrats; A in 25, B in 23, both in only 6. */
export const WORKED: Table = { both: 6, aOnly: 19, bOnly: 17, neither: 8 };

export type Scenario = 'independent' | 'compete' | 'together';

/**
 * A simulated survey of `n` random quadrats. Species A is present in about half. Species B's chance of
 * being present depends on A only if the species interact or share habitat requirements.
 */
export function survey(seed: number, scenario: Scenario, n = 40): Table {
  const rng = mulberry32(seed);
  const pB = { independent: [0.5, 0.5], compete: [0.25, 0.75], together: [0.75, 0.25] }[scenario];
  const t: Table = { both: 0, aOnly: 0, bOnly: 0, neither: 0 };
  for (let i = 0; i < n; i++) {
    const a = rng() < 0.5;
    const b = rng() < (a ? pB[0]! : pB[1]!);
    if (a && b) t.both++; else if (a) t.aOnly++; else if (b) t.bOnly++; else t.neither++;
  }
  return t;
}
