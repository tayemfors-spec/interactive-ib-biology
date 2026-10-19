import { ease, lerp, phase } from '../lib/timeline';

/*
 * Calvin cycle for three turns (3 CO₂):
 *   0 start          3 RuBP in the stroma, 3 CO₂ diffuse in
 *   1 fixation       3 RuBP + 3 CO₂ → 6 GP (Rubisco)
 *   2 reduction      6 GP + 6 ATP + 6 reduced NADP → 6 TP
 *   3 one TP leaves  1 TP is the net product of 3 turns
 *   4 regeneration   5 TP + 3 ATP → 3 RuBP
 *   5 glucose        2 TP (from 6 turns) → glucose; totals for 6 turns
 */
type XY = [number, number];
const RUBP_POOL: XY[] = [[40, 214], [40, 236], [40, 258]];
const CO2_START: XY[] = [[44, 44], [80, 58], [116, 44]];
const CO2_WAIT: XY[] = [[124, 40], [156, 54], [188, 40]];
const RUBISCO: XY = [230, 92];
const GP_POOL: XY[] = [[330, 180], [372, 180], [330, 202], [372, 202], [330, 224], [372, 224]];
const TP_POOL: XY[] = [[322, 322], [364, 322], [322, 344], [364, 344], [322, 366], [364, 366]];
const EXPORT: XY = [498, 362];
const EXPORT2: XY = [498, 342];
const GLUCOSE: XY = [528, 300];
const REGEN: XY = [190, 366];
const W5 = 48, W3 = 24; // glyph widths (left dot centre to right dot centre)

export function create(svg: SVGSVGElement) {
  const el = (k: string) => svg.querySelector<SVGGElement>(`[data-el="${k}"]`)!;
  const mix = (a: XY, b: XY, t: number): XY => [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];
  const at = (k: string, [x, y]: XY, opacity = 1) => {
    const g = el(k);
    g.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)})`);
    g.style.opacity = String(opacity);
  };
  const hide = (k: string) => (el(k).style.opacity = '0');
  const show = (k: string, o: number) => (el(k).style.opacity = String(o));
  const centred = ([x, y]: XY, w: number): XY => [x - w / 2, y];
  const counters = (co2: number, atp: number, nadph: number, tp: number, head = 'Totals (3 turns)') => {
    el('cHead').textContent = head;
    el('cCO2').textContent = `CO₂ fixed: ${co2}`;
    el('cATP').textContent = `ATP used: ${atp}`;
    el('cNADPH').textContent = `reduced NADP used: ${nadph}`;
    el('cTP').textContent = `TP leaving cycle: ${tp}`;
  };
  const allHidden = () => {
    for (let i = 1; i <= 3; i++) { hide(`co2-${i}`); hide(`rubp-${i}`); }
    for (let i = 1; i <= 6; i++) hide(`gp-${i}`);
    for (let i = 1; i <= 7; i++) hide(`tp-${i}`);
    ['glucose', 'inReduce', 'inRegen', 'summary'].forEach(hide);
  };
  const rubpInPool = () => RUBP_POOL.forEach((p, i) => at(`rubp-${i + 1}`, p));
  const tpInPool = (except: number[] = []) => TP_POOL.forEach((p, i) => { if (!except.includes(i + 1)) at(`tp-${i + 1}`, p); });

  function render(index: number, t: number) {
    allHidden();
    switch (index) {
      case 0: // start: RuBP waiting, CO₂ diffusing in from the air spaces
        rubpInPool();
        CO2_START.forEach((p, i) => at(`co2-${i + 1}`, mix(p, CO2_WAIT[i]!, ease(phase(t, i * 0.1, 0.7 + i * 0.1)))));
        counters(0, 0, 0, 0);
        break;
      case 1: { // fixation by Rubisco: RuBP + CO₂ → unstable 6C → 2 GP
        const fuse = phase(t, 0.42, 0.5);
        RUBP_POOL.forEach((p, i) => at(`rubp-${i + 1}`, mix(p, centred(RUBISCO, W5), ease(phase(t, 0, 0.42))), 1 - fuse));
        CO2_WAIT.forEach((p, i) => at(`co2-${i + 1}`, mix(p, RUBISCO, ease(phase(t, 0.05, 0.42))), 1 - fuse));
        GP_POOL.forEach((p, i) => at(`gp-${i + 1}`, mix(centred(RUBISCO, W3), p, ease(phase(t, 0.5 + i * 0.05, 0.75 + i * 0.04))), phase(t, 0.46, 0.52)));
        counters(t >= 0.5 ? 3 : 0, 0, 0, 0);
        break;
      }
      case 2: { // reduction: GP → TP using ATP and reduced NADP
        const swap = phase(t, 0.12, 0.22);
        GP_POOL.forEach((p, i) => at(`gp-${i + 1}`, p, 1 - swap));
        TP_POOL.forEach((p, i) => at(`tp-${i + 1}`, mix(GP_POOL[i]!, p, ease(phase(t, 0.25 + i * 0.04, 0.75 + i * 0.04))), swap));
        show('inReduce', phase(t, 0, 0.15));
        counters(3, t >= 0.5 ? 6 : 0, t >= 0.5 ? 6 : 0, 0);
        break;
      }
      case 3: // one of six TP leaves the cycle
        tpInPool([6]);
        at('tp-6', mix(TP_POOL[5]!, EXPORT, ease(phase(t, 0.1, 0.8))));
        counters(3, 6, 6, t >= 0.8 ? 1 : 0);
        break;
      case 4: { // regeneration: 5 TP + 3 ATP → 3 RuBP
        const merge = phase(t, 0.42, 0.5);
        for (let i = 0; i < 5; i++) at(`tp-${i + 1}`, mix(TP_POOL[i]!, centred(REGEN, W3), ease(phase(t, i * 0.04, 0.4))), 1 - merge);
        at('tp-6', EXPORT);
        RUBP_POOL.forEach((p, i) => at(`rubp-${i + 1}`, mix(centred(REGEN, W5), p, ease(phase(t, 0.5 + i * 0.06, 0.85 + i * 0.05))), phase(t, 0.46, 0.52)));
        show('inRegen', phase(t, 0, 0.15));
        counters(3, t >= 0.5 ? 9 : 6, 6, 1);
        break;
      }
      default: { // 5: two TP (from six turns) make one glucose
        rubpInPool();
        const join = phase(t, 0.55, 0.65);
        at('tp-6', mix(EXPORT, centred(GLUCOSE, W3), ease(phase(t, 0.2, 0.55))), 1 - join);
        at('tp-7', mix(EXPORT2, centred(GLUCOSE, W3), ease(phase(t, 0.25, 0.55))), phase(t, 0, 0.15) * (1 - join));
        at('glucose', GLUCOSE, phase(t, 0.6, 0.7));
        show('summary', phase(t, 0.3, 0.45));
        counters(6, 18, 12, 2, 'Totals (6 turns)');
      }
    }
  }
  render(0, 0);
  return { render, durations: [3.5, 5, 5, 3.5, 5, 5] };
}
