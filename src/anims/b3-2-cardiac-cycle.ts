import { ease, lerp, phase } from '../lib/timeline';
import { CYCLE, STAGES, ao, la, lv, valves } from '../sims/models/b3-2-cardiac';

const G = { left: 52, right: 546, top: 300, bottom: 528, pMax: 130 };
const gx = (t: number) => G.left + (t / CYCLE) * (G.right - G.left);
const gy = (p: number) => G.bottom - (p / G.pMax) * (G.bottom - G.top);
const NAMES = ['Atrial systole', 'Ventricular systole (start)', 'Ventricular systole: ejection', 'Diastole (start)', 'Diastole: filling'];
const EVENTS: [string, number][] = [['e1', 0.1025], ['e2', 0.15], ['e3', 0.4], ['e4', 0.469]];

export function create(svg: SVGSVGElement) {
  const el = <T extends SVGElement = SVGElement>(k: string) => svg.querySelector<T>(`[data-el="${k}"]`)!;
  const rot = (k: string, x: number, y: number, a: number) => el(k).setAttribute('transform', `translate(${x} ${y}) rotate(${a.toFixed(1)})`);
  const scaleAbout = (k: string, s: number, cx: number, cy: number) =>
    el(k).setAttribute('transform', `translate(${cx} ${cy}) scale(${s.toFixed(4)}) translate(${-cx} ${-cy})`);
  const pill = (box: string, text: string, name: string, open: boolean) => {
    el(box).classList.toggle('open', open);
    el(box).classList.toggle('closed', !open);
    el(text).textContent = `${name}: ${open ? 'OPEN' : 'CLOSED'}`;
  };

  function render(index: number, t: number) {
    const st = STAGES[index]!;
    const time = lerp(st.from, st.to, t);
    const v = valves(time);
    // valve flaps: animate briefly towards the state the pressures dictate
    const av = v.av ? 1 : 0, sl = v.sl ? 1 : 0;
    rot('avL', 143, 121, lerp(4, 80, av));
    rot('avR', 218, 121, lerp(176, 100, av));
    rot('slL', 112, 116, lerp(-14, -84, sl));
    rot('slR', 138, 116, lerp(-166, -96, sl));
    pill('avBox', 'avText', 'Bicuspid (AV) valve', v.av);
    pill('slBox', 'slText', 'Aortic (semilunar) valve', v.sl);

    // chamber contraction: atria squeeze in atrial systole, ventricle in ventricular systole
    const atr = time < 0.1 ? Math.sin((Math.PI * time) / 0.1) : 0;
    scaleAbout('atrium', 1 - 0.07 * atr, 190, 86);
    const ven = time >= 0.1 && time < 0.4 ? Math.sin((Math.PI * (time - 0.1)) / 0.3) : 0;
    scaleAbout('ventricle', 1 - 0.08 * ven, 178, 140);
    el('san').classList.toggle('fire', time < 0.03);
    el('san').style.opacity = time < 0.05 ? '1' : '0.75';

    // blood movement
    el('fAV').style.opacity = v.av ? '1' : '0';
    el('fSL').style.opacity = v.sl ? '1' : '0';
    el('fVein').style.opacity = '1';

    // heart sounds
    const s = el('sound');
    if (time >= 0.1025 && time < 0.2) { el('sound1').textContent = 'First heart sound'; el('sound2').textContent = '(AV valves close)'; s.style.opacity = '1'; }
    else if (time >= 0.4 && time < 0.47) { el('sound1').textContent = 'Second heart sound'; el('sound2').textContent = '(semilunar valves close)'; s.style.opacity = '1'; }
    else s.style.opacity = '0';

    // graph cursor
    const x = gx(time).toFixed(1);
    el('cursor').setAttribute('x1', x); el('cursor').setAttribute('x2', x);
    for (const [k, f] of [['dAo', ao], ['dLv', lv], ['dLa', la]] as const) { el(k).setAttribute('cx', x); el(k).setAttribute('cy', gy(f(time)).toFixed(1)); }
    for (const [k, te] of EVENTS) el(k).style.opacity = time >= te ? '1' : '0';

    el('phase').textContent = NAMES[index]!;
    el('time').textContent = `t = ${time.toFixed(2)} s of ${CYCLE.toFixed(2)} s`;
    el('readout').textContent = `LA ${Math.round(la(time))} · LV ${Math.round(lv(time))} · aorta ${Math.round(ao(time))} mmHg`;
    void ease; void phase;
  }
  render(0, 0);
  return { render, durations: [4, 3.5, 5, 3.5, 5] };
}
