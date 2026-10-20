/** Markup and text for the Hardy–Weinberg calculator and simulator, shared by the server render and the browser. */
import { linePath, sx, sy, type Frame } from './chart';
import {
  CRITICAL_1DF, HW_GENS, SIZE_STOPS, allelesFromCounts, chiSquaredHW, conditions, expectedCounts, fromP, fromPhenotypes, fromQ2, oneIn,
  type Genotypes, type HW, type HWRun, type HWSimParams,
} from './models/d4-1-hardy-weinberg';

export const HW_SEED = 21;

// ---------------- calculator ----------------
export type CalcMode = 'q2' | 'pheno' | 'geno';
export interface CalcInput { mode: CalcMode; q2: number; dom: number; rec: number; AA: number; Aa: number; aa: number }
export const DEFAULT_CALC: CalcInput = { mode: 'q2', q2: 0.0004, dom: 364, rec: 36, AA: 298, Aa: 489, aa: 213 };

/** Up to 4 decimal places, or 3 significant figures for very small values. */
export const r4 = (x: number) => (Number.isFinite(x) ? (Math.abs(x) >= 0.001 || x === 0 ? Number(x.toFixed(4)).toString() : Number(x.toPrecision(3)).toString()) : '–');
const r1 = (x: number) => (Number.isFinite(x) ? x.toFixed(1) : '–');

export interface CalcResult { ok: boolean; error?: string; hw?: HW; n?: number; steps: string[]; observed?: Genotypes; expected?: Genotypes; chi?: number }

export function calculate(c: CalcInput): CalcResult {
  const bad = (error: string): CalcResult => ({ ok: false, error, steps: [] });
  if (c.mode === 'q2') {
    if (!(c.q2 >= 0 && c.q2 <= 1)) return bad('q² is a frequency, so it must be between 0 and 1 (for "1 in 2500", enter 0.0004).');
    const hw = fromQ2(c.q2);
    return {
      ok: true, hw,
      steps: [
        `q² = ${r4(c.q2)} (frequency of the homozygous recessive genotype, aa)`,
        `q = √${r4(c.q2)} = ${r4(hw.q)}`,
        `p = 1 − q = 1 − ${r4(hw.q)} = ${r4(hw.p)}`,
        `p² = ${r4(hw.p)}² = ${r4(hw.AA)}`,
        `2pq = 2 × ${r4(hw.p)} × ${r4(hw.q)} = ${r4(hw.Aa)}`,
      ],
    };
  }
  if (c.mode === 'pheno') {
    const n = c.dom + c.rec;
    if (!(c.dom >= 0 && c.rec >= 0) || n <= 0) return bad('Enter counts of zero or more, with at least one individual.');
    const hw = fromPhenotypes(c.dom, c.rec);
    return {
      ok: true, hw, n,
      steps: [
        `Only the recessive phenotype reveals its genotype: q² = ${c.rec} ÷ ${n} = ${r4(hw.q * hw.q)}`,
        `q = √${r4(hw.q * hw.q)} = ${r4(hw.q)}`,
        `p = 1 − q = ${r4(hw.p)}`,
        `p² = ${r4(hw.AA)} and 2pq = ${r4(hw.Aa)}: dominant-phenotype individuals are a mix of AA and Aa`,
      ],
    };
  }
  const g = { AA: c.AA, Aa: c.Aa, aa: c.aa };
  const a = allelesFromCounts(g);
  if (!(c.AA >= 0 && c.Aa >= 0 && c.aa >= 0) || a.n <= 0) return bad('Enter counts of zero or more, with at least one individual.');
  const hw = fromP(a.p);
  const expected = expectedCounts(g);
  return {
    ok: true, hw, n: a.n, observed: g, expected, chi: chiSquaredHW(g),
    steps: [
      `Codominant alleles: every genotype can be identified, so count alleles directly (${a.n} individuals = ${2 * a.n} alleles).`,
      `p = (2 × ${c.AA} + ${c.Aa}) ÷ ${2 * a.n} = ${r4(a.p)}`,
      `q = (2 × ${c.aa} + ${c.Aa}) ÷ ${2 * a.n} = ${r4(a.q)}`,
      `Expected numbers = frequency × ${a.n}: AA ${r1(expected.AA)}, Aa ${r1(expected.Aa)}, aa ${r1(expected.aa)}`,
    ],
  };
}

export function calcTable(r: CalcResult): string {
  if (!r.ok || !r.hw) return `<p class="err">${r.error}</p>`;
  const h = r.hw;
  const rows: [string, string, number, string][] = [
    ['p', 'frequency of allele A (dominant)', h.p, ''],
    ['q', 'frequency of allele a (recessive)', h.q, ''],
    ['p²', 'AA, homozygous dominant', h.AA, r.observed ? `${r1(r.expected!.AA)} expected, ${r.observed.AA} observed` : r.n ? `${r1(h.AA * r.n)} expected` : ''],
    ['2pq', 'Aa, heterozygous (carriers)', h.Aa, r.observed ? `${r1(r.expected!.Aa)} expected, ${r.observed.Aa} observed` : r.n ? `${r1(h.Aa * r.n)} expected` : ''],
    ['q²', 'aa, homozygous recessive', h.aa, r.observed ? `${r1(r.expected!.aa)} expected, ${r.observed.aa} observed` : r.n ? `${r1(h.aa * r.n)} expected` : ''],
  ];
  let s = `<table class="calc"><thead><tr><th scope="col">Term</th><th scope="col">Meaning</th><th scope="col">Value</th>${r.n ? '<th scope="col">Numbers</th>' : ''}</tr></thead><tbody>`;
  for (const [t, m, v, e] of rows) s += `<tr><th scope="row">${t}</th><td>${m}</td><td>${r4(v)}</td>${r.n ? `<td>${e}</td>` : ''}</tr>`;
  s += `</tbody></table>`;
  s += `<p class="check">Check: p + q = ${r4(h.p + h.q)}; p² + 2pq + q² = ${r4(h.AA + h.Aa + h.aa)}. Carriers (Aa): ${(h.Aa * 100).toPrecision(3)}% of the population, about ${oneIn(h.Aa)}.</p>`;
  if (r.chi !== undefined) {
    const fits = r.chi < CRITICAL_1DF;
    s += `<p class="check">χ² = ${r.chi.toFixed(2)} with 1 degree of freedom (critical value 3.84 at p = 0.05): ${fits ? 'the genotype counts fit Hardy–Weinberg proportions, so there is no evidence that a condition is being broken' : 'the genotype counts differ significantly from Hardy–Weinberg proportions, so at least one condition (for example random mating, or equal survival of genotypes) is not being met'}.</p>`;
  }
  return s;
}

// ---------------- simulator ----------------
export const QF: Frame = {
  w: 640, h: 320, left: 60, right: 16, top: 16, bottom: 56,
  x: { min: 0, max: HW_GENS, ticks: [0, 10, 20, 30, 40, 50], label: 'Generation' },
  y: { min: 0, max: 1, ticks: [0, 0.25, 0.5, 0.75, 1], label: 'Frequency of allele a (q)' },
};
export const sizeLabel = (n: number) => (Number.isFinite(n) ? n.toLocaleString('en-GB') : 'very large (no drift)');
export const sizeAt = (i: number) => SIZE_STOPS[Math.max(0, Math.min(SIZE_STOPS.length - 1, i))]!;

export function qChart(runs: HWRun[], expected: number[]): string {
  const f = QF;
  const x0 = f.left, x1 = f.w - f.right, y0 = f.top, y1 = f.h - f.bottom;
  let s = '<g class="grid">';
  for (const t of f.x.ticks) s += `<line x1="${sx(f, t).toFixed(1)}" x2="${sx(f, t).toFixed(1)}" y1="${y0}" y2="${y1}"/>`;
  for (const t of f.y.ticks) s += `<line x1="${x0}" x2="${x1}" y1="${sy(f, t).toFixed(1)}" y2="${sy(f, t).toFixed(1)}"/>`;
  s += '</g>';
  s += `<path class="axisline" d="M${x0} ${y0} L${x0} ${y1} L${x1} ${y1}"/>`;
  s += '<g class="ticks">';
  for (const t of f.x.ticks) s += `<text x="${sx(f, t).toFixed(1)}" y="${y1 + 19}" text-anchor="middle">${t}</text>`;
  for (const t of f.y.ticks) s += `<text x="${x0 - 7}" y="${sy(f, t).toFixed(1)}" dy="0.35em" text-anchor="end">${t}</text>`;
  s += '</g>';
  s += `<text class="axis" x="${((x0 + x1) / 2).toFixed(1)}" y="${f.h - 10}" text-anchor="middle">${f.x.label}</text>`;
  s += `<text class="axis" transform="translate(15 ${((y0 + y1) / 2).toFixed(1)}) rotate(-90)" text-anchor="middle">${f.y.label}</text>`;
  runs.forEach((r, i) => { s += `<path class="line rep r${i}" d="${linePath(f, (g) => r.q[Math.round(g)]!, HW_GENS)}"/>`; });
  s += `<path class="line expct" d="${linePath(f, (g) => expected[Math.round(g)]!, HW_GENS)}"/>`;
  return s;
}

/** Observed vs Hardy–Weinberg-expected genotype percentages for the breeding adults of one population. */
export function genoBars(g: Genotypes): string {
  const n = g.AA + g.Aa + g.aa;
  const a = allelesFromCounts(g);
  const e = fromP(a.p);
  const W = 640, H = 210, left = 70, right = 20, top = 34, bottom = 40;
  const ys = (v: number) => H - bottom - v * (H - top - bottom);
  let s = '';
  for (const t of [0, 0.25, 0.5, 0.75, 1]) s += `<line class="gl" x1="${left}" x2="${W - right}" y1="${ys(t).toFixed(1)}" y2="${ys(t).toFixed(1)}"/><text class="tk" x="${left - 8}" y="${ys(t).toFixed(1)}" dy="0.35em" text-anchor="end">${Math.round(t * 100)}%</text>`;
  const keys = [['AA', e.AA], ['Aa', e.Aa], ['aa', e.aa]] as const;
  const gw = (W - left - right) / 3;
  keys.forEach(([k, ex], i) => {
    const obs = n ? g[k] / n : 0;
    const cx = left + gw * (i + 0.5);
    s += `<rect class="obs" x="${(cx - 58).toFixed(1)}" y="${ys(obs).toFixed(1)}" width="54" height="${(ys(0) - ys(obs)).toFixed(1)}"/>`;
    s += `<rect class="exp" x="${(cx + 4).toFixed(1)}" y="${ys(ex).toFixed(1)}" width="54" height="${(ys(0) - ys(ex)).toFixed(1)}"/>`;
    s += `<text class="val" x="${(cx - 31).toFixed(1)}" y="${(ys(obs) - 6).toFixed(1)}" text-anchor="middle">${Math.round(obs * 100)}%</text>`;
    s += `<text class="val" x="${(cx + 31).toFixed(1)}" y="${(ys(ex) - 6).toFixed(1)}" text-anchor="middle">${Math.round(ex * 100)}%</text>`;
    s += `<text class="cat" x="${cx.toFixed(1)}" y="${H - 12}" text-anchor="middle">${k}</text>`;
  });
  s += `<path class="axisline" d="M${left} ${top - 10} L${left} ${ys(0)} L${W - right} ${ys(0)}"/>`;
  return s;
}

export function conditionList(p: HWSimParams): { text: string; met: boolean }[] {
  const c = conditions(p);
  return [
    { text: `Very large population (no genetic drift) — now: ${sizeLabel(p.n)}`, met: c.large },
    { text: `Random mating — now: ${p.f === 0 ? 'random' : `inbreeding, F = ${p.f.toFixed(2)}`}`, met: c.random },
    { text: `No migration into or out of the population — now: ${p.m === 0 ? 'none' : `${Math.round(p.m * 100)}% immigrants each generation`}`, met: c.noMigration },
    { text: `No natural selection: all genotypes survive and reproduce equally — now: ${p.s === 0 ? 'none' : `aa ${Math.round(p.s * 100)}% less likely to breed`}`, met: c.noSelection },
    { text: 'No mutation of this gene — not modelled (mutation rates are very low)', met: c.noMutation },
  ];
}

export function simText(p: HWSimParams, runs: HWRun[], expected: number[]): string {
  const finals = runs.map((r) => r.q[HW_GENS]!);
  const lo = Math.min(...finals), hi = Math.max(...finals);
  const c = conditions(p);
  const broken = [!c.large && 'small population (drift)', !c.random && 'non-random mating', !c.noMigration && 'migration', !c.noSelection && 'selection'].filter(Boolean);
  let t = `After ${HW_GENS} generations q is ${r4(expected[HW_GENS]!)} in a very large population with these settings`;
  t += Number.isFinite(p.n) ? `; the ${runs.length} populations of ${sizeLabel(p.n)} ended between ${r4(lo)} and ${r4(hi)}. ` : '. ';
  if (!broken.length) t += 'Every condition is met, so allele and genotype frequencies stay the same: the population is in genetic equilibrium and is not evolving.';
  else {
    t += `Conditions broken: ${broken.join(', ')}. `;
    if (!c.noSelection) t += 'Selection against aa removes a alleles, but slowly once q is low, because most a alleles are hidden in heterozygotes. ';
    if (!c.large) t += 'Chance changes in allele frequency (genetic drift) differ between populations and are largest in small ones; an allele can be lost or fixed. ';
    if (!c.noMigration) t += 'Immigrants (q = 0.9) pull the allele frequency towards theirs. ';
    if (!c.random) t += 'Inbreeding produces more homozygotes and fewer heterozygotes than p², 2pq, q² predict, without changing the allele frequencies by itself. ';
  }
  return t.trim();
}
