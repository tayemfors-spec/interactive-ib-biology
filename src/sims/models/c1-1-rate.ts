/**
 * Qualitative model of enzyme activity (C1.1.8). Arbitrary units throughout.
 *
 * rate = kcat·[E] × kinetic(T) × native(T) × pHFactor(pH) × [S] / (Km + [S])
 *
 *  - kinetic(T): molecules move faster as temperature rises, so collisions between substrate and
 *    active site are more frequent and more energetic. Modelled as Q10 = 2 (rate doubles per 10 °C).
 *  - native(T): the fraction of enzyme molecules still folded correctly. A steep sigmoid: above the
 *    optimum, bonds holding the tertiary structure break and the active site loses its shape
 *    (denaturation). Heat denaturation is irreversible, so `native` depends on the highest
 *    temperature the enzyme has been exposed to (see activeFraction).
 *  - pHFactor(pH): two parts. pHBinding is bell-shaped around the optimum: a small shift in pH changes
 *    the charges on R-groups in the active site, so binding is weaker. This part is reversible.
 *    pHIntact is the fraction not denatured: far from the optimum, ionic and hydrogen bonds holding the
 *    tertiary structure break. Like heat, this is treated as irreversible, so it depends on the most
 *    extreme pH (lowest and highest) the enzyme has been exposed to, not just the pH now.
 *  - [S]/(Km + [S]): the fraction of active sites occupied at any moment. At high [S] every active
 *    site is in use, so the rate levels off (saturation). Doubling [E] doubles the maximum rate.
 */
export interface EnzymePreset {
  id: string;
  name: string;
  /** Optimum pH. */
  optPH: number;
  /** Width of the pH curve (pH units, one standard deviation of the bell). */
  phWidth: number;
  /** Temperature (°C) at which half the enzyme molecules are denatured. */
  tm: number;
  /** Where the enzyme works, for the on-screen note. */
  where: string;
}

export const PRESETS: EnzymePreset[] = [
  { id: 'amylase', name: 'Salivary amylase', optPH: 7, phWidth: 1.3, tm: 44, where: 'mouth (saliva), close to neutral' },
  { id: 'pepsin', name: 'Pepsin', optPH: 2, phWidth: 1.1, tm: 44, where: 'stomach, with hydrochloric acid' },
  { id: 'trypsin', name: 'Trypsin', optPH: 8, phWidth: 1.2, tm: 44, where: 'small intestine, slightly alkaline' },
  { id: 'thermophile', name: 'Enzyme from a hot-spring bacterium', optPH: 7, phWidth: 1.3, tm: 78, where: 'cells of a bacterium living at about 70 °C' },
];

export const preset = (id: string) => PRESETS.find((p) => p.id === id) ?? PRESETS[0]!;

const Q10 = 2;
/** Steepness of the denaturation sigmoid (°C). */
const DENAT_W = 2;
export const KM = 2;

/** Relative frequency/energy of collisions: doubles for every 10 °C rise. */
export const kinetic = (t: number) => Math.pow(Q10, (t - 37) / 10);

/** Fraction of enzyme molecules still correctly folded at temperature t (fresh enzyme). */
export const native = (t: number, tm: number) => 1 / (1 + Math.exp((t - tm) / DENAT_W));

/**
 * Fraction of enzyme that is active now, given the highest temperature reached so far.
 * Molecules denatured by heating stay denatured when the mixture is cooled.
 */
export const activeFraction = (t: number, tm: number, maxT = t) => native(Math.max(t, maxT), tm);

/** Reversible effect of pH on substrate binding (charges on R-groups in the active site). */
export const pHBinding = (ph: number, opt: number, width: number) => Math.exp(-0.5 * ((ph - opt) / width) ** 2);

/** Deviation from the optimum (pH units, in widths) at which half the molecules are denatured. */
const PH_DENAT = 2.8;
const PH_DENAT_W = 0.4;

/** Fraction of molecules still folded after exposure to a pH this far (pH units) from the optimum. */
export const pHIntact = (dev: number, width: number) => 1 / (1 + Math.exp((dev - PH_DENAT * width) / PH_DENAT_W));

/**
 * Overall pH factor. `phLow` and `phHigh` are the lowest and highest pH the enzyme has met so far
 * (default: the pH now, i.e. fresh enzyme). Denaturation on either side is not undone by returning
 * to the optimum.
 */
export function pHFactor(ph: number, opt: number, width: number, phLow = ph, phHigh = ph): number {
  const lo = Math.min(ph, phLow), hi = Math.max(ph, phHigh);
  return pHBinding(ph, opt, width) * pHIntact(opt - lo, width) * pHIntact(hi - opt, width);
}

/** Fraction of enzyme molecules not denatured by pH, given the extremes reached. */
export const pHActiveFraction = (ph: number, opt: number, width: number, phLow = ph, phHigh = ph) =>
  pHIntact(opt - Math.min(ph, phLow), width) * pHIntact(Math.max(ph, phHigh) - opt, width);

/** Fraction of active sites occupied by substrate at any moment. */
export const occupancy = (s: number) => (s <= 0 ? 0 : s / (KM + s));

export interface RateParams {
  temp: number; ph: number; substrate: number; enzyme: number;
  /** Highest temperature reached so far (heat denaturation is irreversible). */
  maxTemp?: number;
  /** Lowest and highest pH reached so far (pH denaturation is irreversible). */
  phLow?: number; phHigh?: number;
}

/** Unnormalised rate. */
function raw(p: RateParams, e: EnzymePreset) {
  return p.enzyme * kinetic(p.temp) * activeFraction(p.temp, e.tm, p.maxTemp ?? p.temp) * pHFactor(p.ph, e.optPH, e.phWidth, p.phLow ?? p.ph, p.phHigh ?? p.ph) * occupancy(p.substrate);
}

/** Temperature (°C, to 0.1) at which a fresh enzyme works fastest. */
export function optimumTemp(e: EnzymePreset): number {
  let best = 0, bt = 0;
  for (let t = 0; t <= 100; t += 0.1) {
    const r = kinetic(t) * native(t, e.tm);
    if (r > best) { best = r; bt = t; }
  }
  return Math.round(bt * 10) / 10;
}

/**
 * Rate on a 0–100 scale: 100 = the rate of 10 units of enzyme at its optimum temperature and pH with
 * saturating substrate. Enzyme concentration is 1–10 units.
 */
export function rate(p: RateParams, e: EnzymePreset): number {
  const top = 10 * kinetic(optimumTemp(e)) * native(optimumTemp(e), e.tm);
  return (100 * raw(p, e)) / top;
}

export const label = (r: number) => (r < 1 ? 'almost none' : r < 15 ? 'slow' : r < 45 ? 'moderate' : 'fast');
