import { ease, lerp, phase } from '../lib/timeline';

/** Number of flux steps before the final "sinks and sources" overview step. */
export const FLUX_STEPS = 7;

/**
 * Carbon cycle: each step brings one group of fluxes (data-step) to full strength. Fluxes not yet
 * reached are faint, so the whole cycle is always visible; earlier ones stay at reduced strength.
 * The last step shows every flux at full strength.
 */
export function create(svg: SVGSVGElement) {
  const groups = [...svg.querySelectorAll<SVGGElement>('[data-flux]')].map((g) => ({ g, step: Number(g.dataset.step) }));

  function render(index: number, t: number) {
    const all = index >= FLUX_STEPS;
    for (const { g, step } of groups) {
      const active = !all && index === step;
      g.classList.toggle('on', active);
      let o: number;
      if (all) o = lerp(0.45, 1, ease(phase(t, 0, 0.5)));
      else if (active) o = lerp(0.14, 1, ease(phase(t, 0, 0.45)));
      else o = step < index ? 0.45 : 0.14;
      g.style.opacity = o.toFixed(2);
    }
  }

  render(0, 0);
  return { render, durations: [3.5, 3, 4, 4, 4, 4, 3.5, 4] };
}
