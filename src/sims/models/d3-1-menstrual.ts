/**
 * Qualitative model of the human menstrual cycle (D3.1.5), arbitrary units 0–100.
 * Day 1 = first day of menstruation; ovulation on about day 14 of a 28-day cycle.
 *
 * Curve shapes follow the standard textbook pattern (Guyton & Hall; Campbell):
 *  - FSH: raised in the early follicular phase (rising already as progesterone falls at the end of the
 *    previous cycle), pushed down by oestradiol (negative feedback), small peak alongside the LH surge,
 *    low in the luteal phase.
 *  - LH: low, then a sharp surge peaking at ovulation (positive feedback from high oestradiol).
 *  - Oestradiol: low during menstruation, rises as the follicle grows, peaks just BEFORE the LH surge,
 *    dips after ovulation, then a smaller second peak from the corpus luteum.
 *  - Progesterone: low until ovulation, high in the luteal phase (corpus luteum), falls before menstruation.
 * Gaussians are periodic (28 days), so day 28 runs smoothly into day 1 of the next cycle.
 * With `pregnant`, an implanted embryo's hCG keeps the corpus luteum alive from about day 21, so
 * progesterone and oestradiol stay high, FSH and LH stay low and the endometrium is not shed.
 */
export const CYCLE = 28;
export const OVULATION_DAY = 14;

export interface Options { pregnant?: boolean }
export interface Levels { fsh: number; lh: number; oestradiol: number; progesterone: number }

const g = (x: number, mu: number, sl: number, sr = sl) => {
  const s = x < mu ? sl : sr;
  return Math.exp(-((x - mu) ** 2) / (2 * s * s));
};
/** Periodic (wrap-around) asymmetric Gaussian, using the nearest copy of the peak. */
const gp = (d: number, mu: number, sl: number, sr = sl) => Math.max(g(d, mu, sl, sr), g(d + CYCLE, mu, sl, sr), g(d - CYCLE, mu, sl, sr));
const clampDay = (d: number) => Math.max(1, Math.min(CYCLE, d));
/** Smooth 0 → 1 between a and b (exactly 0 before a, so the two versions of the cycle match until then). */
const step = (x: number, a: number, b: number) => { const u = Math.max(0, Math.min(1, (x - a) / (b - a))); return u * u * (3 - 2 * u); };

export function levels(day: number, opts: Options = {}): Levels {
  const d = clampDay(day);
  let fsh = 14 + 22 * gp(d, 3, 3.2) + 26 * gp(d, OVULATION_DAY, 0.85);
  let lh = 12 + 3 * gp(d, 3, 4) + 80 * gp(d, OVULATION_DAY, 0.75);
  let oestradiol = 10 + 72 * g(d, 12.8, 2.8, 1.0) + 32 * g(d, 21, 2.6);
  let progesterone = 4 + 82 * g(d, 21.5, 3, 2.8);
  if (opts.pregnant) {
    // hCG from the embryo rescues the corpus luteum, so the luteal fall never happens
    const keep = step(d, 20.5, 22.5);
    progesterone = progesterone * (1 - keep) + 86 * keep;
    oestradiol = oestradiol * (1 - keep) + 42 * keep;
    fsh = fsh * (1 - keep) + 13 * keep;
    lh = lh * (1 - keep) + 11 * keep;
  }
  return { fsh, lh, oestradiol, progesterone };
}

/** Relative thickness of the endometrium (0–1). Shed on days 1–5, rebuilt by oestradiol, maintained by progesterone. */
export function endometrium(day: number, opts: Options = {}): number {
  const d = clampDay(day);
  if (d <= 5) return 0.95 - (0.75 * (d - 1)) / 4;
  if (d <= OVULATION_DAY) return 0.2 + (0.5 * (d - 5)) / 9;
  if (d <= 22) return 0.7 + (0.3 * (d - OVULATION_DAY)) / 8;
  return opts.pregnant ? 1 : 1 - (0.05 * (d - 22)) / 6;
}

export type OvaryState = 'follicles-start' | 'dominant-follicle' | 'mature-follicle' | 'ovulation' | 'corpus-luteum' | 'corpus-luteum-breakdown' | 'corpus-luteum-maintained';

/** Size of the growing follicle (0–1, 0 = none) and of the corpus luteum (0–1), for drawing the ovary. */
export function ovary(day: number, opts: Options = {}): { state: OvaryState; follicle: number; corpusLuteum: number } {
  const d = clampDay(day);
  const follicle = d < 13.6 ? 0.18 + (0.82 * (d - 1)) / 12.6 : 0;
  let corpusLuteum = 0;
  if (d >= 14.4) corpusLuteum = d <= 21 ? 0.35 + (0.65 * (d - 14.4)) / 6.6 : opts.pregnant ? 1 : 1 - (0.7 * (d - 21)) / 7;
  let state: OvaryState;
  if (d < 6) state = 'follicles-start';
  else if (d < 11.5) state = 'dominant-follicle';
  else if (d < 13.5) state = 'mature-follicle';
  else if (d < 14.5) state = 'ovulation';
  else if (d < 23) state = 'corpus-luteum';
  else state = opts.pregnant ? 'corpus-luteum-maintained' : 'corpus-luteum-breakdown';
  return { state, follicle, corpusLuteum };
}

export interface Phase { id: string; name: string; days: string; ovary: string; uterus: string; feedback: string }

export const PHASES: Phase[] = [
  {
    id: 'menstruation', name: 'Menstruation (early follicular phase)', days: 'days 1–5',
    ovary: 'A batch of follicles, each containing a primary oocyte, starts to develop in response to FSH.',
    uterus: 'Progesterone has fallen, so the thickened endometrium breaks down and is shed with some blood (menstruation).',
    feedback: 'Progesterone and oestradiol are low, so they no longer inhibit the pituitary (negative feedback is lifted) and FSH secretion rises.',
  },
  {
    id: 'follicular', name: 'Follicular phase', days: 'days 6–11',
    ovary: 'FSH stimulates the follicles to grow and their walls to secrete oestradiol. Usually only one dominant follicle keeps growing.',
    uterus: 'Oestradiol stimulates repair and thickening of the endometrium, with new blood vessels.',
    feedback: 'Positive feedback: oestradiol increases the number of FSH receptors on follicle cells, so they make even more oestradiol. Negative feedback: moderate oestradiol inhibits FSH secretion by the pituitary, so FSH falls.',
  },
  {
    id: 'pre-ovulation', name: 'Late follicular phase', days: 'days 12–13',
    ovary: 'The mature follicle, with a large fluid-filled cavity, bulges from the surface of the ovary.',
    uterus: 'The endometrium continues to thicken under the influence of oestradiol.',
    feedback: 'Positive feedback: oestradiol reaches a peak. At this high level it increases GnRH secretion by the hypothalamus and makes the anterior pituitary more sensitive to GnRH, so the pituitary releases much more LH (and some FSH), starting the LH surge.',
  },
  {
    id: 'ovulation', name: 'Ovulation', days: 'about day 14',
    ovary: 'The LH surge makes the oocyte complete meiosis I and the follicle wall burst, releasing the secondary oocyte into the oviduct.',
    uterus: 'The endometrium is thickening, ready to receive an embryo about a week later.',
    feedback: 'LH peaks. Oestradiol falls after ovulation because the follicle has ruptured. LH also stimulates the follicle wall to develop into the corpus luteum.',
  },
  {
    id: 'luteal', name: 'Luteal phase', days: 'days 15–23',
    ovary: 'The corpus luteum (the remains of the follicle) secretes progesterone and some oestradiol.',
    uterus: 'Progesterone maintains the thick endometrium and makes it ready for implantation.',
    feedback: 'Negative feedback: high progesterone (with oestradiol) inhibits FSH and LH secretion, so no new follicles develop.',
  },
  {
    id: 'late-luteal', name: 'Late luteal phase', days: 'days 24–28',
    ovary: 'With no embryo, there is no hCG and the corpus luteum degenerates.',
    uterus: 'Falling progesterone means the endometrium can no longer be maintained; it breaks down at the start of the next cycle.',
    feedback: 'As progesterone and oestradiol fall, their negative feedback on the pituitary is removed, so FSH starts to rise again for the next cycle.',
  },
];

export const PREGNANT_PHASE: Phase = {
  id: 'pregnant', name: 'Embryo implanted', days: 'from about day 21',
  ovary: 'hCG secreted by the implanted embryo keeps the corpus luteum alive, so it keeps secreting progesterone.',
  uterus: 'The endometrium stays thick and is not shed, so menstruation does not happen.',
  feedback: 'Negative feedback: high progesterone keeps FSH and LH secretion low, so no new follicles develop during pregnancy.',
};

export function phaseAt(day: number, opts: Options = {}): Phase {
  const d = clampDay(day);
  if (opts.pregnant && d >= 21.5) return PREGNANT_PHASE;
  if (d < 6) return PHASES[0]!;
  if (d < 12) return PHASES[1]!;
  if (d < 13.5) return PHASES[2]!;
  if (d < 14.5) return PHASES[3]!;
  if (d < 24) return PHASES[4]!;
  return PHASES[5]!;
}

/** Day (to 0.1) at which a hormone is highest across the cycle. */
export function peakDay(h: keyof Levels, opts: Options = {}): number {
  let best = 1, bestV = -Infinity;
  for (let d = 1; d <= CYCLE + 1e-9; d += 0.1) {
    const v = levels(d, opts)[h];
    if (v > bestV) { bestV = v; best = d; }
  }
  return Math.round(best * 10) / 10;
}
