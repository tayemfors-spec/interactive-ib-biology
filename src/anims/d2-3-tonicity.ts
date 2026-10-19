import { ease, lerp, phase } from '../lib/timeline';

/**
 * Red blood cell and plant cell in isotonic, hypotonic and hypertonic solutions, then a freshwater
 * protist with contractile vacuoles (D2.3.3, D2.3.5, D2.3.6). Geometry and motion only: captions are
 * in visuals.yaml.
 */

export const RX = 130, RY = 190; // red blood cell centre
export const R0 = 46; // normal radius
export const PX = 390, PY = 190; // plant cell centre
export const PW = 140, PH = 112; // wall interior

const f1 = (n: number) => n.toFixed(1);

/** Deterministic pseudo-random numbers so the server-rendered SVG and the driver agree. */
function prng(seed: number) {
  let a = seed;
  return () => { a = (a * 16807) % 2147483647; return (a - 1) / 2147483646; };
}

/** Solute particles in the solution around each cell (shown in different numbers per solution). */
export const outsideDots: [number, number][] = (() => {
  const r = prng(11);
  const out: [number, number][] = [];
  while (out.length < 220) {
    const x = 14 + r() * 492, y = 78 + r() * 196;
    const nearRbc = Math.hypot(x - RX, y - RY) < R0 + 22;
    const nearPlant = Math.abs(x - PX) < PW / 2 + 22 && Math.abs(y - PY) < PH / 2 + 22;
    const nearArrows = (x > 26 && x < 92 && Math.abs(y - RY) < 30) || (x > 262 && x < 320 && Math.abs(y - PY) < 30);
    const divider = Math.abs(x - 260) < 6;
    if (!nearRbc && !nearPlant && !nearArrows && !divider) out.push([x, y]);
  }
  return out;
})();
/** Number of outside particles drawn in isotonic, hypotonic and hypertonic solutions. */
export const DOTS = { iso: 70, hypo: 14, hyper: 220 };

/** Solute particles inside each cell, as offsets from the centre in units of the cell size. */
export const insideDots: [number, number][] = [[-0.45, -0.3], [0.1, -0.5], [0.5, -0.1], [-0.15, 0.15], [0.35, 0.45], [-0.5, 0.45], [0.05, 0.62], [-0.62, -0.02]];

/** Haemoglobin released when the cell bursts: directions of spread. */
export const hbDots = Array.from({ length: 14 }, (_, i) => (i / 14) * Math.PI * 2 + (i % 2) * 0.2);

export function rbcPath(R: number, cren: number): string {
  let d = '';
  for (let i = 0; i <= 120; i++) {
    const a = (i / 120) * Math.PI * 2;
    const spike = Math.max(0, Math.cos(13 * a)) ** 6;
    const r = R * (1 - 0.05 * cren + 0.2 * cren * spike);
    d += `${i ? 'L' : 'M'}${f1(RX + r * Math.cos(a))} ${f1(RY + r * Math.sin(a))}`;
  }
  return d + 'Z';
}

/** Rounded rectangle centred on (cx, cy) whose sides bow outwards by `b`. */
export function roundRect(cx: number, cy: number, w: number, h: number, r: number, b = 0): string {
  r = Math.min(r, w / 2, h / 2);
  const x0 = cx - w / 2, x1 = cx + w / 2, y0 = cy - h / 2, y1 = cy + h / 2;
  return `M${f1(x0 + r)} ${f1(y0)} Q${f1(cx)} ${f1(y0 - b)} ${f1(x1 - r)} ${f1(y0)} Q${f1(x1)} ${f1(y0)} ${f1(x1)} ${f1(y0 + r)} ` +
    `Q${f1(x1 + b)} ${f1(cy)} ${f1(x1)} ${f1(y1 - r)} Q${f1(x1)} ${f1(y1)} ${f1(x1 - r)} ${f1(y1)} ` +
    `Q${f1(cx)} ${f1(y1 + b)} ${f1(x0 + r)} ${f1(y1)} Q${f1(x0)} ${f1(y1)} ${f1(x0)} ${f1(y1 - r)} ` +
    `Q${f1(x0 - b)} ${f1(cy)} ${f1(x0)} ${f1(y0 + r)} Q${f1(x0)} ${f1(y0)} ${f1(x0 + r)} ${f1(y0)} Z`;
}

export interface PlantShape { wall: string; proto: string; vac: string; nx: number; ny: number; w: number; h: number }

/** Plant cell at "turgor" u: 0 = plasmolysed, 1 = flaccid (protoplast just fills the wall), 1.5 = fully turgid. */
export function plantShape(u: number): PlantShape {
  const b = Math.max(0, u - 1) * 16; // the wall bows out under turgor pressure
  const grow = Math.max(0, u - 1) * 10;
  const wallPath = roundRect(PX, PY, PW + 12 + grow, PH + 12 + grow, 14, b);
  let w: number, h: number, r: number, pb: number;
  if (u >= 1) { w = PW + grow; h = PH + grow; r = 9; pb = b; }
  else { const k = ease(1 - u); w = lerp(PW, 82, k); h = lerp(PH, 64, k); r = lerp(9, 30, k); pb = 0; }
  return {
    wall: wallPath,
    proto: roundRect(PX, PY, w, h, r, pb),
    vac: roundRect(PX + 4, PY, w - 30, h - 24, Math.max(6, r - 4), pb * 0.8),
    nx: PX - w / 2 + 9, ny: PY - h / 2 + 14, w, h,
  };
}

export function create(svg: SVGSVGElement) {
  const q = <T extends Element>(k: string) => svg.querySelector<T>(`[data-el="${k}"]`)!;
  const all = <T extends Element>(k: string) => [...svg.querySelectorAll<T>(`[data-el="${k}"]`)];
  const cells = q<SVGGElement>('cells'), protist = q<SVGGElement>('protist');
  const rbc = q<SVGPathElement>('rbc'), pallor = q<SVGCircleElement>('pallor');
  const wall = q<SVGPathElement>('wall'), proto = q<SVGPathElement>('proto'), vac = q<SVGPathElement>('vac'), nuc = q<SVGCircleElement>('nuc');
  const odots = all<SVGCircleElement>('odot');
  const rdots = all<SVGCircleElement>('rdot'), pdots = all<SVGCircleElement>('pdot');
  const hb = all<SVGCircleElement>('hb');
  const heads = all<SVGGElement>('head'), rl = all<SVGTextElement>('rl'), pl = all<SVGTextElement>('pl');
  const gapNote = q<SVGGElement>('gap');
  const arrows = { rIn: q<SVGGElement>('r-in'), rOut: q<SVGGElement>('r-out'), pIn: q<SVGGElement>('p-in'), pOut: q<SVGGElement>('p-out') };
  const cvs = all<SVGGElement>('cv'), drops = all<SVGCircleElement>('drop'), canals = all<SVGGElement>('canals');
  const expelNote = q<SVGTextElement>('expel');

  const show = (els: Element[], i: number) => els.forEach((e, k) => ((e as SVGElement).style.display = k === i ? '' : 'none'));
  const arrow = (g: SVGGElement, x: number, y: number, s: number, flip: boolean) =>
    g.setAttribute('transform', `translate(${f1(x)} ${f1(y)}) scale(${flip ? -s : s} ${s})`);

  function render(index: number, t: number) {
    const onCells = index <= 3;
    cells.style.display = onCells ? '' : 'none';
    protist.style.display = onCells ? 'none' : '';

    if (onCells) {
      // ---- solution ----
      show(heads, index === 0 ? 0 : index <= 2 ? 1 : 2);
      const n = index === 0 ? DOTS.iso : index === 3 ? DOTS.hyper : DOTS.hypo;
      odots.forEach((d, k) => (d.style.display = k < n ? '' : 'none'));

      // ---- red blood cell ----
      let R = R0, pal = 1, cren = 0, burst = 0;
      if (index === 1) { const u = ease(t); R = lerp(R0, 58, u); pal = 1 - u; }
      if (index === 2) { R = 58; pal = 0; burst = ease(phase(t, 0.15, 0.8)); }
      if (index === 3) { const u = ease(t); R = lerp(R0, 40, u); cren = u; }
      rbc.setAttribute('d', rbcPath(R, cren));
      rbc.style.strokeDasharray = burst > 0 ? `${f1(60 - 40 * burst)} ${f1(30 * burst)}` : '';
      rbc.style.fillOpacity = String(1 - 0.75 * burst);
      pallor.setAttribute('r', f1(R * 0.42));
      pallor.style.opacity = String(pal * (1 - burst));
      rdots.forEach((d, k) => {
        const [dx, dy] = insideDots[k]!;
        d.setAttribute('cx', f1(RX + dx * R * 0.85)); d.setAttribute('cy', f1(RY + dy * R * 0.85));
        d.style.opacity = String(1 - burst);
      });
      hb.forEach((d, k) => {
        const a = hbDots[k]!, rr = lerp(10, R + 22 + (k % 3) * 8, burst);
        d.setAttribute('cx', f1(RX + rr * Math.cos(a))); d.setAttribute('cy', f1(RY + rr * Math.sin(a)));
        d.style.opacity = burst > 0.02 ? '1' : '0';
      });
      show(rl, index);

      // ---- plant cell ----
      let u = 1;
      if (index === 1) u = lerp(1, 1.5, ease(t));
      if (index === 2) u = 1.5;
      if (index === 3) u = lerp(1, 0, ease(t));
      const s = plantShape(u);
      wall.setAttribute('d', s.wall); proto.setAttribute('d', s.proto); vac.setAttribute('d', s.vac);
      nuc.setAttribute('cx', f1(s.nx)); nuc.setAttribute('cy', f1(s.ny));
      pdots.forEach((d, k) => {
        const [dx, dy] = insideDots[k]!;
        d.setAttribute('cx', f1(PX + 4 + dx * (s.w - 34) * 0.5)); d.setAttribute('cy', f1(PY + dy * (s.h - 28) * 0.5));
      });
      show(pl, index);
      gapNote.style.opacity = index === 3 ? String(phase(t, 0.6, 1)) : '0';

      // ---- water arrows: thickness shows how many water molecules cross each way ----
      const big = 1.35, mid = 0.9, small = 0.5;
      const [rin, rout] = index === 0 ? [mid, mid] : index === 3 ? [small, big] : [big, small];
      const [pinS, poutS] = index === 0 ? [mid, mid] : index === 1 ? [lerp(big, mid, ease(t)), lerp(small, mid, ease(t))] : index === 2 ? [mid, mid] : [small, big];
      const rEdge = RX - R - 8;
      arrow(arrows.rIn, rEdge - 40, RY - 13, rin, false);
      arrow(arrows.rOut, rEdge, RY + 13, rout, true);
      arrows.rIn.style.opacity = arrows.rOut.style.opacity = burst > 0.5 ? '0' : '1';
      const pEdge = PX - PW / 2 - 14;
      arrow(arrows.pIn, pEdge - 40, PY - 13, pinS, false);
      arrow(arrows.pOut, pEdge, PY + 13, poutS, true);
    } else {
      // ---- freshwater protist with contractile vacuoles ----
      const fill = index === 4 ? ease(t) : 1 - ease(phase(t, 0, 0.6));
      cvs.forEach((g) => g.setAttribute('transform', `scale(${f1(0.25 + 0.75 * fill)})`));
      canals.forEach((g) => (g.style.opacity = String(0.4 + 0.6 * (index === 4 ? 1 : 1 - fill))));
      const out = index === 5 ? ease(phase(t, 0.2, 1)) : 0;
      drops.forEach((d) => {
        const y0 = Number(d.dataset.y0);
        d.setAttribute('cy', f1(y0 - 34 * out));
        d.setAttribute('r', f1(4 + 8 * out));
        d.style.opacity = index === 5 ? String(Math.min(1, out * 3)) : '0';
      });
      expelNote.style.opacity = index === 5 ? String(phase(t, 0.5, 1)) : '0';
    }
  }
  render(0, 0);
  return { render, durations: [3, 3.5, 3.5, 4, 4, 3.5] };
}
