import { ease, lerp, phase } from '../lib/timeline';

/*
 * The secretory pathway and clathrin-coated vesicles (B2.2.7–B2.2.9). The plasma membrane runs along the
 * bottom (outside the cell is below it); vesicles and pits always bulge upwards, into the cytoplasm.
 * Steps: 0 free vs bound ribosomes   1 folding, transport vesicle buds from the RER   2 to the cis face
 * 3 cis → trans, carbohydrate added   4 secretory vesicle to the membrane   5 exocytosis
 * 6 clathrin coat assembles, membrane curves into a pit   7 coated vesicle buds off   8 coat removed.
 */
export type XY = [number, number];
export const Y = 330;          // plasma membrane
export const VR = 17;          // vesicle radius
export const CX_EXO = 250;     // where the secretory vesicle fuses
export const CX_CL = 452;      // where the clathrin-coated pit forms
export const CR = 22;          // radius of the clathrin-coated vesicle
export const ER = { x: 24, y: 74, w: 200, h: 32 };
export const BOUND: XY[] = [[70, ER.y - 8], [106, ER.y - 8], [142, ER.y - 8]];
export const FREE: XY = [300, 64];
export const GOLGI = { cx: 250, cy: 282, r0: 112, dr: 12, n: 5 };
export const golgiTop = (i: number) => GOLGI.cy - (GOLGI.r0 - GOLGI.dr * i);
export const RECEPTORS = 4;
export const TRISKELIA = 9;

// ----- where things wait before they take part -----
export const CARGO_OUT: XY[] = [[392, 372], [430, 384], [478, 378], [512, 368]];
export const CLATHRIN_FREE: XY[] = [[352, 130], [394, 118], [436, 134], [374, 162], [416, 168], [458, 156], [352, 198], [396, 206], [440, 196]];

/** An extended polypeptide: residue s leaves the ribosome, goes into the lumen, then runs along it. */
export const chainSlot = (rib: XY, s: number): XY => (s < 1.5 ? [rib[0] + 2, rib[1] + 13 + s * 6] : [rib[0] + 6 + (s - 1.5) * 7, rib[1] + 22 + (s % 2 ? 2 : -2)]);
export const freeSlot = (s: number): XY => [FREE[0] + 10 + s * 8, FREE[1] + 6 + s * 2.5 + (s % 2 ? 2 : -2)];
const FOLD: XY[] = Array.from({ length: 6 }, (_, i) => [Math.cos((i * Math.PI) / 3) * 3.6, Math.sin((i * Math.PI) / 3) * 3.6]);
const OFF: XY[] = [[-6, -3], [6, -3], [0, 6]];

const cubic = (p0: XY, p1: XY, p2: XY, p3: XY, n: number): XY[] =>
  Array.from({ length: n + 1 }, (_, i) => {
    const t = i / n, u = 1 - t;
    return [u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0], u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1]];
  });

/**
 * Points along the plasma membrane around a pocket at cx that bulges up into the cytoplasm: mouth
 * half-width m, depth D, rounded top of radius ≤ R. Flat when D is near zero.
 */
export function pocket(cx: number, m: number, D: number, R = VR): XY[] {
  const r = Math.min(R, D / 2 + 1);
  const yc = Y - D + r;
  const mm = Math.max(m, r * 0.15);
  const a: XY = [cx - mm - 22, Y], b: XY = [cx + mm + 22, Y];
  if (D < 1) return [a, [cx, Y], b];
  const left = cubic(a, [cx - mm, Y], [cx - r, Math.min(Y, yc + r)], [cx - r, yc], 12);
  const top = Array.from({ length: 17 }, (_, i): XY => { const t = Math.PI + (i / 16) * Math.PI; return [cx + r * Math.cos(t), yc + r * Math.sin(t)]; });
  const right = cubic([cx + r, yc], [cx + r, Math.min(Y, yc + r)], [cx + mm, Y], b, 12);
  return [...left, ...top.slice(1), ...right.slice(1)];
}

export const path = (pts: XY[]) => pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');

/** n evenly spaced points (by length) on the middle fraction [f0, f1] of a polyline, with the normal towards the cytoplasm. */
export function slots(pts: XY[], n: number, f0: number, f1: number): { p: XY; n: XY }[] {
  const len = [0];
  for (let i = 1; i < pts.length; i++) len.push(len[i - 1]! + Math.hypot(pts[i]![0] - pts[i - 1]![0], pts[i]![1] - pts[i - 1]![1]));
  const total = len[len.length - 1]!;
  const out: { p: XY; n: XY }[] = [];
  for (let k = 0; k < n; k++) {
    const target = total * (f0 + ((f1 - f0) * (k + 0.5)) / n);
    let i = 1;
    while (i < len.length - 1 && len[i]! < target) i++;
    const a = pts[i - 1]!, b = pts[i]!;
    const u = (target - len[i - 1]!) / Math.max(1e-6, len[i]! - len[i - 1]!);
    const tx = b[0] - a[0], ty = b[1] - a[1], tl = Math.hypot(tx, ty) || 1;
    // travelling left → right with y pointing down, the cytoplasm is on the left-hand side: (ty, −tx)
    out.push({ p: [lerp(a[0], b[0], u), lerp(a[1], b[1], u)], n: [ty / tl, -tx / tl] });
  }
  return out;
}

/** The plasma membrane as one path with both pockets. */
export function membrane(exo: { m: number; D: number }, cl: { m: number; D: number }): string {
  const e = pocket(CX_EXO, exo.m, exo.D), c = pocket(CX_CL, cl.m, cl.D, CR);
  return path([[0, Y], ...e, ...c, [560, Y]]);
}

export function create(svg: SVGSVGElement) {
  const q = <T extends Element>(k: string) => svg.querySelector<T>(`[data-el="${k}"]`)!;
  const all = <T extends Element>(k: string) => [...svg.querySelectorAll<T>(`[data-el="${k}"]`)];
  const mems = all<SVGPathElement>('pm');
  const ves = q<SVGGElement>('ves');
  const clv = q<SVGGElement>('clv');
  const proteins = [0, 1, 2].map((p) => all<SVGCircleElement>(`p${p}`));
  const freeP = all<SVGCircleElement>('fp');
  const tags = all<SVGCircleElement>('tag');
  const tris = all<SVGGElement>('tri');
  const recs = all<SVGGElement>('rec');
  const ligs = all<SVGCircleElement>('lig');
  const set = (c: SVGCircleElement, [x, y]: XY, show = true) => { c.setAttribute('cx', x.toFixed(1)); c.setAttribute('cy', y.toFixed(1)); c.style.opacity = show ? '1' : '0'; };
  const place = (g: SVGGElement, [x, y]: XY, s = 1, show = true, rot = 0) => {
    g.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${rot.toFixed(1)}) scale(${s.toFixed(3)})`);
    g.style.opacity = show ? '1' : '0';
  };
  const mix = (a: XY, b: XY, t: number): XY => [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];
  const add = (a: XY, b: XY, k = 1): XY => [a[0] + b[0] * k, a[1] + b[1] * k];

  const BUD: XY = [200, ER.y + ER.h - 4];
  const VES_ER: XY = [200, ER.y + ER.h + VR + 4];
  const ABOVE_CIS: XY = [GOLGI.cx, golgiTop(0) - VR - 4];
  const IN_CIS: XY = [GOLGI.cx, golgiTop(0)];
  const IN_TRANS: XY = [GOLGI.cx, golgiTop(GOLGI.n - 1)];
  const BELOW_TRANS: XY = [GOLGI.cx, golgiTop(GOLGI.n - 1) + VR + 8];
  const AT_PM: XY = [CX_EXO, Y - VR - 5];

  function render(index: number, t: number) {
    // ---------- the free ribosome's protein (purple): made in step 1, folds and stays in the cytosol ----------
    const fCount = index === 0 ? Math.floor(ease(phase(t, 0.05, 0.85)) * 6.999) : 6;
    const fFold = index === 0 ? 0 : index === 1 ? ease(phase(t, 0, 0.35)) : 1;
    const fCentre: XY = [FREE[0] + 42, FREE[1] + 22];
    freeP.forEach((c, j) => set(c, mix(freeSlot(fCount - 1 - j), add(fCentre, FOLD[j]!), fFold), j < fCount));

    // ---------- the three secretory proteins (red) ----------
    let vesAt: XY | null = null, vesS = 1;
    let exo = { m: 2, D: 0 };
    let tagS = index > 3 ? 1 : 0;
    for (let p = 0; p < 3; p++) {
      let count = 6, fold = 1, centre: XY = chainSlot(BOUND[p]!, 3);
      if (index === 0) {
        count = Math.floor(ease(phase(t, 0.05 + p * 0.05, 0.8 + p * 0.05)) * 6.999);
        fold = 0;
      } else if (index === 1) {
        fold = ease(phase(t, 0, 0.3));
        centre = mix(centre, add(BUD, OFF[p]!, 0.8), ease(phase(t, 0.3, 0.65)));
        const bud = ease(phase(t, 0.6, 1));
        if (bud > 0) { vesAt = mix(BUD, VES_ER, bud); vesS = lerp(0.4, 1, bud); centre = mix(centre, add(vesAt, OFF[p]!), bud); }
      } else if (index === 2) {
        const move = ease(phase(t, 0, 0.7)), fuse = ease(phase(t, 0.7, 1));
        vesAt = mix(VES_ER, ABOVE_CIS, move);
        vesS = 1 - fuse;
        centre = mix(add(vesAt, OFF[p]!), add(IN_CIS, [(p - 1) * 14, 0]), fuse);
      } else if (index === 3) {
        const u = ease(phase(t, 0.05, 0.95));
        centre = add(mix(IN_CIS, IN_TRANS, u), [(p - 1) * 14, 0]);
        tagS = ease(phase(t, 0.35, 0.65));
      } else if (index === 4) {
        const bud = ease(phase(t, 0, 0.3)), move = ease(phase(t, 0.3, 1));
        vesAt = mix(mix(IN_TRANS, BELOW_TRANS, bud), AT_PM, move);
        vesS = lerp(0.4, 1, bud);
        centre = mix(add(IN_TRANS, [(p - 1) * 14, 0]), add(vesAt, OFF[p]!), bud);
      } else {
        // fused with the plasma membrane (index 5) and released outside; stays outside afterwards
        const open = index === 5 ? ease(phase(t, 0, 0.5)) : 1;
        const flat = index === 5 ? ease(phase(t, 0.3, 1)) : 1;
        exo = { m: lerp(2, VR + 30, open), D: lerp(2 * VR + 6, 0, flat) };
        const out = index === 5 ? ease(phase(t, 0.15, 0.95)) : 1;
        const inPocket = add([CX_EXO, Y - VR - 2], OFF[p]!);
        centre = mix(inPocket, [CX_EXO - 46 + p * 46, 368 + (p === 1 ? 12 : 0)], out);
      }
      proteins[p]!.forEach((c, j) => set(c, mix(chainSlot(BOUND[p]!, count - 1 - j), add(centre, FOLD[j]!), fold), j < count));
      for (let k = 0; k < 2; k++) {
        const c = tags[p * 2 + k]!;
        set(c, add(centre, [5 + k * 4, -6 - k * 4]), tagS > 0.01);
        c.setAttribute('r', (2.8 * tagS).toFixed(2));
      }
    }
    if (index < 5) exo = { m: 2, D: 0 };
    if (vesAt && vesS > 0.01) place(ves, vesAt, vesS); else place(ves, [0, 0], 1, false);

    // ---------- clathrin-coated vesicle at the plasma membrane ----------
    let cl = { m: 60, D: 0 };
    let pinched = false, lift = 0;
    let coatIn = 0, bind = 0, uncoat = 0, away = 0;
    if (index === 6) {
      bind = ease(phase(t, 0, 0.4));
      coatIn = ease(phase(t, 0.2, 0.7));
      const curve = ease(phase(t, 0.45, 1));
      cl = { m: lerp(60, CR + 6, curve), D: lerp(0, CR + 8, curve) };
    } else if (index === 7) {
      bind = 1; coatIn = 1;
      const u = ease(phase(t, 0, 0.6));
      cl = { m: lerp(CR + 6, 2, u), D: lerp(CR + 8, 2 * CR + 10, u) };
      pinched = t > 0.6;
      lift = ease(phase(t, 0.6, 1));
    } else if (index === 8) {
      bind = 1; coatIn = 1; pinched = true; lift = 1;
      uncoat = ease(phase(t, 0, 0.6));
      away = ease(phase(t, 0.25, 1));
    }
    if (pinched) cl = { m: 60, D: 0 };
    const vesCentre: XY = mix(mix([CX_CL, Y - CR - 7], [CX_CL, Y - CR - 46], lift), [500, 224], away);
    place(clv, vesCentre, 1, pinched);

    // coat, receptor and cargo positions follow the current shape of the pit, or the separate vesicle
    const ring = (rad: number, n: number, a0: number) => Array.from({ length: n }, (_, k) => {
      const a = a0 + (k / n) * Math.PI * 2;
      return { p: [vesCentre[0] + Math.cos(a) * rad, vesCentre[1] + Math.sin(a) * rad] as XY, n: [Math.cos(a), Math.sin(a)] as XY };
    });
    const pit = pocket(CX_CL, cl.m, cl.D, CR);
    const coatSlots = pinched ? ring(CR, TRISKELIA, -Math.PI / 2) : slots(pit, TRISKELIA, cl.D < 1 ? 0.18 : 0.12, cl.D < 1 ? 0.82 : 0.88);
    tris.forEach((g, k) => {
      const s = coatSlots[k]!;
      const onCoat = add(s.p, s.n, 10);
      const rot = (Math.atan2(s.n[1], s.n[0]) * 180) / Math.PI + 90;
      const free = CLATHRIN_FREE[k]!;
      const wander: XY = add(onCoat, s.n, 26 + (k % 3) * 8);
      let at = mix(free, onCoat, coatIn);
      if (uncoat > 0) at = mix(onCoat, mix(wander, free, away * 0.6), uncoat);
      place(g, at, 1, true, coatIn > 0.5 && uncoat < 0.5 ? rot : k * 40);
      g.style.opacity = uncoat > 0 ? String(lerp(1, 0.45, uncoat)) : '1';
    });
    const recSlots = pinched ? ring(CR, RECEPTORS, Math.PI * 0.2) : slots(pit, RECEPTORS, 0.33, 0.67);
    recs.forEach((g, k) => {
      const s = recSlots[k]!;
      const rot = (Math.atan2(-s.n[1], -s.n[0]) * 180) / Math.PI - 90;
      place(g, add(s.p, s.n, -3), 1, true, rot);
      // cargo bound to the receptor on the side facing outside the cell (inside the pit / vesicle)
      set(ligs[k]!, mix(CARGO_OUT[k]!, add(s.p, s.n, -13), bind));
    });

    const d = membrane(exo, cl);
    mems.forEach((m) => m.setAttribute('d', d));
  }
  render(0, 0);
  return { render, durations: [4.5, 4.5, 3.5, 4, 3.5, 3.5, 4.5, 3.5, 3.5] };
}
