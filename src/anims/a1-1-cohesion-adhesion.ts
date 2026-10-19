import { ease, lerp, phase } from '../lib/timeline';

/*
 * A1.1.3–A1.1.4 cohesion and adhesion, one panel per step (viewBox 520 × 340):
 *   0 cohesion between molecules   1 surface tension (pond skater)   2 xylem column under tension
 *   3 adhesion to a polar wall (meniscus)   4 capillary action in tubes and soil
 * Geometry helpers are exported so the .astro file draws the same start state on the server.
 */
export type XY = [number, number];
const HALF = (104.5 / 2) * (Math.PI / 180);
export const OH = 9; // drawn O–H length

/** H positions for a water molecule at (x, y) whose H–O–H bisector points at angle `b` (radians, SVG frame). */
export const hydrogens = (x: number, y: number, b: number): [XY, XY] => [
  [x + OH * Math.cos(b - HALF), y + OH * Math.sin(b - HALF)],
  [x + OH * Math.cos(b + HALF), y + OH * Math.sin(b + HALF)],
];

// ---------- panel 0: a 2D hydrogen-bonded sheet of water ----------
export const SURFACE_Y = 128;
const SP = 46;
export const sheet: { x: number; y: number; r: number; c: number }[] = [];
for (let r = 0; r < 5; r++) for (let c = 0; c < 9; c++) sheet.push({ x: 66 + c * SP + (r % 2) * (SP / 2), y: SURFACE_Y + 14 + r * SP * 0.866, r, c });
/** Bisector at 60°, so the two H atoms point (within ~8°) at the neighbours at 0° and 120°. */
export const SHEET_B = Math.PI / 3;
export const sheetBonds: [number, number, 0 | 1][] = []; // donor, acceptor, which H
sheet.forEach((m, i) => {
  const right = sheet.findIndex((n) => n.r === m.r && n.c === m.c + 1);
  const downLeft = sheet.findIndex((n) => n.r === m.r + 1 && Math.abs(n.x - (m.x - SP / 2)) < 1);
  if (right >= 0) sheetBonds.push([i, right, 0]);
  if (downLeft >= 0) sheetBonds.push([i, downLeft, 1]);
});
export const INNER = sheet.findIndex((m) => m.r === 3 && m.c === 4);
export const OUTER = sheet.findIndex((m) => m.r === 0 && m.c === 2);

// ---------- panel 1: pond skater on the surface film ----------
export const FILM_Y = 220;
export const FEET = [-92, -58, 50, 84]; // feet relative to the body centre
export function filmPath(cx: number): string {
  let d = '';
  for (let x = 0; x <= 520; x += 4) {
    const dip = FEET.reduce((s, f) => s + 9 * Math.exp(-(((x - cx - f) / 10) ** 2)), 0);
    d += `${x ? 'L' : 'M'}${x} ${(FILM_Y + dip).toFixed(1)}`;
  }
  return d;
}
export function skaterLegs(cx: number): string {
  const by = FILM_Y - 44;
  const knees: XY[] = [[-66, by - 26], [-34, by - 20], [28, by - 22], [58, by - 30]];
  return FEET.map((f, i) => `M${cx + (i < 2 ? -8 : 14)} ${by + 4} L${cx + knees[i]![0]} ${knees[i]![1]} L${cx + f} ${FILM_Y + 7}`).join(' ');
}

// ---------- panel 2: xylem ----------
export const XY_X = 236; // vessel centre
export const XY_TOP = 74;
export const XY_BOT = 300;
export const XY_SP = 22;
export const XY_N = Math.floor((XY_BOT - XY_TOP) / XY_SP) + 1;

// ---------- panel 3: adhesion to a polar wall ----------
export const WALL_X = 96;
export const SITES = [116, 160, 204, 248, 292]; // y of polar groups on the wall
export function meniscus(rise: number): string {
  // water surface: flat at y=96 far from the wall, curving up to the wall
  let d = `M${WALL_X} ${(96 - rise).toFixed(1)}`;
  for (let x = WALL_X; x <= 500; x += 6) d += ` L${x} ${(96 - rise * Math.exp(-(x - WALL_X) / 34)).toFixed(1)}`;
  return d + ' L500 330 L96 330 Z';
}

// ---------- panel 4: capillary tubes and soil ----------
export const DISH_Y = 286;
export const TUBES = [{ x: 64, w: 36 }, { x: 138, w: 22 }, { x: 200, w: 12 }];
/** Rise height is inversely proportional to tube width (Jurin's law, same liquid and wall). */
export const riseOf = (w: number) => 1440 / w;
export function tubeWater(x: number, w: number, h: number): string {
  const top = DISH_Y - h;
  const m = Math.min(6, w / 3); // concave meniscus: water climbs the walls
  return `M${x} ${top - m} Q${x + w / 2} ${top + m} ${x + w} ${top - m} L${x + w} ${DISH_Y} L${x} ${DISH_Y} Z`;
}

export function create(svg: SVGSVGElement) {
  const q = <T extends Element = SVGElement>(k: string) => svg.querySelector<T>(`[data-el="${k}"]`)!;
  const all = <T extends Element = SVGElement>(k: string) => [...svg.querySelectorAll<T>(`[data-el="${k}"]`)];
  const panels = [0, 1, 2, 3, 4].map((i) => q<SVGGElement>(`p${i}`));
  const mols = all<SVGGElement>('sm');
  const bonds = all<SVGLineElement>('sb');
  const xmols = all<SVGCircleElement>('xm');
  const vapour = all<SVGCircleElement>('vap');
  const waters = all<SVGGElement>('aw');
  const adBonds = all<SVGLineElement>('ab');
  const tubes = all<SVGPathElement>('tw');
  const pos: XY[] = sheet.map((m) => [m.x, m.y]);

  const placeMol = (g: SVGGElement, x: number, y: number, b: number) => g.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${((b * 180) / Math.PI).toFixed(1)})`);

  function render(index: number, t: number) {
    panels.forEach((p, i) => p.style.display = i === index ? '' : 'none');
    const fade = ease(phase(t, 0, 0.15));
    panels[index]!.style.opacity = String(fade);

    if (index === 0) {
      sheet.forEach((m, i) => {
        const jx = 1.8 * Math.sin(t * 19 + i * 1.7), jy = 1.6 * Math.cos(t * 23 + i * 2.3);
        pos[i] = [m.x + jx, m.y + jy];
        placeMol(mols[i]!, pos[i]![0], pos[i]![1], SHEET_B);
      });
      sheetBonds.forEach(([d, a, k], n) => {
        const h = hydrogens(pos[d]![0], pos[d]![1], SHEET_B)[k];
        const l = bonds[n]!;
        const [ox, oy] = pos[a]!;
        const dx = ox - h[0], dy = oy - h[1], len = Math.hypot(dx, dy);
        l.setAttribute('x1', (h[0] + (dx / len) * 5).toFixed(1)); l.setAttribute('y1', (h[1] + (dy / len) * 5).toFixed(1));
        l.setAttribute('x2', (ox - (dx / len) * 9).toFixed(1)); l.setAttribute('y2', (oy - (dy / len) * 9).toFixed(1));
      });
      q('pulls').style.opacity = String(ease(phase(t, 0.25, 0.55)));
    }

    if (index === 1) {
      const cx = lerp(150, 360, ease(phase(t, 0.1, 0.95)));
      q('film').setAttribute('d', filmPath(cx));
      q('filmfill').setAttribute('d', `${filmPath(cx)} L520 340 L0 340 Z`);
      q('legs').setAttribute('d', skaterLegs(cx));
      q<SVGGElement>('skater').setAttribute('transform', `translate(${cx.toFixed(1)} 0)`);
    }

    if (index === 2) {
      // the column moves up at constant speed; molecules leave at the top into the leaf
      const shift = (t * 4 * XY_SP) % XY_SP;
      xmols.forEach((c, i) => c.setAttribute('cy', (XY_BOT - i * XY_SP - shift).toFixed(1)));
      q('xbonds').setAttribute('stroke-dashoffset', (-t * 4 * XY_SP).toFixed(1));
      vapour.forEach((v, i) => {
        const u = (t * 2.4 + i / vapour.length) % 1;
        // vapour leaves the leaf into the air above it
        v.setAttribute('cx', lerp(XY_X - 70 - 14 * i, XY_X - 110 - 22 * i, u).toFixed(1));
        v.setAttribute('cy', lerp(46, 6, u).toFixed(1));
        v.style.opacity = String(Math.min(1, 4 * u) * (1 - u));
      });
      q('tension').style.opacity = String(ease(phase(t, 0.15, 0.4)));
    }

    if (index === 3) {
      const u = ease(phase(t, 0.1, 0.8));
      waters.forEach((g, i) => {
        const y = SITES[i]!;
        // each water molecule moves in and points one δ+ H at the wall's δ− oxygen
        const x = lerp(WALL_X + 80 + (i % 2) * 18, WALL_X + 44, u);
        g.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${(180 + 52.25).toFixed(1)})`);
      });
      adBonds.forEach((l) => (l.style.opacity = String(ease(phase(t, 0.6, 0.85)))));
      q('meniscus').setAttribute('d', meniscus(30 * ease(phase(t, 0.35, 1))));
    }

    if (index === 4) {
      const u = ease(phase(t, 0.05, 0.85));
      tubes.forEach((p, i) => p.setAttribute('d', tubeWater(TUBES[i]!.x, TUBES[i]!.w, 4 + u * riseOf(TUBES[i]!.w))));
      q('soilwater').setAttribute('y', (DISH_Y - u * 180).toFixed(1));
      q('soilwater').setAttribute('height', (u * 180 + 30).toFixed(1));
    }
  }
  render(0, 0);
  return { render, durations: [5, 5, 6, 5, 5] };
}
