/**
 * Keeling curve model for C4.2.20 (atmospheric CO₂ at Mauna Loa Observatory, Hawaii).
 *
 * ANNUAL MEANS: anchor years are rounded NOAA Global Monitoring Laboratory annual means (ppm);
 * years between anchors are linearly interpolated, so they are approximate (within about 1 ppm).
 * MONTHLY VALUES: an APPROXIMATION made by adding a typical Mauna Loa seasonal cycle (peak in May,
 * minimum in late September–October, about 6 ppm from peak to trough) to the smoothed trend.
 * They show the shape of the record, not individual measurements. Sources are in facts.yaml.
 */

export const FIRST_YEAR = 1959;
export const LAST_YEAR = 2024;

/** [year, annual mean CO₂ in ppm] — NOAA GML Mauna Loa annual means, rounded to 0.1 ppm. */
export const ANCHORS: readonly [number, number][] = [
  [1959, 316.0], [1960, 316.9], [1965, 320.0], [1970, 325.7], [1975, 331.1], [1980, 338.8],
  [1985, 346.1], [1990, 354.4], [1995, 360.8], [2000, 369.7], [2005, 380.0], [2010, 389.9],
  [2015, 401.0], [2016, 404.4], [2017, 406.8], [2018, 408.7], [2019, 411.7], [2020, 414.2],
  [2021, 416.4], [2022, 418.6], [2023, 421.1], [2024, 424.6],
];

/** Typical detrended seasonal cycle at Mauna Loa, Jan…Dec (ppm relative to the annual mean; sums to 0). */
export const SEASONAL: readonly number[] = [-0.1, 0.6, 1.3, 2.6, 3.1, 2.4, 0.6, -1.4, -3.0, -3.2, -2.0, -0.9];
export const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;

/** Annual mean for a whole year (interpolated between anchors). */
export function annualMean(year: number): number {
  const y = Math.max(FIRST_YEAR, Math.min(LAST_YEAR, year));
  for (let i = 0; i + 1 < ANCHORS.length; i++) {
    const [y0, v0] = ANCHORS[i]!, [y1, v1] = ANCHORS[i + 1]!;
    if (y >= y0 && y <= y1) return v0 + ((v1 - v0) * (y - y0)) / (y1 - y0);
  }
  return ANCHORS.at(-1)![1];
}

/** Smoothed trend at a fractional date (an annual mean is centred on the middle of its year). */
export function trend(t: number): number {
  const c = t - 0.5;
  const lo = Math.floor(c);
  const f = c - lo;
  const a = annualMean(Math.max(FIRST_YEAR, lo)), b = annualMean(Math.min(LAST_YEAR, lo + 1));
  if (c < FIRST_YEAR) return annualMean(FIRST_YEAR) + (annualMean(FIRST_YEAR + 1) - annualMean(FIRST_YEAR)) * (c - FIRST_YEAR);
  if (c > LAST_YEAR) return annualMean(LAST_YEAR) + (annualMean(LAST_YEAR) - annualMean(LAST_YEAR - 1)) * (c - LAST_YEAR);
  return a + (b - a) * f;
}

/** Approximate monthly mean for month m (0 = January) of a year. */
export const monthly = (year: number, m: number) => trend(year + (m + 0.5) / 12) + SEASONAL[m]!;

export interface Point { t: number; ppm: number }
/** Every approximate monthly value from January FIRST_YEAR to December LAST_YEAR. */
export function series(): Point[] {
  const out: Point[] = [];
  for (let y = FIRST_YEAR; y <= LAST_YEAR; y++) for (let m = 0; m < 12; m++) out.push({ t: y + (m + 0.5) / 12, ppm: monthly(y, m) });
  return out;
}

export interface YearSummary { year: number; mean: number; max: number; maxMonth: string; min: number; minMonth: string; swing: number; riseSinceStart: number }
export function yearSummary(year: number): YearSummary {
  const vals = MONTHS.map((_, m) => monthly(year, m));
  const max = Math.max(...vals), min = Math.min(...vals);
  return {
    year, mean: annualMean(year), max, maxMonth: MONTHS[vals.indexOf(max)]!, min, minMonth: MONTHS[vals.indexOf(min)]!,
    swing: max - min, riseSinceStart: annualMean(year) - annualMean(FIRST_YEAR),
  };
}

/** Average yearly increase in the annual mean over a decade starting at `start`. */
export const growthRate = (start: number, years = 10) => (annualMean(start + years) - annualMean(start)) / years;
