/**
 * Molecular clock maths for A3.2.5. A pair of species whose split is dated from fossils calibrates the
 * clock: rate = differences ÷ time, counted between the two species (both lineages change after the
 * split, so each lineage changes at half this rate). The estimate assumes the rate is constant.
 */

/** Differences per million years between two diverging lineages, from a fossil-dated split. */
export function rateFromCalibration(differences: number, myr: number): number {
  if (myr <= 0) throw new Error('calibration time must be positive');
  return differences / myr;
}

/** Estimated time since divergence (million years) from the number of differences. */
export function divergenceTime(differences: number, ratePerMyr: number): number {
  if (ratePerMyr <= 0) return Infinity;
  return Math.max(0, differences) / ratePerMyr;
}

/** Differences expected after a given time if the clock ticks at a constant rate. */
export function expectedDifferences(myr: number, ratePerMyr: number): number {
  return Math.max(0, myr) * ratePerMyr;
}

/**
 * Range of estimates if the true rate in these lineages could be up to `variation` (0–0.9) faster or
 * slower than the calibrated rate. A faster true rate means less time was needed.
 */
export function timeRange(differences: number, ratePerMyr: number, variation: number): [number, number] {
  const v = Math.min(0.9, Math.max(0, variation));
  return [divergenceTime(differences, ratePerMyr * (1 + v)), divergenceTime(differences, ratePerMyr * (1 - v))];
}

/** Substitutions per base per year in each lineage, given differences per Myr over `length` bases. */
export function perLineageRate(ratePerMyr: number, length: number): number {
  return ratePerMyr / (2 * length * 1e6);
}

/** Format a time in million years for display. */
export function fmtMyr(myr: number): string {
  if (!Number.isFinite(myr)) return '—';
  return myr < 10 ? myr.toFixed(1) : String(Math.round(myr));
}
