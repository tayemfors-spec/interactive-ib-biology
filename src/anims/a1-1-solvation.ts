import { rng } from '../viewer3d/kit';
import { ease, lerp, phase } from '../lib/timeline';

/*
 * A1.1.5 water as a solvent (viewBox 520 × 340).
 *   Steps 0–2 (one panel): Na⁺ and Cl⁻ leave a crystal and gain hydration shells. Around Na⁺ the water
 *   molecules face it with their δ− oxygen; around Cl⁻ each turns one δ+ hydrogen towards it.
 *   Step 3: glucose hydrogen-bonds with water through its –OH groups and ring oxygen.
 *   Step 4: two oil droplets are excluded by the water and merge.
 *   Step 5: solutes carried in blood plasma and xylem sap.
 * A water glyph has O at its origin and its H–O–H bisector along +x; `rot` (degrees) turns it.
 */
export type XY = [number, number];
const HALF = 52.25;
export const OH = 9;
const rad = (d: number) => (d * Math.PI) / 180;
const dg = (r: number) => (r * 180) / Math.PI;
export const hLocal: [XY, XY] = [[OH * Math.cos(rad(-HALF)), OH * Math.sin(rad(-HALF))], [OH * Math.cos(rad(HALF)), OH * Math.sin(rad(HALF))]];
/** Rotation that points the whole molecule's H side along direction `a` (degrees). */
const hSideTowards = (a: number) => a;
/** Rotation that points the first O–H bond along direction `a` (degrees). */
const oneHTowards = (a: number) => a + HALF;

// ---------- crystal ----------
export const R_NA = 10;
export const R_CL = 15;
export const crystal: { x: number; y: number; na: boolean }[] = [];
for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) crystal.push({ x: 150 + c * 31, y: 152 + r * 31, na: (r + c) % 2 === 0 });
export const NA_I = 0; // top-left corner (Na⁺)
export const CL_I = 11; // bottom-right corner (Cl⁻)
const NA_END: XY = [92, 80];
const CL_END: XY = [400, 252];
const ionAt = (i: number, end: XY, p: number): XY => [lerp(crystal[i]!.x, end[0], p), lerp(crystal[i]!.y, end[1], p)];

// ---------- waters in the crystal panel ----------
const rand = rng(77);
export interface W { start: XY; startRot: number; ion: 'na' | 'cl' | null; ang: number; early: boolean }
export const waters: W[] = [];
const outwardNa = dg(Math.atan2(NA_END[1] - crystal[NA_I]!.y, NA_END[0] - crystal[NA_I]!.x));
const outwardCl = dg(Math.atan2(CL_END[1] - crystal[CL_I]!.y, CL_END[0] - crystal[CL_I]!.x));
const angDiff = (a: number, b: number) => Math.abs(((a - b + 540) % 360) - 180);
const starts: XY[] = [[60, 200], [70, 290], [140, 60], [210, 50], [290, 70], [330, 150], [300, 230], [250, 300], [170, 300], [100, 250], [366, 88], [450, 110], [470, 200], [460, 300], [360, 310], [40, 130], [410, 170], [490, 160], [30, 320], [230, 110]];
for (let k = 0; k < 6; k++) { const ang = k * 60 + 15; waters.push({ start: starts[k]!, startRot: rand() * 360, ion: 'na', ang, early: angDiff(ang, outwardNa) < 100 }); }
for (let k = 0; k < 6; k++) { const ang = k * 60 + 5; waters.push({ start: starts[6 + k]!, startRot: rand() * 360, ion: 'cl', ang, early: angDiff(ang, outwardCl) < 100 }); }
for (let k = 12; k < starts.length; k++) waters.push({ start: starts[k]!, startRot: rand() * 360, ion: null, ang: 0, early: false });

/** Final place of a shell water around an ion at `c`. */
function shellPose(w: W, c: XY): { p: XY; rot: number } {
  const u: XY = [Math.cos(rad(w.ang)), Math.sin(rad(w.ang))];
  if (w.ion === 'na') {
    const d = R_NA + 7 + 6; // O touches Na⁺: H atoms point away from the ion
    return { p: [c[0] + u[0] * d, c[1] + u[1] * d], rot: hSideTowards(w.ang) };
  }
  const d = R_CL + 4 + OH + 2; // one H points at Cl⁻
  return { p: [c[0] + u[0] * d, c[1] + u[1] * d], rot: oneHTowards(w.ang + 180) };
}
const lerpAngle = (a: number, b: number, t: number) => a + ((((b - a) % 360) + 540) % 360 - 180) * t;

// ---------- glucose ----------
export const GC: XY = [250, 176];
export const RING_R = 38;
// ring positions: ring O at −30°, then C1…C5 going clockwise in the drawing
export const ringAng = [-30, 30, 90, 150, 210, 270];
export const ringPt = (k: number): XY => [GC[0] + RING_R * Math.cos(rad(ringAng[k]!)), GC[1] + RING_R * Math.sin(rad(ringAng[k]!))];
const C6: XY = [GC[0], GC[1] - RING_R - 28];
/** The five hydroxyl groups: oxygen, direction of the O–H bond (degrees). C1–C4 carry –OH; C6 (on C5) carries the fifth. */
export const hydroxyls: { o: XY; hAng: number; donor: boolean }[] = [
  ...[1, 2, 3, 4].map((k) => { const [x, y] = ringPt(k); const a = ringAng[k]!; return { o: [x + 28 * Math.cos(rad(a)), y + 28 * Math.sin(rad(a))] as XY, hAng: a - 40, donor: k % 2 === 1 }; }),
  { o: [C6[0] + 26 * Math.cos(rad(-40)), C6[1] + 26 * Math.sin(rad(-40))], hAng: -100, donor: false },
];
export const C6_PT = C6;
/** One water per hydroxyl (and one for the ring O): either glucose's H bonds to water's O, or water's H bonds to glucose's O. */
export const gWaters = [
  ...hydroxyls.map((g) => {
    if (g.donor) {
      // glucose O–H···O(water): water O sits beyond the hydroxyl H, its H atoms facing away
      const hx = g.o[0] + 9 * Math.cos(rad(g.hAng)), hy = g.o[1] + 9 * Math.sin(rad(g.hAng));
      const p: XY = [hx + 20 * Math.cos(rad(g.hAng)), hy + 20 * Math.sin(rad(g.hAng))];
      return { p, rot: hSideTowards(g.hAng), bond: [hx, hy, p[0], p[1]] as [number, number, number, number] };
    }
    // water O–H···O(glucose): water approaches the hydroxyl O on the side away from its H
    const a = g.hAng + 120;
    const p: XY = [g.o[0] + 30 * Math.cos(rad(a)), g.o[1] + 30 * Math.sin(rad(a))];
    const h: XY = [p[0] + OH * Math.cos(rad(a + 180)), p[1] + OH * Math.sin(rad(a + 180))];
    return { p, rot: oneHTowards(a + 180), bond: [h[0], h[1], g.o[0], g.o[1]] as [number, number, number, number] };
  }),
  (() => {
    const [x, y] = ringPt(0);
    const a = -30;
    const p: XY = [x + 30 * Math.cos(rad(a)), y + 30 * Math.sin(rad(a))];
    const h: XY = [p[0] + OH * Math.cos(rad(a + 180)), p[1] + OH * Math.sin(rad(a + 180))];
    return { p, rot: oneHTowards(a + 180), bond: [h[0], h[1], x, y] as [number, number, number, number] };
  })(),
];
export const gStarts: XY[] = gWaters.map((w) => [GC[0] + (w.p[0] - GC[0]) * 1.9, GC[1] + (w.p[1] - GC[1]) * 1.75]);

// ---------- oil droplets ----------
export const D1 = { x: 168, y: 178, r: 46 };
export const D2 = { x: 342, y: 178, r: 38 };
export const MERGED_R = Math.sqrt(D1.r ** 2 + D2.r ** 2);
export const oilWater: { p: XY; rot: number }[] = [];
for (let tries = 0; tries < 3000 && oilWater.length < 30; tries++) {
  const p: XY = [24 + rand() * 472, 40 + rand() * 280];
  const clearOf = (c: { x: number; y: number; r: number }) => Math.hypot(p[0] - c.x, p[1] - c.y) > c.r + 16;
  if (clearOf(D1) && clearOf(D2) && clearOf({ x: 255, y: 178, r: MERGED_R }) && oilWater.every((w) => Math.hypot(w.p[0] - p[0], w.p[1] - p[1]) > 34)) oilWater.push({ p, rot: rand() * 360 });
}
/**
 * Each water donates one hydrogen bond to a close neighbour (never back to a molecule that donates to it):
 * its first H is turned to point at that neighbour's O, and the bond is drawn from that H to the O.
 */
export const oilBonds: [number, number, number, number][] = [];
const donatesTo = new Map<number, number>();
oilWater.forEach((w, i) => {
  let best = -1, bd = 66;
  oilWater.forEach((v, j) => {
    const d = Math.hypot(v.p[0] - w.p[0], v.p[1] - w.p[1]);
    if (j !== i && donatesTo.get(j) !== i && d < bd) { bd = d; best = j; }
  });
  if (best < 0) return;
  donatesTo.set(i, best);
  const v = oilWater[best]!;
  const ux = (v.p[0] - w.p[0]) / bd, uy = (v.p[1] - w.p[1]) / bd;
  w.rot = oneHTowards(dg(Math.atan2(uy, ux)));
  oilBonds.push([w.p[0] + ux * (OH + 5), w.p[1] + uy * (OH + 5), v.p[0] - ux * 9, v.p[1] - uy * 9]);
});

// ---------- transport ----------
export const plasma = [
  { k: 'glc', label: 'glucose', x: 30 }, { k: 'aa', label: 'amino acid', x: 130 }, { k: 'na', label: 'Na⁺', x: 225 },
  { k: 'urea', label: 'urea', x: 300 }, { k: 'lipo', label: 'lipoprotein', x: 390 }, { k: 'cl', label: 'Cl⁻', x: 480 },
];
export const sap = [{ k: 'k', label: 'K⁺', x: 40 }, { k: 'no3', label: 'NO₃⁻', x: 150 }, { k: 'mg', label: 'Mg²⁺', x: 260 }, { k: 'k', label: 'K⁺', x: 370 }, { k: 'no3', label: 'NO₃⁻', x: 470 }];

export function create(svg: SVGSVGElement) {
  const q = <T extends Element = SVGElement>(k: string) => svg.querySelector<T>(`[data-el="${k}"]`)!;
  const all = <T extends Element = SVGElement>(k: string) => [...svg.querySelectorAll<T>(`[data-el="${k}"]`)];
  const panels = ['pA', 'pB', 'pC', 'pD'].map((k) => q<SVGGElement>(k));
  const panelOf = [0, 0, 0, 1, 2, 3];
  const ions = all<SVGGElement>('ion');
  const ws = all<SVGGElement>('w');
  const gws = all<SVGGElement>('gw');
  const gbonds = all<SVGLineElement>('gb');
  const plasmaEls = all<SVGGElement>('pl');
  const sapEls = all<SVGGElement>('sp');
  const put = (g: SVGGElement, p: XY, rot = 0) => g.setAttribute('transform', `translate(${p[0].toFixed(1)} ${p[1].toFixed(1)})${rot ? ` rotate(${rot.toFixed(1)})` : ''}`);

  function render(index: number, t: number) {
    const panel = panelOf[index]!;
    panels.forEach((p, i) => (p.style.display = i === panel ? '' : 'none'));
    q('key').style.display = panel === 3 ? 'none' : '';
    if (index === 0 || index === 3 || index >= 4) panels[panel]!.style.opacity = String(ease(phase(t, 0, 0.15)));
    else panels[panel]!.style.opacity = '1';

    if (panel === 0) {
      // ion progress out of the crystal: step 1 → halfway, step 2 → all the way
      const p = index === 0 ? 0 : index === 1 ? 0.45 * ease(phase(t, 0.2, 1)) : 0.45 + 0.55 * ease(phase(t, 0, 0.8));
      const na = ionAt(NA_I, NA_END, p);
      const cl = ionAt(CL_I, CL_END, p);
      crystal.forEach((c, i) => put(ions[i]!, i === NA_I ? na : i === CL_I ? cl : [c.x, c.y]));
      waters.forEach((w, i) => {
        const drift: XY = [w.start[0] + 4 * Math.sin(t * 9 + i), w.start[1] + 4 * Math.cos(t * 7 + i * 1.3)];
        const rot0 = w.startRot + 12 * Math.sin(t * 6 + i);
        if (!w.ion || index === 0) { put(ws[i]!, drift, rot0); return; }
        const pose = shellPose(w, w.ion === 'na' ? na : cl);
        // waters on the open side arrive during step 1; the rest once the ion is clear of the crystal
        const k = index === 1 ? (w.early ? ease(phase(t, 0, 0.8)) : 0) : w.early ? 1 : ease(phase(t, 0.1, 0.7));
        put(ws[i]!, [lerp(drift[0], pose.p[0], k), lerp(drift[1], pose.p[1], k)], lerpAngle(rot0, pose.rot, k));
      });
      q('shellnotes').style.opacity = String(index === 2 ? ease(phase(t, 0.6, 0.9)) : 0);
    }
    if (panel === 1) {
      const k = ease(phase(t, 0.1, 0.7));
      gws.forEach((g, i) => put(g, [lerp(gStarts[i]![0], gWaters[i]!.p[0], k), lerp(gStarts[i]![1], gWaters[i]!.p[1], k)], gWaters[i]!.rot));
      gbonds.forEach((l) => (l.style.opacity = String(ease(phase(t, 0.7, 0.9)))));
    }
    if (panel === 2) {
      const u = ease(phase(t, 0.1, 0.6));
      const m = ease(phase(t, 0.55, 0.9));
      const c1 = lerp(D1.x, 255, u), c2 = lerp(D2.x, 255, u);
      q('d1').setAttribute('cx', c1.toFixed(1));
      q('d2').setAttribute('cx', c2.toFixed(1));
      q('dm').setAttribute('r', (m * MERGED_R).toFixed(1));
      q('d1').style.opacity = q('d2').style.opacity = String(1 - m);
    }
    if (panel === 3) {
      plasmaEls.forEach((g, i) => put(g, [((plasma[i]!.x + t * 120) % 540) - 10, 108 + 10 * Math.sin(i * 1.9)]));
      sapEls.forEach((g, i) => put(g, [((sap[i]!.x + t * 90) % 540) - 10, 262 + 8 * Math.sin(i * 2.3)]));
    }
  }
  render(0, 0);
  return { render, durations: [4, 5, 5, 5, 5, 6] };
}
