/**
 * Qualitative model of a simple respirometer (C1.2.6).
 *
 * Germinating seeds sit in a sealed tube above a CO₂ absorber (potassium hydroxide solution or soda lime).
 * They take in O₂ and give out CO₂; the absorber removes the CO₂, so the gas volume in the tube falls by the
 * volume of O₂ used, and a drop of coloured fluid in the attached capillary moves towards the tube.
 *
 * Illustrative values, not measurements:
 *  - O₂ uptake of germinating seeds at 20 °C: 0.3 mm³ g⁻¹ min⁻¹ (BASE_RATE)
 *  - rate roughly doubles for each 10 °C rise (Q10 ≈ 2) while enzymes work normally
 *  - above about 40 °C enzymes start to denature and the rate falls
 *  - respiratory quotient (CO₂ out ÷ O₂ in) = 1, as for carbohydrate (starch) in the seeds
 */
export type Sample = 'germinating' | 'boiled' | 'beads';

export interface Setup {
  /** Temperature of the water bath, °C. */
  tempC: number;
  /** Mass of seeds (or beads), g. */
  massG: number;
  sample: Sample;
  /** Is a CO₂ absorber (KOH / soda lime) present? */
  absorber: boolean;
}

export const BASE_RATE = 0.3; // mm³ O₂ g⁻¹ min⁻¹ at 20 °C
export const Q10 = 2;
export const RQ = 1;
export const CAPILLARY_RADIUS_MM = 0.5;
/** Reading on the capillary scale where the drop starts (mm). The drop moves towards 0 (towards the tube). */
export const START_READING = 90;

export const capillaryArea = (radiusMm = CAPILLARY_RADIUS_MM) => Math.PI * radiusMm * radiusMm;

/** Fraction of enzyme activity left after heat denaturation (1 at low temperatures, 0.5 at 40 °C). */
export const activeFraction = (tempC: number) => 1 / (1 + Math.exp((tempC - 40) / 2.5));

/** Rate relative to 20 °C: Q10 rise multiplied by the fraction of enzymes not denatured. */
export function relativeRate(tempC: number): number {
  return Q10 ** ((tempC - 20) / 10) * activeFraction(tempC);
}

/** Volume of O₂ taken in per minute (mm³ min⁻¹). Dead seeds and glass beads do not respire. */
export function o2Uptake(s: Setup): number {
  if (s.sample !== 'germinating') return 0;
  return BASE_RATE * s.massG * relativeRate(s.tempC);
}

/** Volume of CO₂ given out per minute (mm³ min⁻¹). */
export const co2Release = (s: Setup) => o2Uptake(s) * RQ;

/** Net fall in gas volume in the tube per minute (mm³ min⁻¹). Without the absorber, CO₂ replaces the O₂ used. */
export const volumeFall = (s: Setup) => o2Uptake(s) - (s.absorber ? 0 : co2Release(s));

/** Distance (mm) the drop moves per minute. */
export const dropSpeed = (s: Setup, radiusMm = CAPILLARY_RADIUS_MM) => volumeFall(s) / capillaryArea(radiusMm);

/** Distance moved (mm) after `minutes`; the drop cannot go past the end of the scale. */
export const distanceMoved = (s: Setup, minutes: number) => Math.min(START_READING, Math.max(0, dropSpeed(s) * minutes));

/** Scale reading (mm) after `minutes`. */
export const readingAt = (s: Setup, minutes: number) => START_READING - distanceMoved(s, minutes);

/** Has the drop reached the end of the scale (so a reading would underestimate the rate)? */
export const offScale = (s: Setup, minutes: number) => dropSpeed(s) * minutes >= START_READING;

/**
 * The calculation students do from their raw data:
 * volume = πr²d; rate = volume ÷ time; and per gram if the mass is known.
 */
export function rateFromReadings(startMm: number, endMm: number, minutes: number, massG: number, radiusMm = CAPILLARY_RADIUS_MM) {
  const distance = startMm - endMm;
  const volume = capillaryArea(radiusMm) * distance;
  const perMin = minutes > 0 ? volume / minutes : 0;
  const perGramPerMin = massG > 0 ? perMin / massG : 0;
  return { distance, volume, perMin, perGramPerMin };
}

/** Temperature (°C, whole degrees, 0–50) at which the model rate is highest. */
export function optimumTemp(): number {
  let best = 0;
  for (let t = 0; t <= 50; t++) if (relativeRate(t) > relativeRate(best)) best = t;
  return best;
}
