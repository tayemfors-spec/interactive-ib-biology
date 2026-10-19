/** Meadow and trials-plot markup for the capture–mark–release–recapture sim, shared by server and browser. */
import { mean, mulberry32 } from './models/c4-1-rng';
import type { CmrParams, CmrResult } from './models/c4-1-capture';

export const MW = 520, MH = 300;
export interface CaptureUi { trueN: number; first: number; second: number; loss: boolean; death: boolean; mix: boolean; imm: boolean }
export const DEFAULT_CAPTURE: CaptureUi = { trueN: 300, first: 50, second: 50, loss: false, death: false, mix: false, imm: false };

export const toParams = (u: CaptureUi): CmrParams => ({
  trueN: u.trueN,
  firstCatch: Math.min(u.first, u.trueN),
  secondCatch: u.second,
  markLoss: u.loss ? 0.4 : 0,
  markedDeath: u.death ? 0.4 : 0,
  trapBias: u.mix ? 3 : 1,
  immigration: u.imm ? 0.4 : 0,
});

/** Fixed positions for up to 1000 animals so the meadow does not jump between surveys. */
const POS = (() => {
  const rng = mulberry32(2024);
  return Array.from({ length: 1000 }, () => ({ x: 12 + rng() * (MW - 24), y: 12 + rng() * (MH - 24) }));
})();

export function meadowSvg(res: CmrResult | null, trueN: number): string {
  let s = `<rect class="meadow" x="0" y="0" width="${MW}" height="${MH}" rx="10"/>`;
  if (!res) {
    for (let i = 0; i < trueN; i++) s += `<circle class="a" cx="${POS[i]!.x.toFixed(1)}" cy="${POS[i]!.y.toFixed(1)}" r="4.5"/>`;
    return s;
  }
  res.animals.forEach((a, i) => {
    if (!a.alive) return;
    const p = POS[i % POS.length]!;
    const cls = ['a', a.marked ? 'm' : a.everMarked ? 'lost' : '', a.recaptured ? 'r' : ''].filter(Boolean).join(' ');
    s += `<circle class="${cls}" cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="${a.recaptured ? 6 : 4.5}"/>`;
  });
  return s;
}

export function surveyText(res: CmrResult | null, u: CaptureUi): string {
  if (!res) return 'Press “Run a survey” to catch and mark a first sample, release it, then take a second sample.';
  const est = Number.isFinite(res.estimate) ? Math.round(res.estimate) : null;
  let t = `First sample: ${res.M} caught, marked and released (M = ${res.M}). Second sample: ${res.N} caught (N = ${res.N}), of which ${res.R} were marked (R = ${res.R}). `;
  t += est === null
    ? 'No marked animals were recaptured, so the Lincoln index cannot be used: take larger samples.'
    : `Estimate = M × N ÷ R = ${res.M} × ${res.N} ÷ ${res.R} = ${est}. True population ${u.trueN}: the estimate is ${est > u.trueN ? 'too high' : est < u.trueN ? 'too low' : 'exact'} by ${Math.abs(est - u.trueN)}.`;
  const broken: string[] = [];
  if (u.loss) broken.push('marks wearing off make R too small, so the estimate is too high');
  if (u.death) broken.push('marked animals eaten by predators make R too small, so the estimate is too high');
  if (u.mix) broken.push('marked animals that stay near the trap are over-represented in the second sample, making R too large and the estimate too low');
  if (u.imm) broken.push('unmarked immigrants dilute the marked animals, so the estimate is too high for the original population');
  if (broken.length) t += ` Assumption broken: ${broken.join('; ')}.`;
  return t;
}

export interface TrialStats { n: number; noEstimate: number; mean: number }
export function trialStats(est: number[]): TrialStats {
  const fin = est.filter(Number.isFinite);
  return { n: est.length, noEstimate: est.length - fin.length, mean: mean(fin) };
}

/** Dot plot of repeated estimates, binned, with the true value marked. */
export function trialsSvg(est: number[], trueN: number): string {
  const W = 640, H = 170, L = 20, R = 20, B = 40, T = 12;
  const max = trueN * 2.5;
  const bins = 25;
  const bw = (W - L - R) / bins;
  const x = (v: number) => L + (Math.min(v, max) / max) * (W - L - R);
  let s = `<line class="axisline" x1="${L}" x2="${W - R}" y1="${H - B}" y2="${H - B}"/>`;
  for (let i = 0; i <= 5; i++) {
    const v = (max / 5) * i;
    s += `<line class="tick" x1="${x(v)}" x2="${x(v)}" y1="${H - B}" y2="${H - B + 5}"/><text class="tk" x="${x(v)}" y="${H - B + 20}" text-anchor="middle">${Math.round(v)}${i === 5 ? '+' : ''}</text>`;
  }
  s += `<text class="axis" x="${W / 2}" y="${H - 3}" text-anchor="middle">Population estimate from each survey</text>`;
  s += `<line class="trueline" x1="${x(trueN)}" x2="${x(trueN)}" y1="${T}" y2="${H - B}"/><text class="true-t" x="${x(trueN) + 6}" y="${T + 12}">true size</text>`;
  const stacks = new Array(bins).fill(0);
  for (const v of est) {
    if (!Number.isFinite(v)) continue;
    const b = Math.min(bins - 1, Math.floor((Math.min(v, max - 1e-6) / max) * bins));
    const cy = H - B - 6 - stacks[b] * 9;
    if (cy > T) s += `<circle class="tr" cx="${(L + (b + 0.5) * bw).toFixed(1)}" cy="${cy}" r="4"/>`;
    stacks[b]++;
  }
  const st = trialStats(est);
  if (st.n - st.noEstimate > 0) s += `<path class="meanmk" d="M${x(st.mean).toFixed(1)} ${H - B + 2} l-7 10 h14 z"/>`;
  if (!est.length) s += `<text class="empty-t" x="${W / 2}" y="${(H - B) / 2 + 6}" text-anchor="middle">Repeated surveys appear here</text>`;
  return s;
}
