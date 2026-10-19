import { ease, lerp, phase } from '../lib/timeline';

type XY = [number, number];
// water vapour: where it forms (next to moist walls), then in the air space by the stoma, then outside
const VAP_START: XY[] = [[178, 150], [118, 152], [360, 150], [410, 158], [312, 140], [470, 150], [74, 150], [420, 172]];
const VAP_OUT: XY[] = [[392, 214], [404, 216], [398, 208], [410, 210], [386, 210], [416, 214], [396, 218], [402, 212]];
// a water molecule's path from the soil into the root xylem
const ROOT_PATH: XY[] = [[38, 526], [126, 524], [152, 530], [190, 548], [234, 552], [260, 552]];
const ION_FROM: XY[] = [[234, 490], [234, 530], [234, 570]];
const ION_TO: XY[] = [[258, 498], [262, 536], [257, 578]];
const SPACING = 13;

export function create(svg: SVGSVGElement) {
  const el = (k: string) => svg.querySelector<SVGElement>(`[data-el="${k}"]`)!;
  const show = (k: string, v: number) => (el(k).style.opacity = String(v));
  const at = (k: string, [x, y]: XY, o = 1) => {
    const n = el(k);
    if (n.tagName === 'circle') { n.setAttribute('cx', x.toFixed(1)); n.setAttribute('cy', y.toFixed(1)); }
    else n.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)})`);
    n.style.opacity = String(o);
  };
  const along = (path: XY[], u: number): XY => {
    const seg = Math.min(path.length - 2, Math.floor(u * (path.length - 1)));
    const f = u * (path.length - 1) - seg;
    const a = path[seg]!, b = path[seg + 1]!;
    return [lerp(a[0], b[0], f), lerp(a[1], b[1], f)];
  };
  const column = (shift: number) => el('column').setAttribute('transform', `translate(0 ${(-(shift % SPACING)).toFixed(2)})`);
  const gauge = (a: string, b: string) => { el('gauge1').textContent = a; el('gauge2').textContent = b; };
  const stoma = (open: number) => {
    el('guardL').setAttribute('cx', lerp(386.5, 381, open).toFixed(1));
    el('guardR').setAttribute('cx', lerp(413.5, 419, open).toFixed(1));
  };

  function render(index: number, t: number) {
    for (const k of ['aEvap', 'aStoma', 'aWalls', 'aPull', 'aRoot', 'aIons', 'hbonds', 'adhesion', 'ions']) show(k, 0);
    for (let i = 0; i < 5; i++) show(`r${i}`, 0);
    stoma(1);
    column(0);
    gauge('Pressure in xylem:', 'no tension yet');
    const vap = (u: number, o: number) => VAP_START.forEach((p, i) => at(`v${i}`, [lerp(p[0], VAP_OUT[i]![0], u), lerp(p[1], VAP_OUT[i]![1], u)], o));

    switch (index) {
      case 0: // evaporation from moist cell walls into the air spaces
        vap(0, ease(phase(t, 0, 0.6)));
        show('aEvap', ease(phase(t, 0.1, 0.5)));
        break;
      case 1: // diffusion of vapour out through the stoma
        VAP_START.forEach((p, i) => {
          const u = ease(phase(t, i * 0.06, 0.55 + i * 0.06));
          at(`v${i}`, [lerp(p[0], VAP_OUT[i]![0], u), lerp(p[1], VAP_OUT[i]![1], u)], 1 - 0.5 * phase(t, 0.85, 1));
        });
        show('aStoma', ease(phase(t, 0, 0.3)));
        break;
      case 2: // water drawn out of the xylem through cell walls
        vap(1, 0.5);
        show('aWalls', ease(phase(t, 0, 0.35)));
        column(ease(t) * SPACING * 0.6);
        gauge('Pressure in xylem:', 'falling: tension develops');
        break;
      case 3: // tension transmitted down the column by cohesion
        vap(1, 0.5);
        show('aWalls', 0.45);
        show('aPull', ease(phase(t, 0, 0.3)));
        show('hbonds', ease(phase(t, 0.15, 0.45)));
        show('adhesion', ease(phase(t, 0.3, 0.6)));
        column(SPACING * 0.6 + t * SPACING * 3);
        gauge('Pressure in xylem:', 'negative (under tension)');
        break;
      case 4: // water enters the roots
        vap(1, 0.5);
        show('aPull', 0.45);
        show('hbonds', 0.6);
        show('aRoot', ease(phase(t, 0, 0.3)));
        for (let i = 0; i < 5; i++) { const u = (i / 5 + t) % 1; at(`r${i}`, along(ROOT_PATH, u), 1); }
        column(t * SPACING * 3);
        gauge('Pressure in xylem:', 'negative (under tension)');
        break;
      default: { // AHL: root pressure when transpiration is low
        stoma(0.15);
        vap(0, 0);
        show('ions', 1);
        ION_FROM.forEach((p, i) => { const u = ease(phase(t, i * 0.1, 0.45 + i * 0.1)); at(`i${i}`, [lerp(p[0], ION_TO[i]![0], u), lerp(p[1], ION_TO[i]![1], u)]); });
        show('aIons', ease(phase(t, 0.05, 0.35)));
        for (let i = 0; i < 3; i++) { const u = 0.55 + ((i / 3 + t) % 1) * 0.45; at(`r${i}`, along(ROOT_PATH, u), ease(phase(t, 0.3, 0.5))); }
        column(ease(phase(t, 0.35, 1)) * SPACING * 1.5);
        gauge('Pressure in xylem:', t < 0.4 ? 'rising' : 'positive (root pressure)');
      }
    }
  }
  render(0, 0);
  return { render, durations: [4, 4, 4.5, 5, 5, 6] };
}
