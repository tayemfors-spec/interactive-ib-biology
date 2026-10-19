import { ease, lerp, phase } from '../lib/timeline';

type XY = [number, number];
const METER_W = 210;

export function create(svg: SVGSVGElement) {
  const el = (k: string) => svg.querySelector<SVGGraphicsElement>(`[data-el="${k}"]`)!;
  const show = (k: string, o: boolean | number) => { el(k).style.opacity = String(typeof o === 'number' ? o : o ? 1 : 0); };
  const move = (k: string, [x, y]: XY) => el(k).setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)})`);
  const mix = (a: XY, b: XY, t: number): XY => [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];
  const nad = (box: string, txt: string, reduced: boolean) => {
    el(box).classList.toggle('red', reduced);
    el(txt).textContent = reduced ? 'reduced NAD' : 'NAD';
  };
  const meter = (f: number, line1 = '', line2 = '') => {
    el('meter').setAttribute('width', String(Math.max(0, METER_W * f).toFixed(1)));
    el('meter-t').textContent = line1;
    el('meter-t2').textContent = line2;
  };
  const bubbles = (sel: string, k: number) => svg.querySelectorAll<SVGCircleElement>(sel).forEach((b, i) => {
    b.style.opacity = k > i / 8 ? '1' : '0';
  });

  /** End state of glycolysis (used as the background for later steps). */
  const glycolysisDone = () => {
    show('glc', false); show('glc-t', false); show('pyr1', true); show('pyr2', true); show('pyr-t', true); show('g-atp', true);
    nad('g-nadbox1', 'g-nadt1', true); nad('g-nadbox2', 'g-nadt2', true);
  };
  const humanStart = () => { move('h-pyr', [0, 0]); nad('h-nadbox', 'h-nadt', true); show('h-lac-t', false); show('h-pyr-t', true); show('h-note', false); };
  const humanEnd = () => { move('h-pyr', [198, 0]); nad('h-nadbox', 'h-nadt', false); show('h-lac-t', true); show('h-pyr-t', false); show('h-note', true); };
  const yeastStart = () => {
    move('y-pyr', [0, 0]); move('y-co2', [380, 240]); show('y-co2-t', false); nad('y-nadbox', 'y-nadt', true);
    show('y-pyr-t', true); show('y-eth-t', false); show('y-ol-t', false);
  };
  const yeastEnd = () => {
    move('y-pyr', [222, 0]); move('y-co2', [440, 200]); show('y-co2-t', true); nad('y-nadbox', 'y-nadt', false);
    show('y-pyr-t', false); show('y-eth-t', false); show('y-ol-t', true);
  };

  function render(index: number, t: number) {
    show('uses', index === 3);
    show('human', index === 2 ? 0.35 : 1);
    show('yeast', index === 1 ? 0.35 : 1);
    switch (index) {
      case 0: { // glycolysis: NAD is reduced, so it would run out
        const split = ease(phase(t, 0.1, 0.5));
        show('glc', 1 - split); show('glc-t', 1 - split);
        show('pyr1', split); show('pyr2', split); show('pyr-t', split);
        nad('g-nadbox1', 'g-nadt1', t >= 0.55); nad('g-nadbox2', 'g-nadt2', t >= 0.65);
        show('g-atp', t >= 0.75);
        const f = 1 - ease(phase(t, 0.5, 0.9));
        meter(f, f < 0.05 ? 'All NAD is now reduced, so' : '', f < 0.05 ? 'glycolysis would stop.' : '');
        humanStart(); yeastStart();
        break;
      }
      case 1: { // humans: pyruvate reduced to lactate
        glycolysisDone(); yeastStart();
        const a = ease(phase(t, 0.1, 0.6));
        move('h-pyr', mix([0, 0], [198, 0], a));
        nad('h-nadbox', 'h-nadt', t < 0.55);
        show('h-lac-t', t >= 0.6); show('h-pyr-t', t < 0.6); show('h-note', t >= 0.6);
        meter(ease(phase(t, 0.55, 0.95)), t >= 0.6 ? 'NAD regenerated: glycolysis' : '', t >= 0.6 ? 'continues (net 2 ATP/glucose).' : '');
        break;
      }
      case 2: { // yeast: pyruvate → ethanal + CO₂ → ethanol
        glycolysisDone(); humanEnd();
        const a = ease(phase(t, 0.05, 0.4));
        const b = ease(phase(t, 0.45, 0.85));
        move('y-pyr', mix([0, 0], [106, 0], a));
        if (b > 0) move('y-pyr', mix([106, 0], [222, 0], b));
        move('y-co2', mix([380, 240], [440, 200], a));
        show('y-co2-t', t >= 0.3);
        show('y-pyr-t', t < 0.1); show('y-eth-t', t >= 0.35 && t < 0.8); show('y-ol-t', t >= 0.8);
        nad('y-nadbox', 'y-nadt', t < 0.75);
        meter(ease(phase(t, 0.7, 0.95)), t >= 0.8 ? 'NAD regenerated in yeast too:' : '', t >= 0.8 ? 'net 2 ATP per glucose.' : '');
        break;
      }
      default: { // uses: baking and brewing
        glycolysisDone(); humanEnd(); yeastEnd();
        meter(1, 'Both pathways regenerate NAD;', 'only the end products differ.');
        const g = ease(phase(t, 0, 0.8));
        el('dough').setAttribute('ry', lerp(14, 24, g).toFixed(1));
        el('dough').setAttribute('rx', lerp(52, 62, g).toFixed(1));
        bubbles('[data-bubble]', g);
        bubbles('[data-bubble2]', g);
      }
    }
  }
  render(0, 0);
  return { render, durations: [5, 5, 6, 5] };
}
