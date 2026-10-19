/**
 * Qualitative model of summation at the axon hillock (C2.2.13, C2.2.14).
 *
 * Each synaptic input produces a postsynaptic potential (PSP) with an alpha-function time course,
 * peaking TAU ms after the input. EPSPs are +9 mV and IPSPs −5 mV at their peak (real single EPSPs at
 * central synapses are often < 1 mV and hundreds are needed, so these sizes are scaled up for clarity).
 * PSPs add together. If the summed potential reaches the threshold (−50 mV), a full-sized action
 * potential fires (all or nothing) and the model then ignores further crossings (refractory period).
 */
import { PEAK, REST, THRESHOLD, T_THRESHOLD, membranePotential } from './c2-2-action-potential';

export { REST, THRESHOLD };
export const EPSP_MV = 9;
export const IPSP_MV = -5;
export const TAU_MS = 4;
export const T_START = 10; // first inputs arrive at 10 ms
export const T_END = 50;

export interface Scenario {
  /** Number of impulses sent by excitatory neuron E1 (temporal summation). */
  train: number;
  /** Time between E1's impulses, ms. */
  interval: number;
  /** Number of other excitatory neurons (E2–E4) that each fire once at 10 ms (spatial summation). */
  together: number;
  /** Number of inhibitory (GABA-releasing) neurons that each fire once at 10 ms. */
  inhibitory: number;
}

export interface Input { t: number; mv: number; source: string }

export function inputs(s: Scenario): Input[] {
  const out: Input[] = [];
  for (let k = 0; k < s.train; k++) out.push({ t: T_START + k * s.interval, mv: EPSP_MV, source: 'E1' });
  for (let k = 0; k < s.together; k++) out.push({ t: T_START, mv: EPSP_MV, source: `E${k + 2}` });
  for (let k = 0; k < s.inhibitory; k++) out.push({ t: T_START, mv: IPSP_MV, source: `I${k + 1}` });
  return out;
}

/** One PSP of peak size `mv`, `dt` ms after its input arrived. */
export const psp = (dt: number, mv: number) => (dt <= 0 ? 0 : mv * (dt / TAU_MS) * Math.exp(1 - dt / TAU_MS));

/** Summed potential at the axon hillock if no action potential fires. */
export const summed = (t: number, ins: Input[]) => REST + ins.reduce((v, i) => v + psp(t - i.t, i.mv), 0);

export interface Result {
  points: [number, number][];
  fired: boolean;
  /** Time threshold was reached (ms), if it was. */
  tFire?: number;
  /** Highest summed potential before any action potential (mV). */
  peakSub: number;
  /** Lowest potential reached (mV). */
  min: number;
}

export function simulate(s: Scenario, dt = 0.1): Result {
  const ins = inputs(s);
  const points: [number, number][] = [];
  let tFire: number | undefined;
  let peakSub = REST;
  let min = REST;
  const AP_LEN = 6 - T_THRESHOLD; // the action-potential shape from threshold until it has settled (ms)
  for (let i = 0; i <= Math.round(T_END / dt); i++) {
    const t = i * dt;
    const base = summed(t, ins);
    let v = base;
    if (tFire === undefined) {
      peakSub = Math.max(peakSub, base);
      if (base >= THRESHOLD) tFire = t;
    }
    if (tFire !== undefined) {
      const since = t - tFire;
      const ap = membranePotential(T_THRESHOLD + since);
      // after the action potential, the remaining PSPs fade back in
      const w = since < AP_LEN ? 0 : Math.min(1, (since - AP_LEN) / 3);
      v = since < AP_LEN ? ap : ap + w * (base - REST);
      if (since === 0) v = base;
    }
    min = Math.min(min, v);
    points.push([Number(t.toFixed(2)), v]);
  }
  return { points, fired: tFire !== undefined, tFire, peakSub, min };
}

/** Peak membrane potential reached in a result (the action potential's peak if one fired). */
export const peakOf = (r: Result) => r.points.reduce((m, [, v]) => Math.max(m, v), -Infinity);

export const AP_PEAK = PEAK;

export const presets: { id: string; name: string; s: Scenario }[] = [
  { id: 'one', name: 'One EPSP', s: { train: 1, interval: 5, together: 0, inhibitory: 0 } },
  { id: 'spatial', name: 'Spatial summation', s: { train: 1, interval: 5, together: 2, inhibitory: 0 } },
  { id: 'temporal', name: 'Temporal summation', s: { train: 3, interval: 2, together: 0, inhibitory: 0 } },
  { id: 'inhibition', name: 'Add inhibition', s: { train: 1, interval: 5, together: 2, inhibitory: 2 } },
];
