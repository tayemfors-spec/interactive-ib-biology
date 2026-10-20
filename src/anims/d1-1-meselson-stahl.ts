import { ease, phase } from '../lib/timeline';

/**
 * Steps: 0 generation 0 in ¹⁵N (heavy band) · 1 one generation in ¹⁴N (hybrid band)
 *        2 two generations in ¹⁴N (hybrid + light bands) · 3 predictions of the three models compared.
 */
export function create(svg: SVGSVGElement) {
  const el = (k: string) => svg.querySelector<SVGElement>(`[data-el="${k}"]`)!;
  const op = (k: string, v: number) => (el(k).style.opacity = v.toFixed(3));
  const MEDIUM = ['Many generations in ¹⁵N', 'Moved to ¹⁴N: one generation', 'In ¹⁴N: two generations', 'After 2 generations in ¹⁴N'];

  function render(index: number, t: number) {
    const f = ease(phase(t, 0.15, 0.8));
    // tubes: sampled generations are shown fully
    for (let g = 0; g < 3; g++) op(`tube${g}`, g < index || index === 3 ? 1 : g === index ? (g === 0 ? 1 : 0.35 + 0.65 * f) : 0.35);
    op('b0', index === 0 ? f : 1);
    op('b1', index < 1 ? 0 : index === 1 ? f : 1);
    op('b2h', index < 2 ? 0 : index === 2 ? f : 1);
    op('b2l', index < 2 ? 0 : index === 2 ? f : 1);
    // molecules: cross-fade from the previous generation
    const molFor = (i: number) => Math.min(i, 2);
    for (let m = 0; m < 3; m++) {
      const cur = molFor(index) === m;
      const prev = index > 0 && index < 3 && molFor(index - 1) === m;
      op(`mol${m}`, cur ? (index === 3 ? 1 : ease(phase(t, 0.3, 0.75))) : prev ? 1 - ease(phase(t, 0, 0.3)) : 0);
    }
    el('medium').textContent = MEDIUM[index]!;
    op('molnote', index === 0 ? 0 : 1);
    op('key', index === 3 ? 1 - ease(phase(t, 0, 0.3)) : 1);
    op('pred', index === 3 ? ease(phase(t, 0.3, 0.8)) : 0);
  }
  render(0, 0);
  return { render, durations: [3.5, 4, 4, 5] };
}
