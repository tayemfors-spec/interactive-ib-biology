import { ease, lerp, phase } from '../lib/timeline';

type XY = [number, number];
const POCKET_NA: XY[] = [[250, 186], [270, 186], [260, 160]];
const POCKET_K: XY[] = [[251, 172], [270, 172]];
const IN_NA: XY[] = [[190, 296], [260, 306], [330, 292]];
const OUT_NA: XY[] = [[196, 52], [262, 40], [326, 58]];
const OUT_K: XY[] = [[214, 48], [306, 48]];
const IN_K: XY[] = [[210, 300], [300, 306]];
const ATP_START: XY = [440, 290];
const PUMP_SITE: XY = [300, 252];
const ADP_END: XY = [470, 312];
const PI_END: XY = [420, 310];

export function create(svg: SVGSVGElement) {
  const el = (k: string) => svg.querySelector<SVGGElement>(`[data-el="${k}"]`)!;
  const at = (k: string, [x, y]: XY, show = true) => {
    const g = el(k);
    g.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)})`);
    g.style.opacity = show ? '1' : '0';
  };
  const mix = (a: XY, b: XY, t: number): XY => [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];
  /** s = 1: open to the cytoplasm; s = 0: open to the outside. */
  const shape = (s: number) => {
    const a = lerp(-8, 8, s);
    el('left').setAttribute('transform', `rotate(${a} 223 171)`);
    el('right').setAttribute('transform', `rotate(${-a} 297 171)`);
    el('gateTop').style.opacity = String(lerp(0.12, 1, s));
    el('gateBot').style.opacity = String(lerp(1, 0.12, s));
  };
  const counters = (na: number, k: number, atp: number) => {
    el('cNa').textContent = `Na⁺ moved out: ${na}`;
    el('cK').textContent = `K⁺ moved in: ${k}`;
    el('cATP').textContent = `ATP used: ${atp}`;
  };

  function render(index: number, t: number) {
    const e = ease(t);
    // defaults: hide energy carriers unless a step uses them
    at('atp', ATP_START, false); at('adp', ADP_END, false); at('pi', PUMP_SITE, false);
    switch (index) {
      case 0: // 3 Na⁺ bind from the cytoplasm
        shape(1);
        [0, 1, 2].forEach((i) => at(`na${i + 1}`, mix(IN_NA[i]!, POCKET_NA[i]!, ease(phase(t, i * 0.15, 0.6 + i * 0.15)))));
        OUT_K.forEach((p, i) => at(`k${i + 1}`, p));
        at('atp', ATP_START);
        counters(0, 0, 0);
        break;
      case 1: // ATP phosphorylates the pump; ADP leaves
        shape(1);
        POCKET_NA.forEach((p, i) => at(`na${i + 1}`, p));
        OUT_K.forEach((p, i) => at(`k${i + 1}`, p));
        at('atp', mix(ATP_START, PUMP_SITE, ease(phase(t, 0, 0.5))), t < 0.55);
        at('adp', mix(PUMP_SITE, ADP_END, ease(phase(t, 0.55, 1))), t >= 0.55);
        at('pi', PUMP_SITE, t >= 0.55);
        counters(0, 0, t >= 0.55 ? 1 : 0);
        break;
      case 2: // shape change; Na⁺ released outside
        shape(1 - ease(phase(t, 0, 0.4)));
        [0, 1, 2].forEach((i) => at(`na${i + 1}`, mix(POCKET_NA[i]!, OUT_NA[i]!, ease(phase(t, 0.4 + i * 0.08, 0.85 + i * 0.05)))));
        OUT_K.forEach((p, i) => at(`k${i + 1}`, p));
        at('pi', PUMP_SITE);
        counters(t > 0.9 ? 3 : 0, 0, 1);
        break;
      case 3: // 2 K⁺ bind from outside
        shape(0);
        OUT_NA.forEach((p, i) => at(`na${i + 1}`, p));
        [0, 1].forEach((i) => at(`k${i + 1}`, mix(OUT_K[i]!, POCKET_K[i]!, ease(phase(t, i * 0.15, 0.7 + i * 0.15)))));
        at('pi', PUMP_SITE);
        counters(3, 0, 1);
        break;
      case 4: // phosphate released; pump returns to the inward-open shape
        OUT_NA.forEach((p, i) => at(`na${i + 1}`, p));
        POCKET_K.forEach((p, i) => at(`k${i + 1}`, p));
        at('pi', mix(PUMP_SITE, PI_END, ease(phase(t, 0, 0.45))));
        shape(ease(phase(t, 0.45, 1)));
        counters(3, 0, 1);
        break;
      default: // 5: K⁺ released into the cytoplasm
        shape(1);
        OUT_NA.forEach((p, i) => at(`na${i + 1}`, p));
        [0, 1].forEach((i) => at(`k${i + 1}`, mix(POCKET_K[i]!, IN_K[i]!, ease(phase(t, i * 0.12, 0.75 + i * 0.12)))));
        counters(3, t > 0.85 ? 2 : 0, 1);
    }
    void e;
  }
  render(0, 0);
  return { render, durations: [3.5, 3.5, 4, 3.5, 3.5, 3.5] };
}
