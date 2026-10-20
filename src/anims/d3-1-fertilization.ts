import { ease, lerp, phase } from '../lib/timeline';

const E = { cx: 260, cy: 200 };
const N_CG = 28;
/** Tip x-positions of the lead sperm (it travels along y = 200 from the left). */
const TIP = { start: -40, zona: 110, membrane: 144 };
const NUC_IN = 222; // sperm nucleus position inside the egg
const OTHER = [{ k: 's2', a: 215 }, { k: 's3', a: 145 }];

export function create(svg: SVGSVGElement) {
  const el = (k: string) => svg.querySelector<SVGGraphicsElement>(`[data-el="${k}"]`)!;
  const op = (k: string, v: number | boolean) => { el(k).style.opacity = String(typeof v === 'boolean' ? (v ? 1 : 0) : v); };
  const tip = (x: number) => el('s1').setAttribute('transform', `translate(${x.toFixed(1)} 200)`);
  const nuc = (x: number, r = 1) => { const n = el('sNuc'); n.setAttribute('cx', x.toFixed(1)); n.setAttribute('rx', (7 * r).toFixed(1)); n.setAttribute('ry', (5 * r).toFixed(1)); };
  /** Other sperm: p = 0 far out, 1 touching the zona. */
  const other = (p: number) => OTHER.forEach(({ k, a }) => {
    const rad = (a * Math.PI) / 180;
    const r = lerp(270, 150, p);
    const x = E.cx + r * Math.cos(rad), y = E.cy + r * Math.sin(rad);
    el(k).setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${(a - 180).toFixed(1)})`);
  });
  const cortical = (p: number) => {
    for (let i = 0; i < N_CG; i++) {
      const a = (i / N_CG) * Math.PI * 2, r = lerp(108, 117, p);
      const c = el(`cg${i}`);
      c.setAttribute('cx', (E.cx + r * Math.cos(a)).toFixed(1));
      c.setAttribute('cy', (E.cy + r * Math.sin(a)).toFixed(1));
      c.style.opacity = String(1 - phase(p, 0.7, 1));
    }
    el('cgLab').style.opacity = String(1 - phase(p, 0.7, 1));
  };
  const tag = (s: string) => { el('tag').textContent = s; };

  function render(index: number, t: number) {
    // defaults
    op('enz', false); op('channel', false); op('blocked', false); op('pb2', false);
    op('pnE', false); op('jm', false); op('twocell', false); op('spindle2', true);
    op('s1tail', true); op('s1head', true); op('acro', true); op('sNuc', true);
    el('zona').classList.remove('hard');
    el('zonaLab').textContent = '(glycoproteins)';
    cortical(0);
    switch (index) {
      case 0: { // sperm swim to the egg
        const x = lerp(TIP.start, TIP.zona, ease(phase(t, 0, 0.9)));
        tip(x); nuc(x - 12);
        other(ease(phase(t, 0.1, 0.95)));
        tag('Sperm reach the egg');
        break;
      }
      case 1: { // acrosome reaction
        other(1);
        op('enz', phase(t, 0, 0.2) * (1 - phase(t, 0.75, 1)));
        op('acro', 1 - phase(t, 0.1, 0.3));
        op('channel', ease(phase(t, 0.25, 0.6)));
        const x = lerp(TIP.zona, TIP.membrane, ease(phase(t, 0.45, 1)));
        tip(x); nuc(x - 12);
        tag('Acrosome reaction');
        break;
      }
      case 2: { // membranes fuse, nucleus enters
        other(1); op('channel', true); op('acro', false);
        tip(TIP.membrane);
        op('s1head', 1 - phase(t, 0.1, 0.4));
        nuc(lerp(TIP.membrane - 12, NUC_IN, ease(phase(t, 0.2, 0.9))));
        tag('Fusion: the sperm nucleus enters');
        break;
      }
      case 3: { // cortical reaction
        other(1); op('channel', true); op('acro', false); op('s1head', false);
        tip(TIP.membrane); nuc(NUC_IN);
        cortical(ease(phase(t, 0, 0.7)));
        if (t > 0.6) { el('zona').classList.add('hard'); el('zonaLab').textContent = '(hardened)'; }
        op('blocked', t > 0.75);
        tag('Cortical reaction blocks other sperm');
        break;
      }
      case 4: { // meiosis II completes; tail and mitochondria destroyed; two haploid nuclei
        other(1); op('channel', true); op('acro', false); op('s1head', false); op('blocked', true);
        cortical(1); el('zona').classList.add('hard'); el('zonaLab').textContent = '(hardened)';
        tip(TIP.membrane);
        op('s1tail', 1 - phase(t, 0.1, 0.5));
        op('spindle2', 1 - phase(t, 0.2, 0.5));
        op('pb2', ease(phase(t, 0.3, 0.6)));
        op('pnE', ease(phase(t, 0.45, 0.9)));
        nuc(NUC_IN, lerp(1, 3, ease(phase(t, 0.45, 0.9))));
        tag('Two haploid nuclei form');
        break;
      }
      case 5: { // joint mitosis: nuclear membranes break down, one shared spindle
        other(1); op('channel', true); op('acro', false); op('s1head', false); op('blocked', true); op('s1tail', false);
        cortical(1); el('zona').classList.add('hard'); el('zonaLab').textContent = '(hardened)';
        op('spindle2', false); op('pb2', true);
        tip(TIP.membrane);
        nuc(NUC_IN, 3);
        const dissolve = phase(t, 0, 0.4);
        op('pnE', 1 - dissolve); op('sNuc', 1 - dissolve);
        op('jm', ease(phase(t, 0.3, 0.7)));
        tag('Joint mitosis: one spindle');
        break;
      }
      default: { // two diploid nuclei
        other(1); op('channel', true); op('acro', false); op('s1head', false); op('blocked', true); op('s1tail', false);
        cortical(1); el('zona').classList.add('hard'); el('zonaLab').textContent = '(hardened)';
        op('spindle2', false); op('pb2', true); op('sNuc', false);
        tip(TIP.membrane);
        op('jm', 1 - phase(t, 0, 0.4));
        op('twocell', ease(phase(t, 0.3, 0.8)));
        tag('Two diploid nuclei');
      }
    }
  }
  render(0, 0);
  return { render, durations: [3.5, 4, 3.5, 4, 4.5, 3.5, 3.5] };
}
