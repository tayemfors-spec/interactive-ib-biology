import { ease, lerp, phase } from '../lib/timeline';

type XY = [number, number];
const PANELS = ['p0', 'p1', 'gut', 'gut', 'gut', 'p5', 'p6', 'p7'];

// 1 photoautotroph
const PH_END: XY[] = [[222, 140], [296, 128], [330, 186]];
const C_START: XY[] = [[40, 230], [70, 250], [40, 270]];
const C_END: XY[] = [[214, 200], [250, 160], [320, 214]];
const W_START: XY[] = [[120, 300], [150, 290]];
const W_END: XY[] = [[230, 226], [300, 222]];
const O_START: XY = [360, 110];
const O_END: XY[] = [[420, 72], [462, 96]];
// 2 chemoautotroph
const FE_START: XY[] = [[40, 120], [40, 150], [40, 180]];
const FE_END: XY[] = [[452, 82], [482, 92], [462, 116]];
const K_START: XY[] = [[70, 270], [110, 280]];
const K_END: XY[] = [[230, 186], [310, 186]];
// 3–5 holozoic
const MOUTH: XY = [92, 146];
const GUT_MID: XY = [200, 146];
const M_GUT: XY[] = [[184, 132], [214, 160], [236, 136], [258, 158], [280, 140]];
const M_BLOOD: XY[] = [[246, 224], [272, 224], [298, 224], [324, 224], [350, 224]];
const M_BODY: XY[] = [[420, 288], [436, 280], [452, 288], [468, 280], [484, 288]];
const FIBRE_GUT: XY = [262, 148];
const FIBRE_OUT: XY = [500, 148];
// 6 Euglena
const E_START: XY[] = [[40, 250], [80, 270], [200, 262]];
const E_END: XY[] = [[96, 170], [128, 160], [160, 176]];
const D_START: XY[] = [[300, 250], [340, 272], [430, 268], [480, 250]];
const D_END: XY[] = [[350, 168], [378, 176], [404, 160], [428, 170]];
// 7 saprotroph
const Z_START: XY = [336, 248];
const Z_END: XY[] = [[372, 230], [400, 262], [432, 236], [462, 258]];
const Q_LEAF: XY[] = [[384, 270], [416, 246], [446, 272], [470, 244], [394, 222]];
const Q_HYPHA: XY[] = [[300, 248], [270, 244], [240, 252], [210, 244], [180, 250]];

export function create(svg: SVGSVGElement) {
  const el = (k: string) => svg.querySelector<SVGElement>(`[data-el="${k}"]`)!;
  const op = (k: string, v: number) => (el(k).style.opacity = String(v));
  const at = (k: string, [x, y]: XY, o = 1, s = 1) => {
    const g = el(k);
    g.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)})${s !== 1 ? ` scale(${s.toFixed(3)})` : ''}`);
    g.style.opacity = String(o);
  };
  const mix = (a: XY, b: XY, t: number): XY => [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];
  const stages = (on: number[]) => [1, 2, 3, 4, 5].forEach((n) => el(`L${n}`).classList.toggle('on', on.includes(n)));

  function render(index: number, t: number) {
    const panel = PANELS[index] ?? 'p0';
    for (const p of new Set(PANELS)) op(p, p === panel ? 1 : 0);
    switch (index) {
      case 0: {
        [0, 1, 2].forEach((i) => at(`ph${i + 1}`, mix([96, 96], PH_END[i]!, ease(phase(t, i * 0.1, 0.45 + i * 0.1)))));
        [0, 1, 2].forEach((i) => at(`c${i + 1}`, mix(C_START[i]!, C_END[i]!, ease(phase(t, 0.1 + i * 0.08, 0.55 + i * 0.08)))));
        [0, 1].forEach((i) => at(`w${i + 1}`, mix(W_START[i]!, W_END[i]!, ease(phase(t, 0.15 + i * 0.1, 0.6 + i * 0.1)))));
        const made = ease(phase(t, 0.6, 0.85));
        op('sugar', made); op('sugarLab', made); op('sugarLab2', made);
        [0, 1].forEach((i) => at(`o${i + 1}`, mix(O_START, O_END[i]!, ease(phase(t, 0.65 + i * 0.08, 0.92 + i * 0.08))), phase(t, 0.62, 0.7)));
        break;
      }
      case 1: {
        [0, 1, 2].forEach((i) => {
          const u = ease(phase(t, i * 0.1, 0.6 + i * 0.1));
          at(`fe${i + 1}`, mix(FE_START[i]!, FE_END[i]!, u));
          el(`fet${i + 1}`).textContent = u > 0.5 ? 'Fe³⁺' : 'Fe²⁺';
        });
        op('energy', ease(phase(t, 0.3, 0.5)));
        [0, 1].forEach((i) => at(`k${i + 1}`, mix(K_START[i]!, K_END[i]!, ease(phase(t, 0.35 + i * 0.1, 0.75 + i * 0.1)))));
        const made = ease(phase(t, 0.75, 0.95));
        op('org', made); op('orgLab', made);
        break;
      }
      case 2: {
        stages([1, 2]);
        const inn = ease(phase(t, 0, 0.3));
        const along = ease(phase(t, 0.3, 0.55));
        const dig = ease(phase(t, 0.55, 0.9));
        const p = along > 0 ? mix(MOUTH, GUT_MID, along) : mix([24, 146], MOUTH, inn);
        at('food', p, 1 - dig, 1 - 0.7 * dig);
        M_GUT.forEach((q, i) => at(`m${i + 1}`, mix(GUT_MID, q, dig), dig));
        at('fibre', mix(GUT_MID, FIBRE_GUT, dig), dig);
        op('chain', 0);
        break;
      }
      case 3: {
        stages([3, 4]);
        at('food', GUT_MID, 0);
        at('fibre', FIBRE_GUT);
        const down = ease(phase(t, 0, 0.35));
        const along = ease(phase(t, 0.4, 0.75));
        const join = ease(phase(t, 0.78, 1));
        M_GUT.forEach((q, i) => {
          const p = along > 0 ? mix(M_BLOOD[i]!, M_BODY[i]!, along) : mix(q, M_BLOOD[i]!, down);
          at(`m${i + 1}`, p, 1 - join);
        });
        op('chain', join);
        break;
      }
      case 4: {
        stages([5]);
        at('food', GUT_MID, 0);
        M_BODY.forEach((q, i) => at(`m${i + 1}`, q, 0));
        op('chain', 1);
        at('fibre', mix(FIBRE_GUT, FIBRE_OUT, ease(phase(t, 0, 0.85))));
        break;
      }
      case 5: {
        [0, 1, 2].forEach((i) => at(`e${i + 1}`, mix(E_START[i]!, E_END[i]!, ease(phase(t, i * 0.08, 0.4 + i * 0.08))), 1 - 0.6 * phase(t, 0.45, 0.55)));
        const dark = ease(phase(t, 0.4, 0.6));
        op('dark', 0.15 + 0.85 * dark);
        op('darkLab', dark);
        [0, 1, 2, 3].forEach((i) => at(`d${i + 1}`, mix(D_START[i]!, D_END[i]!, ease(phase(t, 0.6 + i * 0.05, 0.9 + i * 0.03))), dark));
        break;
      }
      case 6: {
        [0, 1, 2, 3].forEach((i) => at(`z${i + 1}`, mix(Z_START, Z_END[i]!, ease(phase(t, i * 0.08, 0.4 + i * 0.08)))));
        op('enzLab', ease(phase(t, 0.2, 0.35)));
        const appear = ease(phase(t, 0.45, 0.55));
        [0, 1, 2, 3, 4].forEach((i) => at(`q${i + 1}`, mix(Q_LEAF[i]!, Q_HYPHA[i]!, ease(phase(t, 0.55 + i * 0.04, 0.85 + i * 0.03))), appear));
        op('absLab', ease(phase(t, 0.6, 0.75)));
        break;
      }
      default: {
        op('atp', ease(phase(t, 0.15, 0.3)));
        op('src1', ease(phase(t, 0, 0.25)));
        op('src2', ease(phase(t, 0.3, 0.55)));
        op('src3', ease(phase(t, 0.6, 0.85)));
      }
    }
  }
  render(0, 0);
  return { render, durations: [4.5, 4.5, 4.5, 4.5, 3.5, 5, 4.5, 4] };
}
