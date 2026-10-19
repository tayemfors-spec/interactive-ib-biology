/**
 * C1.3 limiting factors: a qualitative model of the rate of photosynthesis.
 *
 * Three potential limits are worked out on the same scale (arbitrary units, 0–~120):
 *  - light: the light-dependent reactions can only supply ATP and reduced NADP in proportion to light intensity;
 *  - CO₂: carbon fixation by Rubisco is roughly proportional to CO₂ concentration over the range shown;
 *  - temperature: the maximum rate the enzymes can reach, rising with temperature up to an optimum and
 *    falling steeply above it as enzymes (Rubisco among them) are denatured.
 * The overall rate is a smooth minimum of the three (Blackman's idea of a limiting factor, with the
 * corners rounded as they are in real data). Whichever is lowest is the limiting factor.
 */
export type Factor = 'light' | 'co2' | 'temp';
export interface Conditions { light: number; co2: number; temp: number }

/** Light intensity is given as % of the brightest setting (0–100). */
export const LIGHT_K = 1.2;
/** CO₂ in ppm (µmol mol⁻¹) of the air or its equivalent dissolved in water. */
export const CO2_K = 0.16;
/** Temperature (°C) at which the enzyme-limited maximum is highest. Varies with species. */
export const T_OPT = 30;
/** Temperature (°C) at which enzymes are fully denatured in this model. */
export const T_MAX = 45;
const P_MAX = 100;
const SHARPNESS = 6;

export const PRE_INDUSTRIAL_CO2 = 280;
export const CURRENT_CO2 = 420;
export const FACE_CO2 = 550;

export const lightLimit = (light: number) => LIGHT_K * Math.max(0, light);
export const co2Limit = (co2: number) => CO2_K * Math.max(0, co2);

/** 0–1: fraction of the maximum enzyme-limited rate at this temperature. */
export function tempFactor(temp: number): number {
  if (temp <= T_OPT) return Math.max(0, 2 ** ((temp - T_OPT) / 10)); // roughly doubles per 10 °C (Q10 ≈ 2)
  if (temp >= T_MAX) return 0;
  return 1 - ((temp - T_OPT) / (T_MAX - T_OPT)) ** 2; // falls steeply as enzymes denature
}
export const tempLimit = (temp: number) => P_MAX * tempFactor(temp);

export function limits(c: Conditions): Record<Factor, number> {
  return { light: lightLimit(c.light), co2: co2Limit(c.co2), temp: tempLimit(c.temp) };
}

/** Rate of photosynthesis (arbitrary units). Zero if any factor is zero. */
export function rate(c: Conditions): number {
  const l = limits(c);
  const vals = [l.light, l.co2, l.temp];
  if (vals.some((v) => v <= 1e-9)) return 0;
  return vals.reduce((s, v) => s + v ** -SHARPNESS, 0) ** (-1 / SHARPNESS);
}

/** The factor that is nearest its minimum, i.e. the one actually setting the rate. */
export function limitingFactor(c: Conditions): Factor {
  const l = limits(c);
  return (Object.keys(l) as Factor[]).reduce((a, b) => (l[b] < l[a] ? b : a));
}

/**
 * Lamp distance (cm) that gives this % light intensity, using the inverse square law
 * (intensity ∝ 1 / distance²) with 100 % at 10 cm. Returns Infinity for no light.
 */
export const REF_DISTANCE = 10;
export function lampDistance(lightPct: number): number {
  if (lightPct <= 0) return Infinity;
  return REF_DISTANCE / Math.sqrt(lightPct / 100);
}
export function intensityAt(distanceCm: number): number {
  return 100 * (REF_DISTANCE / distanceCm) ** 2;
}

/** Pondweed experiment: oxygen bubbles counted per minute (assumes equal-sized bubbles). */
export const bubblesPerMinute = (r: number) => Math.round(r * 0.4);

export const factorNames: Record<Factor, string> = { light: 'light intensity', co2: 'carbon dioxide concentration', temp: 'temperature' };

export const axes: Record<Factor, { min: number; max: number; step: number; label: string; unit: string }> = {
  light: { min: 0, max: 100, step: 1, label: 'Light intensity (%)', unit: '%' },
  co2: { min: 0, max: 1200, step: 10, label: 'CO₂ concentration (ppm)', unit: ' ppm' },
  temp: { min: 0, max: 50, step: 1, label: 'Temperature (°C)', unit: ' °C' },
};
