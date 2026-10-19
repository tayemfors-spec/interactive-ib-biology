import { ease, lerp, phase } from '../lib/timeline';

type XY = [number, number];
/** Glass tubing: boiling flask → spark flask, and spark flask → condenser → U-tube trap → back to the boiling flask. */
export const TUBES = ['M100 226 V40 H330 V52', 'M330 184 V322 Q330 340 312 340 H226 Q208 340 208 322 V300 H147'];
/** Highlight box [x, y, w, h] for the part of the apparatus each step is about. */
export const FOCUS: [number, number, number, number][] = [
  [44, 232, 112, 136], // boiling flask
  [258, 46, 144, 144], // spark flask (gases)
  [228, 104, 204, 48], // electrodes
  [302, 190, 56, 80], // condenser
  [196, 310, 146, 42], // trap
  [104, 132, 136, 104], // results
  [258, 46, 144, 144], // spark flask again (evaluation)
];

const VAPOUR: XY[] = [[100, 226], [100, 40], [330, 40], [330, 56]];
const DROP: XY[] = [[330, 186], [330, 322], [318, 338], [268, 340]];
const RETURN: XY[] = [[208, 322], [208, 300], [150, 300]];

/** Point a fraction f (0–1) of the way along a polyline. */
function along(pts: XY[], f: number): XY {
  const segs = pts.slice(1).map((p, i) => Math.hypot(p[0] - pts[i]![0], p[1] - pts[i]![1]));
  let d = Math.max(0, Math.min(1, f)) * segs.reduce((a, b) => a + b, 0);
  for (let i = 0; i < segs.length; i++) {
    if (d <= segs[i]! || i === segs.length - 1) {
      const u = segs[i] ? Math.min(1, d / segs[i]!) : 0;
      return [lerp(pts[i]![0], pts[i + 1]![0], u), lerp(pts[i]![1], pts[i + 1]![1], u)];
    }
    d -= segs[i]!;
  }
  return pts[pts.length - 1]!;
}

const frac = (v: number) => v - Math.floor(v);

export function create(svg: SVGSVGElement) {
  const el = <T extends SVGElement = SVGElement>(k: string) => svg.querySelector<T>(`[data-el="${k}"]`)!;
  const all = (sel: string) => [...svg.querySelectorAll<SVGCircleElement>(sel)];
  const bubbles = all('[data-bubble]');
  const vapour = all('[data-vapour]');
  const drops = all('[data-drop]');
  const returns = all('[data-return]');
  const focus = el<SVGRectElement>('focus');
  const show = (e: SVGElement, o: number) => { e.style.opacity = o.toFixed(2); };
  const put = (c: SVGCircleElement, [x, y]: XY) => { c.setAttribute('cx', x.toFixed(1)); c.setAttribute('cy', y.toFixed(1)); };
  /** Liquid colour: clear water (0) to the dark red-brown product mixture (1). */
  const tint = (p: number) =>
    `color-mix(in srgb, color-mix(in srgb, var(--bio-chol) 80%, var(--bio-head)) ${Math.round(p * 85)}%, color-mix(in srgb, var(--bio-water) 45%, var(--surface)))`;

  function render(index: number, t: number) {
    // Continuous "clock" for circulating material, so motion is smooth within a step.
    const clock = index * 3 + t * 3;

    // highlight box, gliding between parts
    const a = FOCUS[Math.max(0, index - 1)]!, b = FOCUS[index]!;
    const u = index === 0 ? 1 : ease(phase(t, 0, 0.25));
    focus.setAttribute('x', lerp(a[0], b[0], u).toFixed(1));
    focus.setAttribute('y', lerp(a[1], b[1], u).toFixed(1));
    focus.setAttribute('width', lerp(a[2], b[2], u).toFixed(1));
    focus.setAttribute('height', lerp(a[3], b[3], u).toFixed(1));

    // boiling: bubbles rise through the water all the time
    bubbles.forEach((c, i) => put(c, [78 + i * 11, 330 - frac(clock * 0.9 + i * 0.23) * 40]));
    // water vapour travels up to the spark flask
    vapour.forEach((c, i) => put(c, along(VAPOUR, frac(clock * 0.35 + i / vapour.length))));

    // sparks from step 3 onwards, flickering
    const sparkOn = index >= 2 ? (Math.sin(clock * 40) > -0.2 ? 1 : 0.25) : 0;
    show(el('spark'), sparkOn);

    // condensed droplets run down to the trap from step 4; collected liquid returns to the flask from step 5
    drops.forEach((c, i) => {
      show(c, index >= 3 ? 1 : 0);
      put(c, along(DROP, frac(clock * 0.45 + i / drops.length)));
    });
    returns.forEach((c, i) => {
      show(c, index >= 4 ? 1 : 0);
      put(c, along(RETURN, frac(clock * 0.4 + i / returns.length)));
    });

    // the products accumulate over a week, colouring the trap and the "ocean"
    const week = index < 4 ? 0 : index === 4 ? ease(t) : 1;
    const trap = el<SVGPathElement>('trap');
    show(trap, index >= 3 ? 1 : 0);
    trap.style.stroke = tint(index === 3 ? 0.1 : Math.max(0.1, week));
    el('water').style.fill = tint(week * 0.7);
    el('day').textContent = String(Math.round(week * 7));

    show(el('results'), index === 5 ? ease(phase(t, 0.1, 0.5)) : index === 6 ? 1 : 0);
    const swap = index === 6 ? ease(phase(t, 0.2, 0.6)) : 0;
    show(el('gases'), 1 - swap);
    show(el('gas-label'), 1 - swap);
    show(el('gases-now'), swap);
    show(el('now-label'), swap);
  }
  render(0, 0);
  return { render, durations: [4, 4, 4, 4, 6, 4, 5] };
}
