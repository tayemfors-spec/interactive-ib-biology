/**
 * Range of tolerance (qualitative model) and an illustrative belt-transect data set.
 *
 * Tolerance curve: a species performs best (grows, survives and reproduces well) within its
 * optimum range. On either side lie zones of physiological stress, where individuals survive but
 * grow and reproduce poorly, and beyond the limits of tolerance, zones of intolerance where the
 * species cannot survive. The factor axis runs 0–100 in arbitrary units.
 */

export type Zone = 'intolerance-low' | 'stress-low' | 'optimum' | 'stress-high' | 'intolerance-high';

export interface Tolerance { lower: number; optLow: number; optHigh: number; upper: number }

/** Tolerance limits for a species centred on 50 with a given width (0 = narrow, 1 = wide). */
export function toleranceFor(width: number): Tolerance {
  const w = Math.min(1, Math.max(0, width));
  const half = 22 + 14 * w; // half the range between the limits of tolerance
  const opt = 7 + 7 * w; // half the optimum range
  return { lower: 50 - half, optLow: 50 - opt, optHigh: 50 + opt, upper: 50 + half };
}

export function zoneOf(x: number, s: Tolerance): Zone {
  if (x <= s.lower) return 'intolerance-low';
  if (x < s.optLow) return 'stress-low';
  if (x <= s.optHigh) return 'optimum';
  if (x < s.upper) return 'stress-high';
  return 'intolerance-high';
}

/** Relative performance (0–1): 1 across the optimum, falling smoothly to 0 at each limit. */
export function performance(x: number, s: Tolerance): number {
  const z = zoneOf(x, s);
  if (z === 'optimum') return 1;
  if (z === 'intolerance-low' || z === 'intolerance-high') return 0;
  const f = z === 'stress-low' ? (x - s.lower) / (s.optLow - s.lower) : (s.upper - x) / (s.upper - s.optHigh);
  return 0.5 - 0.5 * Math.cos(Math.PI * f);
}

export const zoneText: Record<Zone, string> = {
  'intolerance-low': 'Zone of intolerance (below the lower limit of tolerance): no individuals can survive, so the species is absent.',
  'stress-low': 'Zone of physiological stress: individuals survive but grow and reproduce poorly, so the population is small.',
  optimum: 'Optimum range: individuals grow, survive and reproduce best, so the population is largest here.',
  'stress-high': 'Zone of physiological stress: individuals survive but grow and reproduce poorly, so the population is small.',
  'intolerance-high': 'Zone of intolerance (above the upper limit of tolerance): no individuals can survive, so the species is absent.',
};

/**
 * Illustrative belt transect from an open meadow (0 m) into a deciduous wood (30 m), with a
 * 1 m² quadrat every 3 m. Light at ground level is given as a percentage of the light in the
 * open meadow, as measured with a light sensor. Cover values are percentages. These are made-up
 * teaching data that follow realistic patterns; they are not real measurements.
 */
export const transect = {
  distance: [0, 3, 6, 9, 12, 15, 18, 21, 24, 27, 30],
  light: [100, 97, 90, 72, 48, 30, 19, 13, 9, 7, 5],
  grass: [78, 82, 66, 55, 28, 16, 4, 3, 0, 1, 0],
  herb: [0, 0, 3, 9, 24, 41, 47, 40, 28, 17, 9],
};
export type TransectSpecies = 'grass' | 'herb';

/** Pearson's correlation coefficient r. */
export function pearson(x: number[], y: number[]): number {
  const n = Math.min(x.length, y.length);
  const mx = x.slice(0, n).reduce((a, b) => a + b, 0) / n;
  const my = y.slice(0, n).reduce((a, b) => a + b, 0) / n;
  let sxy = 0, sxx = 0, syy = 0;
  for (let i = 0; i < n; i++) {
    const dx = x[i]! - mx, dy = y[i]! - my;
    sxy += dx * dy; sxx += dx * dx; syy += dy * dy;
  }
  return sxx && syy ? sxy / Math.sqrt(sxx * syy) : 0;
}

/** Pearson's r between light and cover, optionally only for quadrats with light at or below a value. */
export function lightCorrelation(sp: TransectSpecies, maxLight = Infinity): number {
  const idx = transect.light.map((l, i) => (l <= maxLight ? i : -1)).filter((i) => i >= 0);
  return pearson(idx.map((i) => transect.light[i]!), idx.map((i) => transect[sp][i]!));
}

export function describeR(r: number): string {
  const a = Math.abs(r);
  const strength = a >= 0.8 ? 'strong' : a >= 0.5 ? 'moderate' : a >= 0.2 ? 'weak' : 'no clear';
  if (strength === 'no clear') return 'no clear linear correlation';
  return `a ${strength} ${r > 0 ? 'positive' : 'negative'} correlation`;
}
