/**
 * Pulse counting (B3.2.4). A heart rate in beats per minute (bpm) is estimated by counting pulses
 * for a period and multiplying up to one minute. Pure functions shared by the sim and its unit tests.
 */

/** Times (s) of the beats that fall inside a counting period, starting `phase` seconds after the timer starts. */
export function beatTimes(bpm: number, period: number, phase = 0): number[] {
  const interval = 60 / bpm;
  const out: number[] = [];
  for (let t = phase % interval; t < period; t += interval) out.push(t);
  return out;
}

/** Number of beats a perfect counter would feel in the period. */
export const beatsIn = (bpm: number, period: number, phase = 0) => beatTimes(bpm, period, phase).length;

/** Multiply the count by this to get beats per minute (×4 for 15 s, ×2 for 30 s). */
export const multiplier = (period: number) => 60 / period;

/** Estimated heart rate from a count. */
export const estimate = (beats: number, period: number) => beats * multiplier(period);

/** One beat more or fewer changes the estimate by this many bpm: the resolution of the method. */
export const resolution = (period: number) => 60 / period;

/** Built-in "people" for practice: resting heart rates in bpm (normal adult range is about 60–100). */
export const PEOPLE = [74, 62, 88, 57, 81, 96, 68, 105];

export const PERIODS = [15, 30, 60] as const;
