import { ease, lerp } from '../lib/timeline';

/**
 * Why a mule is sterile, with a simplified chromosome set (A3.1.13). Horse set: A, B, C, D;
 * donkey set: A, B and one chromosome "CD" carrying the genes of horse C and D. Each step's
 * positions are absolute, so render() can seek to any step.
 */
type XY = [number, number];
export const chroms: Record<string, { h: number; from: 'horse' | 'donkey'; genes: string }> = {
  hA: { h: 60, from: 'horse', genes: 'A' },
  hB: { h: 46, from: 'horse', genes: 'B' },
  hC: { h: 34, from: 'horse', genes: 'C' },
  hD: { h: 30, from: 'horse', genes: 'D' },
  dA: { h: 60, from: 'donkey', genes: 'A' },
  dB: { h: 46, from: 'donkey', genes: 'B' },
  dCD: { h: 66, from: 'donkey', genes: 'CD' },
};

/** Centre of each chromosome at the end of each step. */
export const positions: Record<string, XY[]> = {
  hA: [[92, 150], [196, 122], [182, 150], [96, 150]],
  hB: [[114, 150], [228, 122], [234, 150], [366, 150]],
  hC: [[136, 150], [260, 122], [328, 128], [152, 150]],
  hD: [[158, 150], [292, 122], [328, 182], [394, 150]],
  dA: [[372, 150], [212, 206], [198, 150], [338, 150]],
  dB: [[396, 150], [252, 206], [250, 150], [124, 150]],
  dCD: [[420, 150], [296, 206], [310, 150], [182, 150]],
};

/** Opacity of each outline or label at each step. */
export const shown: Record<string, number[]> = {
  sperm: [1, 0, 0, 0],
  egg: [1, 0, 0, 0],
  mule: [0, 1, 1, 0],
  pairs: [0, 0, 1, 0],
  cellL: [0, 0, 0, 1],
  cellR: [0, 0, 0, 1],
};

export function create(svg: SVGSVGElement) {
  const q = (k: string) => svg.querySelector<SVGGElement>(`[data-el="${k}"]`)!;
  const els = Object.keys(chroms).map((k) => [k, q(k)] as const);
  const fades = Object.keys(shown).map((k) => [k, q(k)] as const);

  function render(index: number, t: number) {
    const u = ease(t);
    const from = Math.max(0, index - 1);
    for (const [k, el] of els) {
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
  return { render, durations: [3, 3.5, 3.5, 4] };
}
