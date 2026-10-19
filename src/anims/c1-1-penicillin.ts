import { ease, lerp, phase } from '../lib/timeline';

/*
 * Steps: 0 transpeptidase forms a cross-link · 1 penicillin enters the active site and bonds
 * covalently to serine (irreversible) · 2 no new cross-links, the wall weakens and the growing cell
 * bursts · 3 resistance: a transpeptidase with an altered active site does not bind penicillin, so
 * cross-linking continues.
 */
type XY = [number, number];
const PEN_START: XY = [150, 330];
const PEN_SITE: XY = [256, 156];
const PEN_BLOCKED: XY = [200, 330];

export function create(svg: SVGSVGElement) {
  const el = (k: string) => svg.querySelector<SVGGraphicsElement>(`[data-el="${k}"]`)!;
  const op = (k: string, v: number) => (el(k).style.opacity = String(v));
  const mix = (a: XY, b: XY, t: number): XY => [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];
  const pen = ([x, y]: XY) => {
    el('pen').setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)})`);
    el('pentxt').setAttribute('x', (x - 40).toFixed(1));
    el('pentxt').setAttribute('y', (y + 4).toFixed(1));
  };
  const cell = (burst: number, txt: string, bad: boolean) => {
    op('cellOk', 1 - burst);
    op('cellBurst', burst);
    const c = el('cellTxt');
    c.textContent = txt;
    c.classList.toggle('off', bad);
  };
  const enzyme = (resist: number) => { op('eNormal', 1 - resist); op('eResist', resist); };

  function render(index: number, t: number) {
    switch (index) {
      case 0:
        enzyme(0); pen(PEN_START); op('bond', 0); op('bondtxt', 0); op('nolink', 0);
        op('newlink', ease(phase(t, 0.2, 0.8)));
        cell(0, 'Wall strong', false);
        break;
      case 1: {
        enzyme(0); op('newlink', 1); op('nolink', 0);
        pen(mix(PEN_START, PEN_SITE, ease(phase(t, 0, 0.6))));
        const b = ease(phase(t, 0.6, 0.85));
        op('bond', b); op('bondtxt', b);
        cell(0, 'Enzyme inactivated', b > 0.5);
        break;
      }
      case 2: {
        enzyme(0); pen(PEN_SITE); op('bond', 1); op('bondtxt', 1); op('newlink', 0);
        op('nolink', ease(phase(t, 0, 0.3)));
        cell(ease(phase(t, 0.35, 0.9)), t > 0.6 ? 'Weak wall: cell bursts' : 'Wall weakening', true);
        break;
      }
      default: {
        const r = ease(phase(t, 0, 0.3));
        enzyme(r); op('bond', 0); op('bondtxt', 0); op('nolink', 0);
        pen(mix(PEN_START, PEN_BLOCKED, ease(phase(t, 0.2, 0.6))));
        op('newlink', ease(phase(t, 0.55, 0.95)));
        cell(0, 'Resistant: wall still strong', false);
      }
    }
  }
  render(0, 0);
  return { render, durations: [4, 4, 5, 5] };
}
