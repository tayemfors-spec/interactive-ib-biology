import { ease, lerp, phase } from '../lib/timeline';

/*
 * Cross-bridge cycle. The head pivots about its base B on the thick filament. When attached, its tip sits on
 * the line of binding sites (y = B.y − H), so as it swivels from +PHI (cocked, towards the Z-line) to −PHI
 * (towards the M-line) the tip — and the actin it holds — moves left by exactly one binding-site spacing.
 */
type XY = [number, number];
const BEAD = 23.25;
const SPACING = 4 * BEAD; // 93: one binding site to the next
const B: XY = [289.5, 287];
const H = 113;
const PHI = Math.atan(SPACING / 2 / H); // ≈ 22.4°
const DETACHED = 0.75; // reach of a detached head as a fraction of the attached reach
const TROPO_MOVED = -20; // tropomyosin shifts into the groove, uncovering the sites
const SR: XY[] = [[40, 44], [66, 50], [92, 42], [118, 50], [144, 44], [170, 50]];
// free positions kept clear of the myosin heads and stalks; the sixth ion stays free in the sarcoplasm
const FREE: XY[] = [[150, 200], [56, 262], [236, 206], [418, 196], [504, 198], [262, 96]];
// troponin each Ca²⁺ binds to (x at zero actin offset); the sixth ion stays free
const TN_X = [196, 103, 289, 382, 475];
const ATP_START: XY = [230, 330];
const PI_AWAY: XY = [250, 252];
const ADP_AWAY: XY = [196, 232];

export function create(svg: SVGSVGElement) {
  const el = (k: string) => svg.querySelector<SVGElement>(`[data-el="${k}"]`)!;
  const mix = (a: XY, b: XY, t: number): XY => [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];
  const move = (k: string, [x, y]: XY, opacity = 1) => {
    const g = el(k);
    g.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)})`);
    g.style.opacity = String(opacity);
  };
  const dot = (i: number, [x, y]: XY, opacity = 1) => {
    const c = el(`ca${i}`);
    c.setAttribute('cx', x.toFixed(1));
    c.setAttribute('cy', y.toFixed(1));
    c.style.opacity = String(opacity);
  };
  const line = (k: string, a: XY, b: XY) => el(k).setAttribute('d', `M${a[0].toFixed(1)} ${a[1].toFixed(1)} L${b[0].toFixed(1)} ${b[1].toFixed(1)}`);

  /** Draw the head at angle phi (rad, + = towards the Z-line) and reach (1 = touching the binding sites). Returns head geometry. */
  const head = (phi: number, reach: number) => {
    const len = (H / Math.cos(phi)) * reach;
    const u: XY = [Math.sin(phi), -Math.cos(phi)];
    const p: XY = [Math.cos(phi), Math.sin(phi)];
    const at = (f: number): XY => [B[0] + u[0] * len * f, B[1] + u[1] * len * f];
    const J = at(0.5);
    const C = at(0.76);
    line('neck', B, J);
    const h = el('head');
    h.setAttribute('cx', C[0].toFixed(1));
    h.setAttribute('cy', C[1].toFixed(1));
    h.setAttribute('ry', (0.26 * len).toFixed(1));
    h.setAttribute('transform', `rotate(${((phi * 180) / Math.PI).toFixed(2)} ${C[0].toFixed(1)} ${C[1].toFixed(1)})`);
    line('lHead', [372, 254], [C[0] + 13 * p[0], C[1] + 13 * p[1]]);
    return { adp: [C[0] + 34 * p[0], C[1] + 34 * p[1]] as XY, pi: [C[0] - 24 * p[0], C[1] - 24 * p[1]] as XY };
  };
  /** Actin offset (px, negative = towards the M-line) and tropomyosin shift. */
  const filament = (offset: number, shift: number) => {
    el('actin').setAttribute('transform', `translate(${offset.toFixed(1)} 0)`);
    el('tropo').setAttribute('transform', `translate(0 ${shift.toFixed(1)})`);
    line('lTropo', [92, 208], [64 + offset, 168 + shift]);
    line('lTn', [118, 234], [103 + offset, 184 + shift]);
    line('lSite', [440, 208], [429 + offset, 173]);
  };
  const bound = (i: number, offset: number, shift: number): XY => [TN_X[i]! + offset, 191 + shift];
  const counters = (strokes: number, atp: number) => {
    el('cStroke').textContent = `Power strokes: ${strokes}`;
    el('cATP').textContent = `ATP used by this head: ${atp}`;
  };
  const tokens = (h: { adp: XY; pi: XY }, adp: number, pi: number, label = 'ADP') => {
    move('adp', h.adp, adp);
    move('pi', h.pi, pi);
    el('adpT').textContent = label;
  };

  function render(index: number, t: number) {
    move('atp', ATP_START, 0);
    switch (index) {
      case 0: { // Ca²⁺ leaves the SR
        filament(0, 0);
        tokens(head(PHI, DETACHED), 1, 1);
        SR.forEach((p, i) => dot(i, mix(p, FREE[i]!, ease(phase(t, i * 0.06, 0.6 + i * 0.06)))));
        counters(0, 0);
        break;
      }
      case 1: { // Ca²⁺ binds troponin; tropomyosin uncovers the sites
        const shift = TROPO_MOVED * ease(phase(t, 0.45, 1));
        filament(0, shift);
        tokens(head(PHI, DETACHED), 1, 1);
        FREE.forEach((p, i) => dot(i, i < 5 ? mix(p, bound(i, 0, shift), ease(phase(t, 0, 0.45))) : p));
        counters(0, 0);
        break;
      }
      case 2: { // the cocked head binds: a cross-bridge
        filament(0, TROPO_MOVED);
        tokens(head(PHI, lerp(DETACHED, 1, ease(phase(t, 0.1, 0.8)))), 1, 1);
        FREE.forEach((p, i) => dot(i, i < 5 ? bound(i, 0, TROPO_MOVED) : p));
        counters(0, 0);
        break;
      }
      case 3: { // Pi leaves, power stroke, ADP leaves
        const s = ease(phase(t, 0.2, 0.8));
        const phi = lerp(PHI, -PHI, s);
        const offset = H * (Math.tan(phi) - Math.tan(PHI)); // the tip stays on its binding site
        filament(offset, TROPO_MOVED);
        const h = head(phi, 1);
        const piGo = ease(phase(t, 0, 0.25));
        const adpGo = ease(phase(t, 0.8, 1));
        move('pi', mix(h.pi, PI_AWAY, piGo), 1 - piGo);
        move('adp', mix(h.adp, ADP_AWAY, adpGo), 1 - adpGo);
        el('adpT').textContent = 'ADP';
        FREE.forEach((p, i) => dot(i, i < 5 ? bound(i, offset, TROPO_MOVED) : p));
        counters(t > 0.8 ? 1 : 0, 0);
        break;
      }
      case 4: { // ATP binds; the head lets go
        filament(-SPACING, TROPO_MOVED);
        const h = head(-PHI, lerp(1, DETACHED, ease(phase(t, 0.5, 1))));
        tokens(h, 0, 0);
        move('atp', mix(ATP_START, h.adp, ease(phase(t, 0, 0.5))), 1);
        FREE.forEach((p, i) => dot(i, i < 5 ? bound(i, -SPACING, TROPO_MOVED) : p));
        counters(1, 0);
        break;
      }
      case 5: { // ATP → ADP + Pi; the head re-cocks opposite the next site
        filament(-SPACING, TROPO_MOVED);
        const split = t >= 0.3;
        const h = head(lerp(-PHI, PHI, ease(phase(t, 0.3, 1))), DETACHED);
        if (split) tokens(h, 1, 1);
        else { tokens(h, 0, 0); move('atp', h.adp, 1); }
        FREE.forEach((p, i) => dot(i, i < 5 ? bound(i, -SPACING, TROPO_MOVED) : p));
        counters(1, split ? 1 : 0);
        break;
      }
      default: { // 6: Ca²⁺ pumped back; tropomyosin covers the sites again
        const shift = TROPO_MOVED * (1 - ease(phase(t, 0.45, 1)));
        filament(-SPACING, shift);
        tokens(head(PHI, DETACHED), 1, 1);
        FREE.forEach((p, i) => {
          const from = i < 5 ? bound(i, -SPACING, TROPO_MOVED) : p;
          dot(i, mix(from, SR[i]!, ease(phase(t, i * 0.05, 0.55 + i * 0.05))));
        });
        counters(1, 1);
      }
    }
  }
  render(0, 0);
  return { render, durations: [3.5, 4, 3, 5, 3.5, 4, 4.5] };
}
