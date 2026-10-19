import { ease, lerp, phase } from '../lib/timeline';

/*
 * Antagonistic muscles. Part 1: the arm from the side (front of the body to the right). The forearm rotates
 * about the elbow E by the flexion angle phi (0° = straight arm). Muscle endpoints are computed from the
 * bones, so the biceps really shortens as the elbow flexes and the triceps really lengthens (and vice versa).
 * Part 2: three ribs pivoting on the vertebral column; external intercostal fibres run from a point on one rib
 * forwards and down to the rib below, internal fibres backwards and down. Lowering the slope of the ribs
 * shortens the external fibres and lengthens the internal ones.
 */
type XY = [number, number];
export const E: XY = [140, 180];
export const SHOULDER: XY = [140, 30];
const O_BICEPS: XY = [156, 34];
const O_TRICEPS: XY = [124, 40];
const AREA = { biceps: 3600, triceps: 3000 };
export const FOREARM = 140;

const rad = (deg: number) => (deg * Math.PI) / 180;
/** A point fixed in the forearm (local x forward, y down the forearm), at flexion phi degrees. */
export const onForearm = (phi: number, [a, b]: XY): XY => {
  const p = rad(phi);
  return [E[0] + a * Math.cos(p) + b * Math.sin(p), E[1] - a * Math.sin(p) + b * Math.cos(p)];
};

/** Spindle-shaped muscle between origin o and insertion i: tendons at both ends, belly bulging to side `out`. */
export function muscle(o: XY, i: XY, area: number, out: 1 | -1) {
  const dx = i[0] - o[0], dy = i[1] - o[1];
  const len = Math.hypot(dx, dy);
  const w = area / len;
  let n: XY = [-dy / len, dx / len];
  if (Math.sign(n[0]) !== out) n = [-n[0], -n[1]];
  const at = (f: number): XY => [o[0] + dx * f, o[1] + dy * f];
  const a = at(0.14), b = at(0.86), m = at(0.5);
  const c1: XY = [m[0] + n[0] * w * 1.1, m[1] + n[1] * w * 1.1];
  const c2: XY = [m[0] - n[0] * w * 0.25, m[1] - n[1] * w * 0.25];
  const f = (p: XY) => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`;
  return {
    len,
    belly: `M${f(a)} Q${f(c1)} ${f(b)} Q${f(c2)} ${f(a)} Z`,
    tendons: `M${f(o)} L${f(a)} M${f(b)} L${f(i)}`,
  };
}

export function arm(phi: number) {
  const ins = { biceps: onForearm(phi, [9, 30]), triceps: onForearm(phi, [-9, -13]) };
  return {
    biceps: muscle(O_BICEPS, ins.biceps, AREA.biceps, 1),
    triceps: muscle(O_TRICEPS, ins.triceps, AREA.triceps, -1),
    forearm: `rotate(${(-phi).toFixed(2)} ${E[0]} ${E[1]})`,
  };
}

// ---------- ribs ----------
export const RIB_PIVOTS: XY[] = [[74, 60], [74, 130], [74, 200]];
export const RIB_LEN = 280;
const FIBRE_S = [44, 78, 112, 146, 180, 214];
const DELTA = 30;
const ribPoint = (p: XY, alpha: number, s: number): XY => [p[0] + s * Math.cos(rad(alpha)), p[1] + s * Math.sin(rad(alpha))];

export function ribs(alpha: number) {
  const f = (p: XY) => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`;
  const ribPaths = RIB_PIVOTS.map((p) => {
    const end = ribPoint(p, alpha, RIB_LEN);
    const mid = ribPoint(p, alpha, RIB_LEN / 2);
    return `M${f(p)} Q${f([mid[0], mid[1] - 10])} ${f(end)}`;
  });
  const ends = RIB_PIVOTS.map((p) => ribPoint(p, alpha, RIB_LEN));
  let ext = '', int = '';
  for (let r = 0; r < RIB_PIVOTS.length - 1; r++) {
    const up = RIB_PIVOTS[r]!, lo = RIB_PIVOTS[r + 1]!;
    for (const s of FIBRE_S) {
      // external: forwards and downwards; internal: backwards and downwards
      ext += `M${f(ribPoint(up, alpha, s))} L${f(ribPoint(lo, alpha, s + DELTA))} `;
      int += `M${f(ribPoint(up, alpha, s + DELTA + 6))} L${f(ribPoint(lo, alpha, s + 6))} `;
    }
  }
  return { ribPaths, ends, sternum: `M${f([ends[0]![0] + 6, ends[0]![1] - 12])} L${f([ends[2]![0] + 6, ends[2]![1] + 12])}`, ext: ext.trim(), int: int.trim() };
}

/** Length of one external and one internal fibre at rib slope alpha (used to check the geometry). */
export function fibreLengths(alpha: number) {
  const [up, lo] = [RIB_PIVOTS[0]!, RIB_PIVOTS[1]!];
  const d = (a: XY, b: XY) => Math.hypot(a[0] - b[0], a[1] - b[1]);
  return {
    external: d(ribPoint(up, alpha, 100), ribPoint(lo, alpha, 100 + DELTA)),
    internal: d(ribPoint(up, alpha, 100 + DELTA), ribPoint(lo, alpha, 100)),
  };
}

export const REST = 28, RAISED = 18, LOWERED = 34;

export function create(svg: SVGSVGElement) {
  const el = (k: string) => svg.querySelector<SVGElement>(`[data-el="${k}"]`)!;
  const set = (k: string, attr: string, v: string) => el(k).setAttribute(attr, v);
  const text = (k: string, v: string) => { el(k).textContent = v; };
  const show = (k: string, on: boolean) => { el(k).style.display = on ? '' : 'none'; };

  const drawArm = (phi: number, contracting: 'biceps' | 'triceps') => {
    const g = arm(phi);
    set('forearm', 'transform', g.forearm);
    set('biceps', 'd', g.biceps.belly);
    set('bicepsT', 'd', g.biceps.tendons);
    set('triceps', 'd', g.triceps.belly);
    set('tricepsT', 'd', g.triceps.tendons);
    el('biceps').classList.toggle('on', contracting === 'biceps');
    el('triceps').classList.toggle('on', contracting === 'triceps');
    text('s1', contracting === 'biceps' ? 'Biceps: contracting' : 'Biceps: relaxed, stretched');
    text('s2', contracting === 'triceps' ? 'Triceps: contracting' : 'Triceps: relaxed, stretched');
    text('s3', `Elbow flexion: ${Math.round(phi)}°`);
  };
  const drawRibs = (alpha: number, contracting: 'external' | 'internal') => {
    const r = ribs(alpha);
    r.ribPaths.forEach((d, i) => set(`rib${i}`, 'd', d));
    set('sternum', 'd', r.sternum);
    set('ext', 'd', r.ext);
    set('int', 'd', r.int);
    el('ext').classList.toggle('on', contracting === 'external');
    el('int').classList.toggle('on', contracting === 'internal');
    text('r1', contracting === 'external' ? 'External: contracting' : 'External: stretched');
    text('r2', contracting === 'internal' ? 'Internal: contracting' : 'Internal: stretched');
    text('r3', contracting === 'external' ? 'Ribs up and out: air in' : 'Ribs down and in: air out');
  };
  const gonio = (phi: number) => {
    const p = rad(phi);
    const r = 46;
    const a: XY = [E[0], E[1] + r];
    const b: XY = [E[0] + r * Math.sin(p), E[1] + r * Math.cos(p)];
    set('arc', 'd', phi < 0.5 ? '' : `M${a[0]} ${a[1]} A${r} ${r} 0 ${phi > 180 ? 1 : 0} 0 ${b[0].toFixed(1)} ${b[1].toFixed(1)}`);
    set('gMove', 'transform', `rotate(${(-phi).toFixed(2)} ${E[0]} ${E[1]})`);
  };

  function render(index: number, t: number) {
    const onArm = index <= 2;
    show('arm', onArm);
    show('ribs', !onArm);
    show('armKey', onArm);
    show('ribKey', !onArm);
    show('gonio', index === 2);
    switch (index) {
      case 0: drawArm(120 * ease(t), 'biceps'); break;
      case 1: drawArm(120 * (1 - ease(t)), 'triceps'); break;
      case 2: { const phi = 145 * ease(phase(t, 0.15, 1)); drawArm(phi, 'biceps'); gonio(phi); break; }
      case 3: drawRibs(lerp(REST, RAISED, ease(t)), 'external'); break;
      default: drawRibs(lerp(RAISED, LOWERED, ease(t)), 'internal');
    }
  }
  render(0, 0);
  return { render, durations: [4, 4, 5, 4, 4] };
}
