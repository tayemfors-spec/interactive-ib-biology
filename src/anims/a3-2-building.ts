import { ease, lerp, phase } from '../lib/timeline';
import { pairs, variableSites } from '../sims/models/a3-2-sequences';

const START_SHIFT: Record<string, number> = { P: 0, Q: 39, R: 13, S: 26 };
/** Matrix cells highlighted at each grouping step. */
const HIGHLIGHT: Record<number, string[]> = { 3: ['PQ'], 4: ['PR', 'QR'], 5: ['PS', 'QS', 'RS'] };

export function create(svg: SVGSVGElement) {
  const el = (k: string) => svg.querySelector<SVGGraphicsElement>(`[data-el="${k}"]`)!;
  const show = (k: string, o: number) => { el(k).style.opacity = o.toFixed(3); };
  const varying = variableSites();
  /** Opacity of something that fades in during step `at` and stays afterwards. */
  const from = (index: number, t: number, at: number, a = 0, b = 1) => (index < at ? 0 : index > at ? 1 : ease(phase(t, a, b)));

  function render(index: number, t: number) {
    // 1. align: rows slide into register, then the column numbers appear
    for (const s of ['P', 'Q', 'R', 'S']) {
      const x = index === 0 ? lerp(START_SHIFT[s]!, 0, ease(phase(t, 0.1, 0.7))) : 0;
      el(`row${s}`).setAttribute('transform', `translate(${x.toFixed(1)} 0)`);
    }
    show('colNums', from(index, t, 0, 0.6, 0.9));
    // 2. variable columns light up one after another
    varying.forEach((i, k) => show(`v${i}`, from(index, t, 1, k * 0.06, k * 0.06 + 0.2)));
    show('varCount', from(index, t, 1, 0.7, 0.95));
    // 3. difference matrix fills in pair by pair
    show('matrix', index >= 2 ? 1 : 0);
    pairs.forEach(([a, b], k) => show(`c${a}${b}`, from(index, t, 2, k * 0.13, k * 0.13 + 0.2)));
    const hi = HIGHLIGHT[index] ?? [];
    pairs.forEach(([a, b]) => el(`c${a}${b}`).querySelector('rect')!.classList.toggle('hi', hi.includes(`${a}${b}`)));
    // 4–6. groups join the tree, most similar first
    show('gPQ', from(index, t, 3, 0.2, 0.7));
    show('gR', from(index, t, 4, 0.2, 0.7));
    show('gS', from(index, t, 5, 0.2, 0.7));
    // 7. parsimony check
    show('changes', from(index, t, 6, 0, 0.4));
    show('alt', from(index, t, 6, 0.45, 0.85));
  }
  render(0, 0);
  return { render, durations: [3.5, 4, 4.5, 3.5, 3.5, 3.5, 5] };
}
