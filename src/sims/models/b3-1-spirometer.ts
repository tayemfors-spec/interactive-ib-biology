/**
 * Lung volumes and a spirometer trace (B3.1.6). Volumes in dm³, time in seconds.
 *
 * Resting values are typical of a healthy young adult (they vary with sex, height, age and fitness):
 *   tidal volume 0.5, inspiratory reserve 3.0, expiratory reserve 1.1, residual volume 1.2,
 *   so vital capacity = IRV + TV + ERV = 4.6 and total lung capacity = 5.8.
 * With exercise, tidal volume rises (to about 2.5 dm³ at heavy exercise here) by eating into both
 * reserves — about 70 % of the extra comes from the IRV and 30 % from the ERV — so vital capacity
 * itself does not change. Ventilation rate rises from 12 to about 40 breaths per minute.
 * The trace is lung volume against time: tidal breaths, then one maximal breath in and maximal
 * breath out (the vital-capacity manoeuvre), then tidal breathing again.
 */

export interface Volumes {
  tv: number; irv: number; erv: number; rv: number;
  vc: number; tlc: number; frc: number;
  /** breaths per minute */
  rate: number;
  /** dm³ per minute */
  minuteVentilation: number;
}

export const REST = { tv: 0.5, irv: 3.0, erv: 1.1, rv: 1.2, rate: 12 } as const;
const MAX_EXTRA_TV = 2.0;
const MAX_EXTRA_RATE = 28;
const FROM_IRV = 0.7;

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const r2 = (x: number) => Math.round(x * 100) / 100;

/** Lung volumes for a person at rest (effort 0) up to heavy exercise (effort 1). */
export function lungVolumes(effort = 0, base: Omit<Volumes, 'vc' | 'tlc' | 'frc' | 'minuteVentilation'> = REST): Volumes {
  const e = clamp01(effort);
  const extra = MAX_EXTRA_TV * e;
  const tv = base.tv + extra;
  const irv = base.irv - FROM_IRV * extra;
  const erv = base.erv - (1 - FROM_IRV) * extra;
  const rate = base.rate + MAX_EXTRA_RATE * e;
  const vc = irv + tv + erv;
  return {
    tv: r2(tv), irv: r2(irv), erv: r2(erv), rv: base.rv,
    vc: r2(vc), tlc: r2(vc + base.rv), frc: r2(base.rv + erv),
    rate: Math.round(rate), minuteVentilation: r2(tv * Math.round(rate)),
  };
}

/** Timing of the trace: tidal breathing, a vital-capacity manoeuvre, then tidal breathing again. */
export interface TracePlan { tidalUntil: number; vcStart: number; vcPeak: number; vcLow: number; vcEnd: number; end: number }

export function tracePlan(v: Volumes, end = 40): TracePlan {
  const period = 60 / v.rate;
  // start the manoeuvre at the end of a whole number of breaths after ~14 s
  const n = Math.max(2, Math.round(14 / period));
  const tidalUntil = n * period;
  return { tidalUntil, vcStart: tidalUntil, vcPeak: tidalUntil + 3, vcLow: tidalUntil + 8, vcEnd: tidalUntil + 10, end };
}

const smooth = (u: number) => 0.5 - 0.5 * Math.cos(Math.PI * clamp01(u));

/** Lung volume (dm³) at time t (s). Each tidal breath starts at the end of an expiration (FRC). */
export function traceVolume(t: number, v: Volumes, plan = tracePlan(v)): number {
  const period = 60 / v.rate;
  const tidal = (s: number) => v.frc + v.tv * (0.5 - 0.5 * Math.cos((2 * Math.PI * s) / period));
  if (t <= plan.vcStart) return tidal(t);
  if (t <= plan.vcPeak) return v.frc + (v.tv + v.irv) * smooth((t - plan.vcStart) / (plan.vcPeak - plan.vcStart));
  if (t <= plan.vcLow) return v.tlc - v.vc * smooth((t - plan.vcPeak) / (plan.vcLow - plan.vcPeak));
  if (t <= plan.vcEnd) return v.rv + v.erv * smooth((t - plan.vcLow) / (plan.vcEnd - plan.vcLow));
  return tidal(t - plan.vcEnd);
}

/** Sampled trace for drawing. */
export function sampleTrace(v: Volumes, end = 40, step = 0.1): [number, number][] {
  const plan = tracePlan(v, end);
  const pts: [number, number][] = [];
  for (let t = 0; t <= end + 1e-9; t += step) pts.push([Number(t.toFixed(3)), traceVolume(t, v, plan)]);
  return pts;
}

/** Number of complete tidal breaths that start in [0, seconds) of the tidal section. */
export const breathsIn = (v: Volumes, seconds: number) => Math.floor((seconds * v.rate) / 60 + 1e-9);

// ---------- practice: read the trace ----------

export type Quantity = 'tv' | 'irv' | 'erv' | 'vc' | 'rate' | 'minuteVentilation';
export const QUANTITY_NAMES: Record<Quantity, string> = {
  tv: 'tidal volume',
  irv: 'inspiratory reserve volume',
  erv: 'expiratory reserve volume',
  vc: 'vital capacity',
  rate: 'ventilation rate',
  minuteVentilation: 'minute ventilation (ventilation rate × tidal volume)',
};
export const QUANTITY_UNITS: Record<Quantity, string> = {
  tv: 'dm³', irv: 'dm³', erv: 'dm³', vc: 'dm³', rate: 'breaths per minute', minuteVentilation: 'dm³ per minute',
};

export interface PracticePerson { v: Volumes; ask: Quantity }

const round1 = (x: number) => Math.round(x * 10) / 10;

/** A random person whose volumes are multiples of 0.1 dm³, so they can be read off the grid. */
export function makePerson(rand: () => number, ask?: Quantity): PracticePerson {
  const pick = <T>(xs: readonly T[]) => xs[Math.floor(rand() * xs.length)]!;
  const tv = round1(0.4 + rand() * 0.3);
  const irv = round1(1.8 + rand() * 1.5);
  const erv = round1(0.8 + rand() * 0.7);
  const rv = round1(1.0 + rand() * 0.4);
  const rate = pick([10, 12, 15, 20] as const);
  const v = lungVolumes(0, { tv, irv, erv, rv, rate });
  const qs: Quantity[] = ['tv', 'irv', 'erv', 'vc', 'rate', 'minuteVentilation'];
  return { v, ask: ask ?? pick(qs) };
}

export function answerFor(p: PracticePerson): number {
  return p.v[p.ask];
}

/** Accept readings within ±0.1 dm³ (volumes), the exact rate, or within ±5 % for minute ventilation. */
export function checkReading(p: PracticePerson, value: number): { ok: boolean; correct: number; working: string } {
  const c = answerFor(p);
  const v = p.v;
  const tol = p.ask === 'rate' ? 0.01 : p.ask === 'minuteVentilation' ? Math.max(0.3, c * 0.05) : 0.1 + 1e-9;
  const ok = Number.isFinite(value) && Math.abs(value - c) <= tol;
  const f = (x: number) => x.toFixed(1);
  const working: Record<Quantity, string> = {
    tv: `Tidal volume = top of a normal breath − bottom of a normal breath = ${f(v.frc + v.tv)} − ${f(v.frc)} = ${f(v.tv)} dm³.`,
    irv: `IRV = highest point of the deep breath in − top of a normal breath = ${f(v.tlc)} − ${f(v.frc + v.tv)} = ${f(v.irv)} dm³.`,
    erv: `ERV = bottom of a normal breath − lowest point of the forced breath out = ${f(v.frc)} − ${f(v.rv)} = ${f(v.erv)} dm³.`,
    vc: `Vital capacity = highest point − lowest point of the deep breath = ${f(v.tlc)} − ${f(v.rv)} = ${f(v.vc)} dm³ (= IRV + TV + ERV).`,
    rate: `One breath (peak to peak) takes ${(60 / v.rate).toFixed(1)} s, so the rate = 60 ÷ ${(60 / v.rate).toFixed(1)} = ${v.rate} breaths per minute.`,
    minuteVentilation: `Minute ventilation = ventilation rate × tidal volume = ${v.rate} × ${f(v.tv)} = ${v.minuteVentilation.toFixed(1)} dm³ per minute.`,
  };
  return { ok, correct: c, working: working[p.ask] };
}
