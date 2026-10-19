import { ease, lerp, phase } from '../lib/timeline';

/*
 * Steps: 0 isoleucine scarce, pathway running · 1 isoleucine accumulates · 2 isoleucine binds the
 * allosteric site of threonine deaminase, the active site changes shape and the whole pathway stops ·
 * 3 isoleucine is used up in protein synthesis, leaves the allosteric site and the pathway restarts.
 * Positions are in the SVG's coordinates; the enzyme group is centred at (378, 138).
 */
type XY = [number, number];
const ENZ: XY = [378, 138];
const THR_IN: XY = [-24, -33]; // in the active site (enzyme-local)
const THR_OUT: XY = [-62, -86]; // held away when the site is distorted
const ILE_POOL: XY = [320, 335];
const ILE_SITE: XY = [ENZ[0] + 61, ENZ[1] + 14];
const LEVEL_W = 210;

export function create(svg: SVGSVGElement) {
  const el = (k: string) => svg.querySelector<SVGGraphicsElement>(`[data-el="${k}"]`)!;
  const mix = (a: XY, b: XY, t: number): XY => [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];
  const move = (k: string, [x, y]: XY) => el(k).setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)})`);
  const flow = (on: number, t: number) => {
    // marching dashes show the pathway running; grey solid arrows show it stopped
    for (let i = 0; i < 5; i++) {
      const a = el(`arrow${i}`);
      a.classList.toggle('off', on < 0.5);
      a.style.strokeDashoffset = String(-t * 60);
    }
  };
  const inhibited = (s: number) => {
    el('eActive').style.opacity = String(1 - s);
    el('eInhib').style.opacity = String(s);
    el('stop').style.opacity = String(s);
    el('feedback').style.opacity = String(lerp(0.25, 1, s));
    el('fbtext').style.opacity = String(lerp(0.25, 1, s));
  };
  const level = (f: number) => el('level').setAttribute('width', (LEVEL_W * Math.max(0.08, Math.min(1, f))).toFixed(1));
  const status = (txt: string, off: boolean) => { const s = el('status'); s.textContent = txt; s.classList.toggle('off', off); };
  const thr = (p: XY) => move('thr', [p[0], p[1]]);

  function render(index: number, t: number) {
    switch (index) {
      case 0: // scarce: enzyme 1 active, threonine converted
        inhibited(0); level(0.15); flow(1, t);
        thr(mix(THR_OUT, THR_IN, ease(phase(t, 0, 0.6))));
        move('ile', ILE_POOL);
        status('Pathway running', false);
        break;
      case 1: // isoleucine builds up faster than it is used
        inhibited(0); level(lerp(0.15, 0.9, ease(t))); flow(1, t);
        thr(THR_IN);
        move('ile', ILE_POOL);
        status('Isoleucine accumulating', false);
        break;
      case 2: { // binding to the allosteric site switches the pathway off
        level(0.9);
        const b = ease(phase(t, 0, 0.5));
        move('ile', mix(ILE_POOL, ILE_SITE, b));
        const s = ease(phase(t, 0.45, 0.8));
        inhibited(s);
        thr(mix(THR_IN, THR_OUT, s));
        flow(s > 0.5 ? 0 : 1, t);
        status(s > 0.5 ? 'Pathway switched off' : 'Isoleucine binding', s > 0.5);
        break;
      }
      default: { // isoleucine used up; it detaches and the pathway restarts
        level(lerp(0.9, 0.2, ease(phase(t, 0, 0.5))));
        const u = ease(phase(t, 0.4, 0.75));
        move('ile', mix(ILE_SITE, ILE_POOL, u));
        inhibited(1 - u);
        thr(mix(THR_OUT, THR_IN, ease(phase(t, 0.7, 1))));
        flow(u > 0.5 ? 1 : 0, t);
        status(u > 0.5 ? 'Pathway running again' : 'Isoleucine being used up', false);
      }
    }
  }
  render(0, 0);
  return { render, durations: [4, 4, 5, 5] };
}
