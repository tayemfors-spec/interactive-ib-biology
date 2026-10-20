import { ease, lerp } from '../lib/timeline';

/**
 * Non-disjunction of chromosome 21 in meiosis I of oogenesis → an n + 1 egg → trisomy 21 (D2.1.10).
 * Only chromosome 21 is drawn. A1/A2 and B1/B2 are the sister chromatids of the mother's two
 * homologues; S is the copy in a normal sperm. Each step's positions are absolute (seekable).
 */
type XY = [number, number];
export const chromatids: Record<string, { cls: 'ma' | 'mb' | 'sp' }> = {
  A1: { cls: 'ma' }, A2: { cls: 'ma' }, B1: { cls: 'mb' }, B2: { cls: 'mb' }, S: { cls: 'sp' },
};

/** Centre of each chromatid at the end of each step. */
export const positions: Record<string, XY[]> = {
  A1: [[243, 170], [190, 146], [136, 170], [62, 170], [244, 170], [244, 170]],
  A2: [[253, 170], [200, 146], [146, 170], [182, 170], [182, 170], [182, 170]],
  B1: [[267, 170], [190, 198], [164, 170], [78, 170], [260, 170], [260, 170]],
  B2: [[277, 170], [200, 198], [174, 170], [198, 170], [198, 170], [198, 170]],
  S: [[470, 70], [470, 70], [470, 70], [470, 70], [276, 170], [276, 170]],
};

/** Opacity of each chromatid and each group of outlines/labels at each step. */
export const shown: Record<string, number[]> = {
  A1: [1, 1, 1, 1, 1, 0],
  B1: [1, 1, 1, 1, 1, 0],
  A2: [1, 1, 1, 1, 0, 0],
  B2: [1, 1, 1, 1, 0, 0],
  S: [0, 0, 0, 0, 1, 0],
  oocyte: [1, 1, 0, 0, 0, 0],
  ndj: [0, 1, 0, 0, 0, 0],
  mi: [0, 0, 1, 0, 0, 0],
  mii: [0, 0, 0, 1, 0, 0],
  fert: [0, 0, 0, 0, 1, 0],
  chart: [0, 0, 0, 0, 0, 1],
};

/** Approximate live-birth prevalence of Down syndrome by maternal age (per 1000 births). */
export const maternalAge: { age: number; per1000: number; oneIn: number }[] = [
  { age: 20, per1000: 0.7, oneIn: 1450 },
  { age: 25, per1000: 0.7, oneIn: 1350 },
  { age: 30, per1000: 1.1, oneIn: 950 },
  { age: 35, per1000: 2.9, oneIn: 350 },
  { age: 40, per1000: 11.8, oneIn: 85 },
  { age: 45, per1000: 33, oneIn: 30 },
];

export function create(svg: SVGSVGElement) {
  const q = (k: string) => svg.querySelector<SVGGElement>(`[data-el="${k}"]`)!;
  const moving = Object.keys(chromatids).map((k) => [k, q(k)] as const);
  const fades = Object.keys(shown).map((k) => [k, q(k)] as const);

  function render(index: number, t: number) {
    const u = ease(t);
    const from = Math.max(0, index - 1);
    for (const [k, el] of moving) {
      const a = positions[k]![from]!, b = positions[k]![index]!;
      const x = index === 0 ? b[0] : lerp(a[0], b[0], u);
      const y = index === 0 ? b[1] : lerp(a[1], b[1], u);
      el.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)})`);
    }
    for (const [k, el] of fades) {
      const a = shown[k]![from]!, b = shown[k]![index]!;
      el.style.opacity = String(index === 0 ? b : lerp(a, b, u));
    }
  }
  render(0, 0);
  return { render, durations: [3, 4, 3.5, 4, 4.5, 4] };
}
