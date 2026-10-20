import { ease, lerp, phase } from '../lib/timeline';

/**
 * Greenhouse effect. Every element with data-from / data-to is visible during those steps and fades in
 * during the first half of its first step. Molecules glow once they are absorbing (step 3 onwards).
 * The thermometer and the warm surface glow are set absolutely for each step.
 */
export function create(svg: SVGSVGElement) {
  const items = [...svg.querySelectorAll<SVGElement>('[data-from]')].map((el) => ({
    el, from: Number(el.dataset.from), to: Number(el.dataset.to ?? 99),
  }));
  const glow = svg.querySelector<SVGGElement>('[data-el="surface-glow"]')!;
  const thermo = svg.querySelector<SVGRectElement>('[data-el="thermo"]')!;
  const bottom = Number(thermo.dataset.bottom), top = Number(thermo.dataset.top);
  const mols = [...svg.querySelectorAll<SVGGElement>('.mol')];

  // thermometer level (0–1) at the END of each step
  const level = [0.22, 0.32, 0.32, 0.5, 0.68, 0.68];
  const glowAt = [0, 0.6, 0.6, 0.8, 1, 1];

  function render(index: number, t: number) {
    const k = ease(phase(t, 0, 0.5));
    for (const { el, from, to } of items) {
      let o = 0;
      if (index >= from && index <= to) o = index === from ? k : 1;
      // in the last (ozone) step, the greenhouse elements stay faintly visible behind the ozone layer
      if (index === 5 && from < 5 && to >= 5) o = 0.35;
      el.style.opacity = o.toFixed(2);
    }
    for (const m of mols) m.classList.toggle('lit', index >= 3 && index <= 4);
    const prevLevel = index === 0 ? 0.15 : level[index - 1]!;
    const lv = lerp(prevLevel, level[index]!, ease(phase(t, 0.2, 0.9)));
    const h = lv * (bottom - top);
    thermo.setAttribute('y', (bottom - h).toFixed(1));
    thermo.setAttribute('height', h.toFixed(1));
    const g0 = index === 0 ? 0 : glowAt[index - 1]!;
    glow.style.opacity = lerp(g0, glowAt[index]!, ease(phase(t, 0, 0.6))).toFixed(2);
  }

  render(0, 0);
  return { render, durations: [3.5, 3, 3.5, 4.5, 4.5, 4.5] };
}
