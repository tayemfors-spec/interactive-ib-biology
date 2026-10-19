import { ease, lerp, phase } from '../lib/timeline';

/**
 * Fatty acids self-assembling (A2.1.5): dispersed molecules → micelles → a bilayer sheet → a closed vesicle.
 * Each molecule is a head (carboxyl group) at (x, y) with a single tail pointing at angle a (degrees).
 */
export interface Pose { x: number; y: number; a: number }

export const CX = 260, CY = 160;
const N_OUT = 30, N_IN = 24; // outer leaflet holds more molecules than the inner one
export const N = N_OUT + N_IN;
const RM = 61; // radius of the bilayer mid-plane in the finished vesicle
const OFF = 16; // head distance from the mid-plane
const LM = 2 * Math.PI * RM; // mid-plane length, the same flat or curled
const MICELLES = 5;
const MIC_R = 19;

const deg = (r: number) => (r * 180) / Math.PI;
const TAGS = ['tag-dispersed', 'tag-micelle', 'tag-sheet', 'tag-closing', 'tag-vesicle'];

/** Arc parameter u ∈ (0, 1) along the sheet, and which leaflet, for molecule k. */
const slot = (k: number) => (k < N_OUT ? { u: (k + 0.5) / N_OUT, outer: true } : { u: (k - N_OUT + 0.5) / N_IN, outer: false });

/** Pose in a bilayer curled by c ∈ [0, 1] (0 = flat sheet, 1 = closed sphere centred on CX, CY). */
export function curled(k: number, c: number): Pose {
  const { u, outer } = slot(k);
  const s = outer ? 1 : -1;
  if (c < 1e-3) {
    // flat sheet: outer leaflet below the mid-plane, tails pointing up; inner leaflet above, tails down
    return { x: CX + (u - 0.5) * LM, y: CY + s * OFF, a: outer ? -90 : 90 };
  }
  const theta = c * 2 * Math.PI;
  const R = LM / theta;
  const ym = CY + c * RM;
  const phi = (u - 0.5) * theta;
  const nx = Math.sin(phi), ny = Math.cos(phi);
  const px = CX + R * nx, py = ym - R + R * ny;
  // tails point into the membrane: outer leaflet towards the centre, inner leaflet away from it
  const a = outer ? deg(Math.atan2(-ny, -nx)) : deg(Math.atan2(ny, nx));
  return { x: px + s * OFF * nx, y: py + s * OFF * ny, a };
}

function rng(seed: number) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

/** Pre-computed poses for the dispersed and micelle stages (deterministic, so the server and browser agree). */
export function stages() {
  const flat = Array.from({ length: N }, (_, k) => curled(k, 0));
  const order = [...flat.keys()].sort((a, b) => flat[a]!.x - flat[b]!.x);
  const micelle: Pose[] = new Array(N);
  const centres: [number, number][] = [];
  for (let m = 0; m < MICELLES; m++) {
    const group = order.slice(Math.round((m * N) / MICELLES), Math.round(((m + 1) * N) / MICELLES));
    const mx = group.reduce((t, k) => t + flat[k]!.x, 0) / group.length;
    const my = m % 2 ? 206 : 112;
    centres.push([mx, my]);
    group.forEach((k, j) => {
      const ang = (j / group.length) * 2 * Math.PI;
      micelle[k] = { x: mx + MIC_R * Math.cos(ang), y: my + MIC_R * Math.sin(ang), a: deg(ang) + 180 };
    });
  }
  const r = rng(7);
  const dispersed = micelle.map((p) => ({
    x: Math.min(505, Math.max(15, p.x + (r() - 0.5) * 150)),
    y: Math.min(262, Math.max(48, p.y + (r() - 0.5) * 130)),
    a: r() * 360 - 180,
  }));
  return { dispersed, micelle, centres };
}

const angLerp = (a: number, b: number, t: number) => {
  const d = ((((b - a) % 360) + 540) % 360) - 180;
  return a + d * t;
};
const mix = (p: Pose, q: Pose, t: number): Pose => ({ x: lerp(p.x, q.x, t), y: lerp(p.y, q.y, t), a: angLerp(p.a, q.a, t) });
export const poseTransform = (p: Pose) => `translate(${p.x.toFixed(1)} ${p.y.toFixed(1)}) rotate(${p.a.toFixed(1)})`;

export function create(svg: SVGSVGElement) {
  const mols = [...svg.querySelectorAll<SVGGElement>('[data-fa]')];
  const { dispersed, micelle } = stages();
  const el = (k: string) => svg.querySelector<SVGElement>(`[data-el="${k}"]`)!;
  const show = (k: string, o: number) => { el(k).style.opacity = o.toFixed(2); };
  const jiggle = (k: number, t: number): Pose => {
    const p = dispersed[k]!;
    const w = 2 * Math.PI * (2 * t + k * 0.37);
    return { x: p.x + 4 * Math.sin(w), y: p.y + 3 * Math.cos(w * 1.3), a: p.a + 10 * Math.sin(w) };
  };

  function render(index: number, t: number) {
    const e = ease(t);
    mols.forEach((g, k) => {
      let p: Pose;
      if (index === 0) p = jiggle(k, t);
      else if (index === 1) p = mix(jiggle(k, 0), micelle[k]!, e);
      else if (index === 2) p = mix(micelle[k]!, curled(k, 0), e);
      else if (index === 3) p = curled(k, e);
      else p = curled(k, 1);
      g.setAttribute('transform', poseTransform(p));
    });
    // each step's heading describes its end state; the previous heading gives way part-way through
    TAGS.forEach((tag, i) => {
      const o = i === index ? (index === 0 ? 1 : ease(phase(t, 0.55, 0.85))) : i === index - 1 ? 1 - ease(phase(t, 0.25, 0.5)) : 0;
      show(tag, o);
    });
    show('edges', index === 2 ? ease(phase(t, 0.7, 1)) : index === 3 ? 1 - ease(phase(t, 0, 0.3)) : 0);
    show('contents', index === 4 ? ease(phase(t, 0, 0.5)) : 0);
    show('callouts', index === 4 ? ease(phase(t, 0.4, 0.8)) : 0);
  }
  render(0, 0);
  return { render, durations: [3, 4, 4, 5, 4] };
}
