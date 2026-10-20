import { ease, lerp, phase } from '../lib/timeline';

type XY = [number, number];
type Ledger = { atp: string; nadh: string; fadh: string; co2: string };

const TITLES = [
  'Glycolysis 1 · Phosphorylation',
  'Glycolysis 2 · Lysis',
  'Glycolysis 3 · Oxidation',
  'Glycolysis 4 · ATP formation',
  'Link reaction',
  'Krebs cycle',
  'Electron transport chain and chemiosmosis',
];
const CHIP = ['cyto', 'cyto', 'cyto', 'cyto', 'matrix', 'matrix', 'mem'];
const DELTAS = [
  ['2 ATP used to', 'phosphorylate glucose', ''],
  ['6C split into two', '3C triose phosphates', ''],
  ['+2 reduced NAD', '(2H removed from each', 'triose phosphate)'],
  ['4 ATP formed:', 'net gain 2 ATP;', '2 pyruvate (3C)'],
  ['×2: +2 CO₂', '+2 reduced NAD', '2 acetyl CoA formed'],
  ['×2 turns: +4 CO₂,', '+6 reduced NAD,', '+2 reduced FAD, +2 ATP'],
  ['NAD and FAD regenerated;', 'O₂ + 4e⁻ + 4H⁺ → 2H₂O;', 'about 26–28 ATP made'],
];
const KREBS_OUT: { el: string; deg: number }[] = [
  { el: 'k-co2a', deg: 40 }, { el: 'k-nad1', deg: 72 }, { el: 'k-co2b', deg: 108 }, { el: 'k-nad2', deg: 140 },
  { el: 'k-atp', deg: 205 }, { el: 'k-fad', deg: 255 }, { el: 'k-nad3', deg: 312 },
];
const K = { cx: 200, cy: 238, r: 92 };
const kp = (deg: number): XY => [K.cx + K.r * Math.sin((deg * Math.PI) / 180), K.cy - K.r * Math.cos((deg * Math.PI) / 180)];
const CARRIERS = [80, 150, 220];

export function create(svg: SVGSVGElement) {
  const el = (k: string) => svg.querySelector<SVGGraphicsElement>(`[data-el="${k}"]`)!;
  const show = (k: string, on: boolean | number) => { el(k).style.opacity = String(typeof on === 'number' ? on : on ? 1 : 0); };
  const move = (k: string, [x, y]: XY) => el(k).setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)})`);
  const mix = (a: XY, b: XY, t: number): XY => [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];
  const text = (k: string, s: string) => { el(k).textContent = s; };
  const cls = (k: string, c: string, on: boolean) => el(k).classList.toggle(c, on);
  const ledger = (l: Ledger) => { text('v-atp', l.atp); text('v-nadh', l.nadh); text('v-fadh', l.fadh); text('v-co2', l.co2); };
  const nad = (prefix: string, reduced: boolean) => { cls(`${prefix}box`, 'red', reduced); text(`${prefix}t`, reduced ? 'reduced NAD' : 'NAD'); };

  function render(index: number, t: number) {
    for (let i = 0; i < 7; i++) show(`s${i}`, i === index);
    text('title', TITLES[index]!);
    for (const c of ['cyto', 'matrix', 'mem']) cls(`chip-${c}`, 'on', CHIP[index] === c);
    const d = DELTAS[index]!;
    text('d1', d[0]!); text('d2', d[1]!); text('d3', d[2]!);
    text('foot', index === 6 ? 'Yields are approximate:' : '');
    text('foot2', index === 6 ? 'about 30–32 ATP per glucose.' : '');

    switch (index) {
      case 0: { // phosphorylation: 2 ATP used
        const a = ease(phase(t, 0, 0.4));
        const arrived = t >= 0.4;
        move('s0-atp1', mix([80, 320], [128, 200], a)); show('s0-atp1', !arrived);
        move('s0-atp2', mix([340, 320], [292, 200], a)); show('s0-atp2', !arrived);
        show('s0-p1', arrived); show('s0-p2', arrived);
        const b = ease(phase(t, 0.45, 0.8));
        move('s0-adp1', mix([128, 236], [80, 330], b)); show('s0-adp1', arrived);
        move('s0-adp2', mix([292, 236], [340, 330], b)); show('s0-adp2', arrived);
        show('s0-glc', t < 0.5); show('s0-hbp', t >= 0.5);
        ledger({ atp: t >= 0.4 ? '−2' : '0', nadh: '0', fadh: '0', co2: '0' });
        break;
      }
      case 1: { // lysis
        const a = ease(phase(t, 0.1, 0.7));
        move('s1-left', mix([0, 0], [-18, -50], a));
        move('s1-right', mix([0, 0], [-80.5, 60], a));
        show('s1-l1', phase(t, 0.6, 0.8)); show('s1-l2', phase(t, 0.6, 0.8));
        ledger({ atp: '−2', nadh: '0', fadh: '0', co2: '0' });
        break;
      }
      case 2: { // oxidation: hydrogen to NAD
        [150, 260].forEach((y, i) => {
          const a = ease(phase(t, 0.1 + i * 0.1, 0.55 + i * 0.1));
          move(`s2-h${i}`, mix([175, y - 26], [300, y - 2], a));
          show(`s2-h${i}`, a < 1);
        });
        [0, 1].forEach((i) => { cls(`s2-nadbox${i}`, 'red', t >= 0.55 + i * 0.1); text(`s2-nadt${i}`, t >= 0.55 + i * 0.1 ? 'reduced NAD' : 'NAD'); });
        ledger({ atp: '−2', nadh: t >= 0.65 ? '2' : t >= 0.55 ? '1' : '0', fadh: '0', co2: '0' });
        break;
      }
      case 3: { // ATP formation: 4 ADP → 4 ATP; trioses become pyruvate
        let made = 0;
        [0, 1].forEach((i) => [0, 1].forEach((k) => {
          const on = t >= 0.2 + k * 0.25 + i * 0.08;
          if (on) made++;
          cls(`s3-box${i}${k}`, 'atp', on); cls(`s3-box${i}${k}`, 'adp', !on);
          text(`s3-t${i}${k}`, on ? 'ATP' : 'ADP');
        }));
        [0, 1].forEach((i) => { show(`s3-p${i}`, 1 - phase(t, 0.6, 0.8)); text(`s3-name${i}`, t >= 0.75 ? 'pyruvate (3C)' : 'triose phosphate'); });
        ledger({ atp: String(made - 2).replace('-', '−'), nadh: '2', fadh: '0', co2: '0' });
        break;
      }
      case 4: { // link reaction
        const a = ease(phase(t, 0.05, 0.35));
        move('s4-co2', mix([142, 200], [215, 118], a));
        show('s4-co2t', t >= 0.35);
        const b = ease(phase(t, 0.4, 0.75));
        el('s4-b1').setAttribute('cx', lerp(100, 110, b).toFixed(1)); el('s4-b1').setAttribute('cy', lerp(200, 300, b).toFixed(1));
        el('s4-b2').setAttribute('cx', lerp(121, 131, b).toFixed(1)); el('s4-b2').setAttribute('cy', lerp(200, 300, b).toFixed(1));
        move('s4-coa', mix([330, 300], [170, 300], b));
        show('s4-name', t < 0.4); show('s4-acetyl', t >= 0.78);
        nad('s4-nad', t >= 0.5);
        ledger({ atp: '2', nadh: t >= 0.5 ? '4' : '2', fadh: '0', co2: t >= 0.35 ? '2' : '0' });
        break;
      }
      case 5: { // Krebs cycle
        const enter = ease(phase(t, 0, 0.15));
        move('s5-acetyl', mix([200, 98], [200, 146], enter));
        show('s5-acetyl', t < 0.25);
        el('s5-coa').setAttribute('transform', `translate(${(40 * phase(t, 0.15, 0.25)).toFixed(1)} ${(-30 * phase(t, 0.15, 0.25)).toFixed(1)})`);
        show('s5-acl', t < 0.15);
        const u = phase(t, 0.25, 0.95);
        const deg = 360 * u;
        move('s5-marker', kp(deg));
        text('s5-mt', t < 0.2 ? '4C' : deg < 40 ? '6C' : deg < 108 ? '5C' : '4C');
        const done = (k: string) => KREBS_OUT.find((o) => o.el === k)!.deg <= deg && t >= 0.25;
        for (const o of KREBS_OUT) show(o.el, done(o.el));
        const n = (k: string[]) => k.filter(done).length;
        ledger({
          atp: String(2 + 2 * n(['k-atp'])),
          nadh: String(4 + 2 * n(['k-nad1', 'k-nad2', 'k-nad3'])),
          fadh: String(2 * n(['k-fad'])),
          co2: String(2 + 2 * n(['k-co2a', 'k-co2b'])),
        });
        break;
      }
      default: { // electron transport chain, proton pumping, chemiosmosis, oxygen
        const a = ease(phase(t, 0, 0.15));
        move('s6-nadh', t < 0.15 ? mix([64, 340], [80, 290], a) : mix([80, 290], [64, 350], ease(phase(t, 0.15, 0.3))));
        cls('s6-nadbox', 'red', t < 0.15); text('s6-nadt', t < 0.15 ? 'reduced NAD' : 'NAD');
        const e = phase(t, 0.15, 0.5);
        const path: XY[] = [[80, 262], [80, 220], [150, 220], [220, 220]];
        let p: XY;
        if (e < 1) { const k = e * (path.length - 1); const i = Math.floor(k); p = mix(path[i]!, path[i + 1]!, ease(k - i)); }
        else p = mix([220, 220], [240, 326], ease(phase(t, 0.5, 0.62)));
        move('s6-e1', [p[0] - 6, p[1]]); move('s6-e2', [p[0] + 6, p[1]]);
        show('s6-e1', t >= 0.12 && t < 0.62); show('s6-e2', t >= 0.12 && t < 0.62);
        CARRIERS.forEach((x, i) => {
          const u = ease(phase(t, 0.2 + i * 0.1, 0.35 + i * 0.1));
          move(`s6-pump${i}`, mix([x, 300], [x + 10, 140], u));
        });
        const formed = t >= 0.62;
        text('s6-o2t', formed ? 'H₂O' : '½O₂');
        cls('s6-o2', 'water', formed);
        el('s6-rotor').setAttribute('transform', `rotate(${(t < 0.6 ? 0 : (t - 0.6) * 900).toFixed(1)} 348 220)`);
        [0, 1, 2].forEach((i) => {
          const u = phase(t, 0.6 + i * 0.1, 0.75 + i * 0.1);
          move(`s6-back${i}`, mix([348 + (i - 1) * 14, 110], [348 + (i - 1) * 12, 282], ease(u)));
          show(`s6-back${i}`, u < 1);
        });
        const made = phase(t, 0.85, 1);
        show('s6-atp', t >= 0.85); move('s6-atp', mix([348, 306], [384, 356], ease(made)));
        show('s6-adp', t < 0.85);
        ledger(t >= 0.9 ? { atp: '≈ 30–32', nadh: '0', fadh: '0', co2: '6' } : { atp: '4', nadh: '10', fadh: '2', co2: '6' });
      }
    }
  }
  render(0, 0);
  return { render, durations: [4, 3.5, 4, 4, 5, 9, 9] };
}
