import { ease, lerp, phase } from '../lib/timeline';

/**
 * A4.1.10–A4.1.11: a sterile hybrid (the mule), then abrupt speciation by hybridization and chromosome
 * doubling (allopolyploidy) in Persicaria. Three representative chromosomes stand for each haploid set.
 * Layout constants are shared with a4-1-polyploidy.astro, which draws the step-1 state.
 */
type XY = [number, number];

export const P_A: XY = [90, 84];
export const P_B: XY = [430, 84];
export const G_A: XY = [175, 158];
export const G_B: XY = [345, 158];
export const HYB: XY = [260, 242];
export const HYB_R = 62;
export const G1: XY = [118, 326];
export const G2: XY = [402, 326];
/** Chromosome lengths of one haploid set: A (species A / horse) and B (species B / donkey). */
export const LEN_A = [26, 18, 12];
export const LEN_B = [22, 16, 10];
export const LEN_D = [24, 20, 9];
const ROW_A = HYB[1] - 24;
const ROW_B = HYB[1] + 24;
export const COL = [227, 255, 283];

/** Positions of one chromosome glyph per haploid set inside a small gamete circle. */
export const inGamete = (g: XY, i: number): XY => [g[0] - 8 + i * 8, g[1]];
/** Two copies of each chromosome inside a parent cell. */
export const inParent = (p: XY, i: number, copy: number): XY => [p[0] - 26 + i * 26 + (copy ? 5 : -5), p[1]];
/** Chromosome k (0–2 set A, 3–5 set B) inside a gamete made by the allotetraploid: A set above, B set below. */
export const inAB = (g: XY, k: number): XY => [g[0] - 12 + (k % 3) * 12, g[1] + (k < 3 ? -14 : 14)];
/** Starting positions in the hybrid / mule cell. */
export const inHybrid = (set: 'A' | 'B', i: number): XY => [COL[i]!, set === 'A' ? ROW_A : ROW_B];

export function create(svg: SVGSVGElement) {
  const q = <T extends SVGElement>(k: string) => svg.querySelector<T>(`[data-el="${k}"]`)!;
  const show = (el: SVGElement, o: number) => { el.style.opacity = o.toFixed(3); };
  const at = (k: string, [x, y]: XY, o = 1) => { const g = q(k); g.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)})`); show(g, o); };
  const mix = (a: XY, b: XY, t: number): XY => [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];
  const steps = (index: number, t: number, from: number, a = 0, b = 1) => (index < from ? 0 : index > from ? 1 : ease(phase(t, a, b)));

  function render(index: number, t: number) {
    const mule = index <= 1;
    show(q('mule'), mule ? 1 : 0);
    show(q('plant'), mule ? 0 : 1);

    // ----- the mule: steps 0–1 -----
    if (mule) {
      const gam = index === 0 ? ease(phase(t, 0, 0.25)) : 0;
      const go = steps(index, t, 0, 0.3, 0.8);
      show(q('mGamH'), gam * (1 - ease(phase(t, 0.55, 0.8))));
      show(q('mGamD'), gam * (1 - ease(phase(t, 0.55, 0.8))));
      show(q('mGamLbl'), index === 0 ? ease(phase(t, 0, 0.25)) * (1 - ease(phase(t, 0.55, 0.8))) : 0);
      show(q('mCell'), steps(index, t, 0, 0.6, 0.9));
      show(q('mLbl'), index === 0 ? ease(phase(t, 0.7, 1)) : 0);
      show(q('mParents'), index === 0 ? 1 : 0.35);
      const pair = index === 1 ? ease(phase(t, 0, 0.55)) : 0;
      [0, 1, 2].forEach((i) => {
        const h0 = mix(inGamete(G_A, i), inHybrid('A', i), go);
        const d0 = mix(inGamete(G_B, i), inHybrid('B', i), go);
        // attempted pairing at the equator: lengths and structures do not match, so they sit offset
        const hEq: XY = [212 + i * 36, HYB[1] - LEN_A[i]! / 2 - 1];
        const dEq: XY = [222 + i * 36, HYB[1] + LEN_D[i]! / 2 + 7];
        at(`h${i}`, mix(h0, hEq, pair), index === 0 ? Math.max(gam, go) : 1);
        at(`d${i}`, mix(d0, dEq, pair), index === 0 ? Math.max(gam, go) : 1);
      });
      show(q('mFail'), index === 1 ? ease(phase(t, 0.55, 0.85)) : 0);
      return;
    }

    // ----- plants: steps 2–5 -----
    const s = index; // 2 hybridization, 3 doubling, 4 meiosis, 5 new species
    const gam = s === 2 ? ease(phase(t, 0, 0.25)) : 0;
    const go = steps(s, t, 2, 0.3, 0.8);
    show(q('pGamA'), s === 2 ? gam * (1 - ease(phase(t, 0.55, 0.8))) : 0);
    show(q('pGamB'), s === 2 ? gam * (1 - ease(phase(t, 0.55, 0.8))) : 0);
    show(q('pGamLbl'), s === 2 ? gam * (1 - ease(phase(t, 0.55, 0.8))) : 0);
    show(q('pParents'), s === 2 ? 1 : s < 5 ? 0.35 : 0);
    show(q('pCell'), s === 2 ? ease(phase(t, 0.6, 0.9)) : s === 4 ? 1 - 0.65 * ease(phase(t, 0.55, 1)) : s === 5 ? 0.35 : 1);
    show(q('lHyb'), s === 2 ? ease(phase(t, 0.75, 1)) : 0);
    show(q('lTet'), s === 3 ? ease(phase(t, 0.5, 0.9)) : 0);
    show(q('lMei'), s === 4 ? ease(phase(t, 0, 0.3)) : 0);
    show(q('lGam'), s === 4 ? ease(phase(t, 0.8, 1)) : s === 5 ? 1 : 0);
    show(q('pG1'), s === 4 ? ease(phase(t, 0.5, 0.8)) : s === 5 ? 1 : 0);
    show(q('pG2'), s === 4 ? ease(phase(t, 0.5, 0.8)) : s === 5 ? 1 : 0);
    show(q('result'), s === 5 ? ease(phase(t, 0, 0.4)) : 0);

    const dup = steps(s, t, 3, 0.1, 0.6);
    const line = s === 4 ? ease(phase(t, 0, 0.45)) : s > 4 ? 1 : 0;
    const split = s === 4 ? ease(phase(t, 0.5, 0.9)) : s > 4 ? 1 : 0;
    (['A', 'B'] as const).forEach((set, si) => {
      const lens = set === 'A' ? LEN_A : LEN_B;
      const gam0 = set === 'A' ? G_A : G_B;
      [0, 1, 2].forEach((i) => {
        const k = si * 3 + i; // position along the equator, 0–5
        const L = lens[i]!;
        const home = inHybrid(set, i);
        const eqX = 210 + k * 20;
        const upper: XY = [eqX, HYB[1] - L / 2 - 1];
        const lower: XY = [eqX, HYB[1] + L / 2 + 1];
        // original chromosome: travels from the gamete, then pairs above the equator and goes to gamete 1
        let p = mix(inGamete(gam0, i), home, go);
        if (s >= 4) p = mix(mix(home, upper, line), inAB(G1, k), split);
        at(`${set}${i}`, p, s === 2 ? Math.max(gam, go) : 1);
        // copy made by chromosome doubling: appears beside the original, pairs below and goes to gamete 2
        let c: XY = [home[0] + 10 * dup, home[1]];
        if (s >= 4) c = mix(mix([home[0] + 10, home[1]], lower, line), inAB(G2, k), split);
        at(`${set}${i}c`, c, s < 3 ? 0 : s === 3 ? dup : 1);
      });
    });
  }
  render(0, 0);
  return { render, durations: [5, 5, 5, 4, 6, 6] };
}
