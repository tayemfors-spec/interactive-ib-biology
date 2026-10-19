import { ease, lerp, phase } from '../lib/timeline';

type XY = [number, number];
const PUMP_IN: XY[] = [[388, 106], [396, 116], [404, 126]];
const PUMP_OUT: XY[] = [[492, 120], [520, 150], [486, 170]];
const NA_LUMEN: XY[] = [[58, 158], [76, 176]];
const NA_SITE: XY[] = [[110, 140], [110, 172]];
const NA_INSIDE: XY[] = [[190, 132], [178, 196]];
const GLU_LUMEN: XY = [66, 128];
const GLU_SITE: XY = [110, 156];
const GLU_INSIDE: XY = [220, 168];
const GLU_GLUT: XY = [441, 232];
const GLU_BLOOD: XY = [505, 220];

export function create(svg: SVGSVGElement) {
  const el = (k: string) => svg.querySelector<SVGGElement>(`[data-el="${k}"]`)!;
  const at = (k: string, [x, y]: XY, show = true) => {
    el(k).setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)})`);
    el(k).style.opacity = show ? '1' : '0';
  };
  const mix = (a: XY, b: XY, t: number): XY => [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];
  const note = (s: string) => (el('note').textContent = s);

  function render(index: number, t: number) {
    // Pump step: 3 Na⁺ leave the cell into the blood (the K⁺ the pump brings in are left out for clarity).
    const pumped = index === 0 ? ease(phase(t, 0.3, 0.9)) : 1;
    PUMP_IN.forEach((p, i) => at(`p${i + 1}`, mix(p, PUMP_OUT[i]!, pumped)));
    at('atp', mix([400, 60], [428, 90], ease(phase(t, 0, 0.3))), index === 0 && t < 0.35);
    note(index === 0 ? 'ATP used by the pump keeps Na⁺ low inside the cell' : 'Na⁺ low inside the cell');

    const bind = index === 0 ? 0 : index === 1 ? ease(t) : 1;
    const enter = index < 2 ? 0 : index === 2 ? ease(phase(t, 0.1, 0.9)) : 1;
    NA_LUMEN.forEach((p, i) => at(`n${i + 1}`, enter > 0 ? mix(NA_SITE[i]!, NA_INSIDE[i]!, enter) : mix(p, NA_SITE[i]!, bind)));
    let g: XY = bind < 1 ? mix(GLU_LUMEN, GLU_SITE, bind) : mix(GLU_SITE, GLU_INSIDE, enter);
    if (index === 3) {
      const u = ease(t);
      g = u < 0.6 ? mix(GLU_INSIDE, GLU_GLUT, u / 0.6) : mix(GLU_GLUT, GLU_BLOOD, (u - 0.6) / 0.4);
    }
    at('g1', g);
  }
  render(0, 0);
  return { render, durations: [4, 3.5, 4, 4] };
}
