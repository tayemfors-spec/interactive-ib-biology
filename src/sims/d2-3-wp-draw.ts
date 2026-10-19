/**
 * SVG markup for the D2.3 water potential simulation (a plant cell and its surroundings), shared by
 * the server render and the browser update. Colours come from global classes in d2-3-water-potential.astro.
 */
import { fmtKPa, netMovement, type CellCondition } from './models/d2-3-water-potential';

export type Mode = 'solution' | 'xylem';

export interface WpView {
  mode: Mode;
  v: number; // relative volume (1 = incipient plasmolysis)
  psiS: number; psiP: number; psi: number;
  outS: number; outP: number; out: number;
  condition: CellCondition;
}

export const conditionText: Record<CellCondition, string> = {
  'fully-turgid': 'fully turgid',
  turgid: 'turgid',
  incipient: 'flaccid (incipient plasmolysis)',
  plasmolysed: 'plasmolysed',
};

const f1 = (n: number) => n.toFixed(1);

/** Rounded rectangle path centred on (cx, cy); `bulge` bows each side outwards. */
function roundRect(cx: number, cy: number, w: number, h: number, r: number, bulge = 0): string {
  r = Math.min(r, w / 2, h / 2);
  const x0 = cx - w / 2, x1 = cx + w / 2, y0 = cy - h / 2, y1 = cy + h / 2;
  return `M${f1(x0 + r)} ${f1(y0)} Q${f1(cx)} ${f1(y0 - bulge)} ${f1(x1 - r)} ${f1(y0)} Q${f1(x1)} ${f1(y0)} ${f1(x1)} ${f1(y0 + r)} ` +
    `Q${f1(x1 + bulge)} ${f1(cy)} ${f1(x1)} ${f1(y1 - r)} Q${f1(x1)} ${f1(y1)} ${f1(x1 - r)} ${f1(y1)} ` +
    `Q${f1(cx)} ${f1(y1 + bulge)} ${f1(x0 + r)} ${f1(y1)} Q${f1(x0)} ${f1(y1)} ${f1(x0)} ${f1(y1 - r)} ` +
    `Q${f1(x0 - bulge)} ${f1(cy)} ${f1(x0)} ${f1(y0 + r)} Q${f1(x0)} ${f1(y0)} ${f1(x0 + r)} ${f1(y0)} Z`;
}

const CX = 170, CY = 150, W = 190, H = 140; // wall interior at v = 1

export function wpDiagram(s: WpView): string {
  const p: string[] = [];
  // surroundings
  if (s.mode === 'solution') {
    p.push(`<rect class="sol" x="8" y="8" width="504" height="304" rx="14"/>`);
    p.push(`<text class="hd" x="24" y="34">Bathing solution (open, so ψp = 0)</text>`);
  } else {
    p.push(`<rect class="tissue" x="8" y="8" width="504" height="304" rx="14"/>`);
    p.push(`<rect class="xylem" x="398" y="8" width="96" height="304"/>`);
    for (let y = 22; y < 312; y += 22) p.push(`<rect class="lignin" x="398" y="${y}" width="96" height="5"/>`);
    p.push(`<rect class="sap" x="410" y="8" width="72" height="304"/>`);
    p.push(`<text class="hd" x="24" y="34">Plant cell next to a xylem vessel</text>`);
    p.push(`<text class="lbl" x="446" y="300" text-anchor="middle">xylem sap</text>`);
  }

  // cell: wall bows out under turgor; protoplast shrinks away from the wall when plasmolysed
  const ex = Math.max(0, s.v - 1) * 4; // exaggerate the small turgid swelling so it is visible
  const bulge = Math.min(14, ex * 40);
  const wallW = W * (1 + ex * 0.25), wallH = H * (1 + ex * 0.25);
  p.push(`<path class="wall" d="${roundRect(CX, CY, wallW + 14, wallH + 14, 16, bulge)}"/>`);
  if (s.v >= 1) {
    p.push(`<path class="proto" d="${roundRect(CX, CY, wallW, wallH, 12, bulge)}"/>`);
    p.push(`<path class="vac" d="${roundRect(CX, CY, wallW - 40, wallH - 36, 14, bulge * 0.8)}"/>`);
  } else {
    const k = Math.max(0.4, s.v ** 0.75); // linear shrink, exaggerated for visibility
    const w = W * k, h = H * k, r = Math.min(w, h) * 0.45;
    p.push(`<path class="proto" d="${roundRect(CX, CY, w, h, r)}"/>`);
    p.push(`<path class="vac" d="${roundRect(CX, CY, Math.max(10, w - 34), Math.max(10, h - 30), r * 0.8)}"/>`);
    p.push(`<text class="lbl gap" x="${CX}" y="${f1(CY - H / 2 + 14)}" text-anchor="middle">${s.mode === 'solution' ? 'solution fills the gap' : 'gap outside the membrane'}</text>`);
  }
  p.push(`<text class="lbl" x="${CX}" y="${CY + 5}" text-anchor="middle">vacuole</text>`);

  // values
  const n = (k: number) => { const r = Math.round(k); return r < 0 ? `−${-r}` : String(r); };
  p.push(`<text class="val" x="${CX}" y="${CY + H / 2 + 36}" text-anchor="middle">Cell: ψs (${n(s.psiS)}) + ψp (${n(s.psiP)})</text>`);
  p.push(`<text class="val strong" x="${CX}" y="${CY + H / 2 + 58}" text-anchor="middle">ψ = ${fmtKPa(s.psi)} · ${conditionText[s.condition]}</text>`);
  const ox = s.mode === 'solution' ? 420 : 446;
  p.push(`<text class="val strong" x="${ox}" y="${s.mode === 'solution' ? 100 : 70}" text-anchor="middle">ψ = ${fmtKPa(s.out)}</text>`);
  const n2 = (k: number) => { const r = Math.round(k); return r < 0 ? `−${-r}` : String(r); };
  if (s.mode === 'xylem') { p.push(`<text class="val" x="${ox}" y="94" text-anchor="middle">ψs ${n2(s.outS)}</text>`); p.push(`<text class="val" x="${ox}" y="114" text-anchor="middle">ψp ${n2(s.outP)}</text>`); }
  else p.push(`<text class="val" x="${ox}" y="122" text-anchor="middle">ψs ${fmtKPa(s.outS)}</text>`);

  // net movement arrow between the cell and the surroundings
  const dir = netMovement(s.psi, s.out);
  const ax0 = 290, ax1 = s.mode === 'solution' ? 380 : 386, ay = 180;
  if (dir === 'none') {
    p.push(`<path class="eq" d="M${ax0} ${ay - 7} H${ax1} M${ax1 - 9} ${ay - 14} L${ax1} ${ay - 7} L${ax1 - 9} ${ay} M${ax0} ${ay + 7} H${ax1} M${ax0 + 9} ${ay} L${ax0} ${ay + 7} L${ax0 + 9} ${ay + 14}"/>`);
    p.push(`<text class="lbl" x="${(ax0 + ax1) / 2}" y="${ay + 34}" text-anchor="middle">no net movement</text>`);
  } else {
    const wdt = Math.min(16, 4 + Math.abs(s.psi - s.out) / 80);
    const [a, b] = dir === 'into-cell' ? [ax1, ax0] : [ax0, ax1];
    const sgn = Math.sign(b - a);
    p.push(`<path class="arrow" stroke-width="${f1(wdt)}" d="M${a} ${ay} H${f1(b - sgn * (wdt + 8))}"/>`);
    p.push(`<path class="arrowhead" d="M${f1(b)} ${ay} L${f1(b - sgn * (wdt + 12))} ${f1(ay - wdt - 4)} L${f1(b - sgn * (wdt + 12))} ${f1(ay + wdt + 4)} Z"/>`);
    p.push(`<text class="lbl" x="${(ax0 + ax1) / 2}" y="${ay + 40}" text-anchor="middle">net water ${dir === 'into-cell' ? 'in' : 'out'}</text>`);
  }
  return p.join('');
}
