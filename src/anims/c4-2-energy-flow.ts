import { ease, phase } from '../lib/timeline';

/**
 * Energy flow through a food chain. Each element in the SVG has data-step = the step in which it
 * appears; it is hidden (arrows) or dimmed (boxes) before that step, drawn in during it, and stays
 * afterwards. Step 0 sunlight → producers; 1 producer respiration; 2–4 each consumer level;
 * 5 decomposers; 6 energy flows but nutrients cycle.
 */
export function create(svg: SVGSVGElement) {
  const items = [...svg.querySelectorAll<SVGGraphicsElement>('[data-step]')].map((el) => {
    const isPath = el.tagName.toLowerCase() === 'path';
    const len = isPath ? (el as SVGPathElement).getTotalLength?.() || 100 : 0;
    return { el, step: Number(el.dataset.step), isPath, len, fade: el.dataset.fade === '1', marker: el.dataset.marker };
  });
  const vals = [...svg.querySelectorAll<SVGTextElement>('[data-el^="val-"]')];

  function render(index: number, t: number) {
    for (const it of items) {
      const { el, step } = it;
      const active = index === step;
      el.classList.toggle('on', active);
      if (!it.isPath) {
        // boxes and labels: dimmed before their step, fully shown from the start of their step
        const isBox = el.classList.contains('box');
        el.style.opacity = index >= step ? '1' : isBox ? '0.35' : '0';
        continue;
      }
      if (index < step) { el.style.opacity = '0'; el.removeAttribute('marker-end'); continue; }
      const u = active ? ease(phase(t, 0, 0.7)) : 1;
      el.style.opacity = it.fade ? String(active ? Math.max(0.15, u) : 1) : '1';
      if (!it.fade) {
        el.style.strokeDasharray = `${it.len}`;
        el.style.strokeDashoffset = `${it.len * (1 - u)}`;
        // dashed "dead matter" arrows keep their own dash pattern once drawn
        if (u >= 1 && el.classList.contains('dead')) { el.style.strokeDasharray = ''; el.style.strokeDashoffset = ''; }
      }
      if (it.marker && u > 0.92) el.setAttribute('marker-end', it.marker); else el.removeAttribute('marker-end');
    }
    for (const v of vals) {
      const g = v.closest<SVGGElement>('[data-step]')!;
      v.style.opacity = index >= Number(g.dataset.step) ? '1' : '0';
    }
  }

  render(0, 0);
  return { render, durations: [3.5, 3.5, 4, 4, 4, 4, 4] };
}
