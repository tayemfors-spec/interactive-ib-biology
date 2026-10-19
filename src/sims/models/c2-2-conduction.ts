/**
 * Qualitative model of nerve impulse conduction speed (C2.2.4, C2.2.11).
 *
 * - Unmyelinated axons: speed rises roughly with the square root of diameter (cable theory).
 *   Calibrated so a 1 µm fibre conducts at ≈ 1 m s⁻¹ and the squid giant axon (≈ 500 µm) at ≈ 25 m s⁻¹.
 * - Myelinated (vertebrate) axons: speed rises roughly in proportion to diameter, about 6 m s⁻¹ per µm
 *   (the Hursh factor), so a 15–20 µm fibre conducts at ≈ 90–120 m s⁻¹. Myelinated fibres are rarely
 *   thinner than about 1 µm or wider than about 20 µm, so the model clamps the diameter to that range.
 * - Internodes (distance between nodes of Ranvier) are about 100 × the fibre diameter, typically ~1 mm.
 * Real speeds also depend on temperature, membrane properties and species.
 */
export const MYELIN_MIN_UM = 1;
export const MYELIN_MAX_UM = 20;
export const UNMYELINATED_K = 1.12; // m s⁻¹ per √µm
export const MYELINATED_K = 6; // m s⁻¹ per µm

export interface Axon { myelinated: boolean; diameterUm: number }

/** Diameter actually used by the model (myelinated fibres are limited to the real range). */
export function effectiveDiameter(a: Axon): number {
  return a.myelinated ? Math.min(MYELIN_MAX_UM, Math.max(MYELIN_MIN_UM, a.diameterUm)) : a.diameterUm;
}

/** Conduction speed in m s⁻¹. */
export function conductionSpeed(a: Axon): number {
  const d = effectiveDiameter(a);
  return a.myelinated ? MYELINATED_K * d : UNMYELINATED_K * Math.sqrt(d);
}

/** Time in seconds for an impulse to travel `metres`. */
export const travelTime = (a: Axon, metres = 1) => metres / conductionSpeed(a);

/** Distance between nodes of Ranvier, in mm (≈ 100 × diameter). */
export const internodeMm = (a: Axon) => (effectiveDiameter(a) * 100) / 1000;

/** Named examples used as presets in the simulation. */
export const presets = [
  { id: 'thin', name: 'Thin unmyelinated fibre (1 µm)', axon: { myelinated: false, diameterUm: 1 } },
  { id: 'squid', name: 'Squid giant axon (0.5 mm, unmyelinated)', axon: { myelinated: false, diameterUm: 500 } },
  { id: 'myelin-thin', name: 'Thin myelinated fibre (2 µm)', axon: { myelinated: true, diameterUm: 2 } },
  { id: 'myelin-large', name: 'Large myelinated fibre (16 µm)', axon: { myelinated: true, diameterUm: 16 } },
] as const satisfies readonly { id: string; name: string; axon: Axon }[];

/** Slider ↔ diameter: the slider is log₁₀(diameter in µm), from 0.2 µm to 1000 µm. */
export const SLIDER_MIN = Math.log10(0.2);
export const SLIDER_MAX = 3;
export const diameterFromSlider = (s: number) => 10 ** s;
export const sliderFromDiameter = (d: number) => Math.log10(d);

export function formatDiameter(um: number): string {
  if (um >= 100) return `${(um / 1000).toFixed(um >= 1000 ? 0 : 2).replace(/\.?0+$/, '')} mm`;
  if (um >= 10) return `${Math.round(um)} µm`;
  return `${um.toFixed(1).replace(/\.0$/, '')} µm`;
}

export function formatSpeed(v: number): string {
  return v >= 10 ? `${Math.round(v)} m s⁻¹` : `${v.toFixed(1)} m s⁻¹`;
}

export function formatTime(s: number): string {
  return s >= 1 ? `${s.toFixed(2)} s` : `${Math.round(s * 1000)} ms`;
}
