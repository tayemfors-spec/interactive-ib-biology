import { ease, phase } from '../lib/timeline';

/** Step i reveals column i (sliding in from the previous column); earlier columns stay visible. */
export function create(svg: SVGSVGElement) {
  const el = (k: string) => svg.querySelector<SVGGElement>(`[data-el="${k}"]`)!;

  function render(index: number, t: number) {
    for (let c = 0; c < 5; c++) {
      const g = el(`c${c}`);
      const h = el(`h${c}`);
      if (c < index) { g.style.opacity = '1'; g.setAttribute('transform', ''); h.style.opacity = '0.7'; }
      else if (c === index) {
        const p = c === 0 ? 1 : ease(phase(t, 0.15, 0.85));
        g.style.opacity = String(p);
        g.setAttribute('transform', `translate(${(-40 * (1 - p)).toFixed(1)} 0)`);
        h.style.opacity = '1';
      } else { g.style.opacity = '0'; h.style.opacity = '0.35'; }
      if (c < 4) el(`a${c}`).style.opacity = c < index ? '1' : c === index - 1 ? String(ease(phase(t, 0, 0.3))) : '0';
    }
    // the arrow into the current column fades in first
    if (index > 0) el(`a${index - 1}`).style.opacity = String(ease(phase(t, 0, 0.3)));
  }
  render(0, 0);
  return { render, durations: [3, 3.5, 4, 4, 4] };
}
