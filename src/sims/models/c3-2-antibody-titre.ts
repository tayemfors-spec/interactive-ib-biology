/**
 * Qualitative model of antibody concentration after a first and a second exposure to an antigen (C3.2.10, C3.2.16).
 *
 * Each response is a lag (no new antibody yet), a smooth rise to a peak, then an exponential decline as
 * plasma cells die and antibodies are broken down. Responses add together.
 *   primary:   lag ≈ 7 days, peak ≈ day 14, peak 1 unit, half-life of decline ≈ 10 days
 *   secondary: lag ≈ 2 days, peak ≈ day 7, peak 10 units, half-life of decline ≈ 30 days
 * The secondary response happens only if memory cells for that antigen exist; without them (or with a
 * different antigen) the second exposure gives another primary response. Numbers are illustrative, chosen
 * to match the textbook pattern (secondary faster, often 10–100× larger and longer-lasting).
 */
export interface Response { lag: number; rise: number; peak: number; halfLife: number }

export const PRIMARY: Response = { lag: 7, rise: 7, peak: 1, halfLife: 10 };
export const SECONDARY: Response = { lag: 2, rise: 5, peak: 10, halfLife: 30 };

export interface TitreParams {
  /** Day of the second exposure (the first is on day 0). */
  second: number;
  /** Memory cells were made in the first response (false: e.g. a different antigen, or no memory). */
  memory: boolean;
  /** Is the second exposure the same antigen as the first? */
  sameAntigen: boolean;
}

const smooth = (x: number) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));

/** Antibody concentration contributed by one response, `days` after the exposure. */
export function response(r: Response, days: number): number {
  if (days <= r.lag) return 0;
  const u = days - r.lag;
  if (u <= r.rise) return r.peak * smooth(u / r.rise);
  return r.peak * 2 ** (-(u - r.rise) / r.halfLife);
}

/** Antibodies specific to the FIRST antigen, plus (separately) antibodies to a second, different antigen. */
export function titre(p: TitreParams, day: number): { first: number; second: number } {
  const primary = response(PRIMARY, day);
  const after = day - p.second;
  if (after < 0) return { first: primary, second: 0 };
  if (!p.sameAntigen) return { first: primary, second: response(PRIMARY, after) };
  const boost = response(p.memory ? SECONDARY : PRIMARY, after);
  return { first: primary + boost, second: 0 };
}

export interface Summary { peak: number; dayOfPeak: number; daysToPeak: number; daysAbove: number }

/** Peak, time to peak and days above `threshold` for the response to the second exposure (same antigen). */
export function secondExposureSummary(p: TitreParams, threshold = 0.5, until = 200): Summary {
  let peak = 0, dayOfPeak = p.second, daysAbove = 0;
  for (let d = p.second; d <= p.second + until; d += 0.25) {
    const t = titre(p, d);
    const c = p.sameAntigen ? t.first : t.second;
    if (c > peak) { peak = c; dayOfPeak = d; }
    if (c >= threshold) daysAbove += 0.25;
  }
  return { peak, dayOfPeak, daysToPeak: dayOfPeak - p.second, daysAbove };
}

export function firstExposureSummary(threshold = 0.5, until = 200): Summary {
  let peak = 0, dayOfPeak = 0, daysAbove = 0;
  for (let d = 0; d <= until; d += 0.25) {
    const c = response(PRIMARY, d);
    if (c > peak) { peak = c; dayOfPeak = d; }
    if (c >= threshold) daysAbove += 0.25;
  }
  return { peak, dayOfPeak, daysToPeak: dayOfPeak, daysAbove };
}
