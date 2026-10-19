import { ease, lerp, phase } from '../lib/timeline';

export const ROW0 = 80; // top of the first cause row
export const ROWH = 48; // row height
export const ROWGAP = 10; // gap between rows

/**
 * Step 0: the underlying driver. Steps 1–5: one direct cause and its effect each.
 * Step 6: all causes act together, leading to extinction and ecosystem loss.
 */
export function create(svg: SVGSVGElement) {
  const q = <T extends SVGElement>(k: string) => svg.querySelector<T>(`[data-el="${k}"]`)!;
  const driver = q<SVGGElement>('driver');
  const bus = q<SVGPathElement>('bus');
  const bus2 = q<SVGPathElement>('bus2');
  const outcome = q<SVGGElement>('outcome');
  const rows = [0, 1, 2, 3, 4].map((i) => q<SVGGElement>(`row-${i}`));
  const arrows = [0, 1, 2, 3, 4].map((i) => q<SVGPathElement>(`arrow-${i}`));
  const ticks = [0, 1, 2, 3, 4].map((i) => q<SVGPathElement>(`tick-${i}`));
  const busLen = bus.getTotalLength?.() || 300;
  const bus2Len = bus2.getTotalLength?.() || 300;
  const draw = (p: SVGPathElement, len: number, u: number) => {
    p.style.strokeDasharray = `${len}`;
    p.style.strokeDashoffset = `${len * (1 - u)}`;
  };

  function render(index: number, t: number) {
    const last = rows.length + 1;
    driver.classList.toggle('on', index === 0 || index === last);
    draw(bus, busLen, index === 0 ? ease(phase(t, 0.2, 1)) : 1);
    // The active row is fully visible from the start of its step (readers often step without playing);
    // the motion is the branch from the driver line drawing in.
    rows.forEach((row, i) => {
      const step = i + 1;
      const o = index === step || index === last ? 1 : index > step ? 0.7 : 0.3;
      row.style.opacity = o.toFixed(2);
      row.classList.toggle('on', index === step);
      draw(ticks[i]!, 18, index === step ? lerp(0.15, 1, ease(phase(t, 0, 0.4))) : 1);
      arrows[i]!.classList.toggle('on', index === step);
    });
    bus2.style.opacity = index === last ? '1' : '0.3';
    draw(bus2, bus2Len, index === last ? lerp(0.1, 1, ease(phase(t, 0, 0.7))) : 1);
    outcome.style.opacity = index === last ? '1' : '0.3';
    outcome.classList.toggle('on', index === last);
  }

  render(0, 0);
  return { render, durations: [3.5, 4, 4, 4, 4, 4, 4.5] };
}
