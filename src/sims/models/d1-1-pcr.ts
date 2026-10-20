/**
 * D1.1 polymerase chain reaction. Pure functions shared by the server render and the browser.
 * One cycle = denaturation → primer annealing → extension. Temperatures are typical values; the exact
 * annealing temperature depends on the primers' base sequences (usually 50–65 °C).
 */
export interface Stage { id: 'denature' | 'anneal' | 'extend'; name: string; tempC: number; seconds: number; what: string }

export const STAGES: Stage[] = [
  { id: 'denature', name: 'Denaturation', tempC: 95, seconds: 30, what: 'Heat breaks the hydrogen bonds between the bases, so the two strands of each DNA molecule separate.' },
  { id: 'anneal', name: 'Primer annealing', tempC: 60, seconds: 30, what: 'Cooling lets the two primers form hydrogen bonds with complementary sequences at the 3′ ends of the target region, one on each single strand.' },
  { id: 'extend', name: 'Extension', tempC: 72, seconds: 60, what: 'Taq polymerase, which is not denatured at high temperature, adds nucleotides to the 3′ end of each primer, building a new strand complementary to each template.' },
];

export const MAX_CYCLES = 35;

/**
 * Number of double-stranded copies of the target after n cycles, starting from `start` molecules, when a
 * fraction `efficiency` (0–1) of the molecules is copied in each cycle. Ideal PCR (efficiency 1) doubles every
 * cycle: start × 2ⁿ.
 */
export function copies(n: number, start = 1, efficiency = 1): number {
  const c = Math.max(0, Math.floor(n));
  return start * Math.pow(1 + Math.max(0, Math.min(1, efficiency)), c);
}

/**
 * Ideal PCR from ONE double-stranded molecule: copies whose two ends are both set by the primers (exactly the
 * target length). None exist until cycle 3; after that they soon make up almost all the DNA: 2ⁿ − 2n.
 */
export function exactLengthCopies(n: number): number {
  const c = Math.max(0, Math.floor(n));
  return Math.max(0, Math.pow(2, c) - 2 * c);
}

/** Temperature of the thermocycler at time `s` seconds into a cycle. */
export function cycleTemperature(s: number): number {
  const total = STAGES.reduce((a, st) => a + st.seconds, 0);
  let u = ((s % total) + total) % total;
  for (const st of STAGES) {
    if (u < st.seconds) return st.tempC;
    u -= st.seconds;
  }
  return STAGES[STAGES.length - 1]!.tempC;
}

/** Cycle length in minutes (ignoring the time taken to heat and cool). */
export const cycleMinutes = () => STAGES.reduce((a, st) => a + st.seconds, 0) / 60;

const SUP: Record<string, string> = { '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹', '-': '⁻' };
/** 1234 → "1234"; 1.07e9 → "1.07 × 10⁹" (plain text, so it can go in aria-live and SVG). */
export function formatCount(x: number): string {
  if (x < 1e5) return Math.round(x).toLocaleString('en-GB');
  const e = Math.floor(Math.log10(x));
  let m = x / Math.pow(10, e);
  let ee = e;
  if (Number(m.toFixed(2)) >= 10) { m /= 10; ee += 1; }
  return `${m.toFixed(2)} × 10${String(ee).split('').map((d) => SUP[d]).join('')}`;
}

/** Step mode: the position reached by pressing "Next stage" k times from the start. */
export interface StepPos { cycle: number; stage: number }
/** stage −1 = before the first cycle; 0, 1, 2 = finished that stage of cycle `cycle` (1-based). */
export function nextStage(p: StepPos): StepPos {
  if (p.stage < 0 || p.stage >= 2) return { cycle: p.cycle + 1, stage: 0 };
  return { cycle: p.cycle, stage: p.stage + 1 };
}
/** Completed cycles at a step position. */
export const completedCycles = (p: StepPos) => (p.stage === 2 ? p.cycle : Math.max(0, p.cycle - 1));
