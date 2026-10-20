/**
 * Qualitative model of quorum sensing in Vibrio fischeri (C2.1.2). Arbitrary units throughout.
 *
 * - Every cell releases autoinducer at a low basal rate; it diffuses freely across membranes, so in a
 *   well-mixed space its concentration is proportional to the density of cells.
 * - Autoinducer binds the receptor LuxR. Above a threshold concentration, LuxR–autoinducer switches on the
 *   lux genes (a steep, switch-like response).
 * - The lux genes include luxI (autoinducer synthase), so induced cells make more autoinducer: positive feedback.
 * - Light per cell follows the fraction of cells with the lux genes switched on.
 */
export const THRESHOLD = 1; // autoinducer concentration giving half-maximal induction
export const BASAL = 1 / 40; // autoinducer per unit of density from uninduced cells
export const FEEDBACK = 2; // fully induced cells make (1 + FEEDBACK) times as much autoinducer
const HILL = 6; // steepness of the switch
export const DENSITY = { min: 1, max: 100, sea: 2, organ: 100 };

export interface QuorumOptions {
  /** false = luxR (receptor) gene knocked out */
  receptor?: boolean;
  /** autoinducer added to the water by an experimenter */
  added?: number;
}

/** Fraction of maximal lux gene expression (0–1) at a given autoinducer concentration. */
export const activation = (ai: number) => (ai <= 0 ? 0 : ai ** HILL / (ai ** HILL + THRESHOLD ** HILL));

/** Steady-state autoinducer concentration at a population density (relative units, 1–100). */
export function autoinducer(density: number, o: QuorumOptions = {}): number {
  const receptor = o.receptor ?? true;
  const added = o.added ?? 0;
  const basal = BASAL * Math.max(0, density);
  if (!receptor) return basal + added; // no LuxR, so no induction of luxI either
  let a = basal + added;
  // iterate to the steady state reached as the population grows (the lower branch, starting from basal)
  for (let i = 0; i < 200; i++) {
    const next = basal * (1 + FEEDBACK * activation(a)) + added;
    if (Math.abs(next - a) < 1e-9) break;
    a = next;
  }
  return a;
}

/** Light emitted per cell as a percentage of the maximum. */
export function lightPerCell(density: number, o: QuorumOptions = {}): number {
  if (o.receptor === false) return 0;
  return 100 * activation(autoinducer(density, o));
}

/** Light from the whole population, as a percentage of a full light organ. */
export function totalLight(density: number, o: QuorumOptions = {}): number {
  return (lightPerCell(density, o) * density) / DENSITY.max;
}

/** Autoinducer as a percentage of its value in a full light organ, for plotting on a 0–100 axis. */
export const AI_MAX = autoinducer(DENSITY.max);
export const aiPercent = (density: number, o: QuorumOptions = {}) => (100 * autoinducer(density, o)) / AI_MAX;
export const THRESHOLD_PERCENT = (100 * THRESHOLD) / AI_MAX;

/**
 * Autoinducer concentration at which the population actually switches on. Because induced cells make more
 * autoinducer (positive feedback), the lower steady state disappears before the half-maximal THRESHOLD is
 * reached: once autoinducer reaches this level, a slight rise in density makes it jump to the upper branch.
 * This is the "autoinducer threshold" drawn on the graph.
 */
export const SWITCH_AI = (() => {
  let prev = autoinducer(DENSITY.min);
  for (let d = DENSITY.min + 0.05; d <= DENSITY.max; d += 0.05) {
    const a = autoinducer(d);
    if (a - prev > 0.2) return prev;
    prev = a;
  }
  return THRESHOLD;
})();
export const SWITCH_PERCENT = (100 * SWITCH_AI) / AI_MAX;
