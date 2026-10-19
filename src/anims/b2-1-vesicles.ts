import { ease, lerp, phase } from '../lib/timeline';

export const Y0 = 90; // plasma membrane level; outside is above
export const R = 34; // vesicle radius
export const CX1 = 140; // endocytosis site
export const CX2 = 390; // exocytosis site

/** Membrane segment from x0 to x1 with a pocket at cx (mouth half-width m, depth D) dipping into the cytoplasm. */
export function segment(x0: number, x1: number, cx: number, m: number, D: number, first: boolean): string {
  const start = first ? `M${x0} ${Y0}` : `L${x0} ${Y0}`;
  if (D < 2) return `${start} L${x1} ${Y0}`;
  const r = Math.min(R, D / 2 + 1);
  const yc = Y0 + D - r;
  const mm = Math.max(m, r * 0.15);
  return `${start} L${cx - mm - 22} ${Y0} C${cx - mm} ${Y0} ${cx - r} ${Math.max(Y0, yc - r)} ${cx - r} ${yc} A${r} ${r} 0 0 0 ${cx + r} ${yc} C${cx + r} ${Math.max(Y0, yc - r)} ${cx + mm} ${Y0} ${cx + mm + 22} ${Y0} L${x1} ${Y0}`;
}

export function create(svg: SVGSVGElement) {
  const q = <T extends Element>(k: string) => svg.querySelector<T>(`[data-el="${k}"]`)!;
  const mems = [...svg.querySelectorAll<SVGPathElement>('[data-mem]')];
  const ves1 = q<SVGGElement>('ves1');
  const ves2 = q<SVGGElement>('ves2');
  const food = q<SVGCircleElement>('food');
  const cargo = [...svg.querySelectorAll<SVGCircleElement>('[data-cargo]')];
  const place = (g: SVGGElement, x: number, y: number, show = true) => { g.setAttribute('transform', `translate(${x} ${y})`); g.style.opacity = show ? '1' : '0'; };

  function render(index: number, t: number) {
    // ----- endocytosis (left) -----
    let D1 = 0, m1 = 70, pinched = false, vy1 = Y0 + 2 * R + 20;
    if (index === 0) { const u = ease(t); D1 = lerp(0, 2 * R + 6, u); m1 = lerp(70, R + 2, u); }
    else if (index === 1) {
      const u = ease(phase(t, 0, 0.45));
      D1 = 2 * R + 6; m1 = lerp(R + 2, 2, u);
      pinched = t > 0.45;
      vy1 = lerp(Y0 + R + 8, Y0 + 2 * R + 40, ease(phase(t, 0.45, 1)));
    } else { pinched = true; vy1 = Y0 + 2 * R + 40; }
    const foodY = index === 0 ? lerp(48, Y0 + D1 - R, ease(phase(t, 0.3, 1))) : pinched ? vy1 : Y0 + D1 - R;
    food.setAttribute('cy', String(foodY));
    place(ves1, CX1, vy1, pinched);

    // ----- exocytosis (right) -----
    let D2 = 0, m2 = R, vy2 = 250, show2 = true, release = 0;
    if (index < 2) { vy2 = 250; }
    else if (index === 2) { vy2 = lerp(250, Y0 + R + 10, ease(t)); }
    else {
      show2 = false;
      const u = ease(phase(t, 0, 0.55));
      D2 = lerp(2 * R + 6, 0, ease(phase(t, 0.35, 1)));
      m2 = lerp(2, R + 30, u);
      release = ease(phase(t, 0.2, 0.9));
    }
    place(ves2, CX2, vy2, show2);
    cargo.forEach((c, i) => {
      const bx = Number(c.dataset.bx), by = Number(c.dataset.by);
      const y = show2 ? vy2 + by : lerp(Y0 + R + by, 40 - i * 4, release);
      const x = CX2 + bx * (1 + release * 1.8);
      c.setAttribute('cx', x.toFixed(1)); c.setAttribute('cy', y.toFixed(1));
      c.style.opacity = index < 2 ? '0' : '1';
    });

    const d = segment(0, 265, CX1, m1, pinched ? 0 : D1, true) + ' ' + segment(265, 520, CX2, m2, D2, false);
    mems.forEach((p) => p.setAttribute('d', d));
  }
  render(0, 0);
  return { render, durations: [3.5, 3.5, 3, 4] };
}
