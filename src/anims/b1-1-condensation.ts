import { ease, lerp, phase } from '../lib/timeline';

type XY = [number, number];
// sugar panel
const A_OH: XY = [160, 188];
const B_H: XY = [257, 188];
const B_O: XY = [270, 188];
const BRIDGE: XY = [215, 176];
const MEET: XY = [214, 212];
const WATER: XY = [420, 268];
const C1A: XY = [160, 140];
const C4B: XY = [270, 140];
// lipid panel
const ROWS = [92, 162, 232];
const SHIFT = -62;

export function create(svg: SVGSVGElement) {
  const el = (k: string) => svg.querySelector<SVGGraphicsElement>(`[data-el="${k}"]`)!;
  const mix = (a: XY, b: XY, t: number): XY => [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];
  const at = (k: string, [x, y]: XY, opacity = 1) => {
    const g = el(k);
    g.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)})`);
    g.style.opacity = String(opacity);
  };
  const show = (k: string, o: number) => { el(k).style.opacity = String(o); };
  const text = (k: string, s: string) => { el(k).textContent = s; };
  /** Stub from carbon c: s = 0 short vertical stub; s = 1 bond reaching the bridging O. */
  const stub = (k: string, c: XY, s: number) => {
    const free: XY = [c[0], 172];
    const d = Math.hypot(BRIDGE[0] - c[0], BRIDGE[1] - c[1]);
    const bonded: XY = [c[0] + ((BRIDGE[0] - c[0]) * (d - 9)) / d, c[1] + ((BRIDGE[1] - c[1]) * (d - 9)) / d];
    const [x, y] = mix(free, bonded, s);
    const l = el(k);
    l.setAttribute('x2', x.toFixed(1));
    l.setAttribute('y2', y.toFixed(1));
  };

  const sugarSeparate = () => {
    at('aOH', A_OH); at('bH', B_H); at('bO', B_O); at('w', WATER, 0);
    stub('aStub', C1A, 0); stub('bStub', C4B, 0);
    show('bondLab', 0); show('wLab', 0);
  };
  const sugarJoined = () => {
    at('aOH', MEET, 0); at('bH', MEET, 0); at('bO', BRIDGE); at('w', WATER, 1);
    stub('aStub', C1A, 1); stub('bStub', C4B, 1);
    show('bondLab', 1); show('wLab', 1);
  };
  const lipidStart = () => {
    ROWS.forEach((y, k) => {
      at(`gH${k}`, [124, y]); at(`fOH${k}`, [176, y]); at(`fa${k}`, [0, 0]);
      at(`lw${k}`, [360 + k * 60, 300], 0);
      show(`gb${k}`, 1); show(`est${k}`, 0);
    });
    show('esterLab', 0);
    text('lName', 'glycerol + three fatty acids');
  };

  function render(index: number, t: number) {
    show('hiA', 0); show('hiB', 0);
    show('sugar', index <= 2 ? 1 : 0);
    show('lipid', index >= 3 ? 1 : 0);
    switch (index) {
      case 0: // two α-glucose, reacting groups highlighted
        sugarSeparate();
        show('hiA', ease(phase(t, 0.1, 0.6))); show('hiB', ease(phase(t, 0.1, 0.6)));
        text('sName', 'two α-glucose molecules (monomers)');
        text('count', 'Water released: 0');
        break;
      case 1: { // condensation → maltose + water
        const p = ease(phase(t, 0, 0.45));
        const fadeGroups = 1 - phase(t, 0.42, 0.52);
        at('aOH', mix(A_OH, MEET, p), fadeGroups);
        at('bH', mix(B_H, MEET, p), fadeGroups);
        const b = ease(phase(t, 0.2, 0.7));
        at('bO', mix(B_O, BRIDGE, b));
        stub('aStub', C1A, b); stub('bStub', C4B, b);
        at('w', mix(MEET, WATER, ease(phase(t, 0.55, 1))), phase(t, 0.45, 0.55));
        show('hiA', 1 - phase(t, 0, 0.2)); show('hiB', 1 - phase(t, 0, 0.2));
        show('bondLab', phase(t, 0.65, 0.85)); show('wLab', phase(t, 0.8, 1));
        text('sName', t < 0.5 ? 'condensation…' : 'maltose (a disaccharide) + water');
        text('count', `Water released: ${t >= 0.5 ? 1 : 0}`);
        break;
      }
      case 2: { // hydrolysis → two α-glucose
        sugarJoined();
        show('wLab', 0);
        const inP = ease(phase(t, 0, 0.4));
        at('w', mix(WATER, MEET, inP), 1 - phase(t, 0.4, 0.5));
        const out = ease(phase(t, 0.5, 1));
        const groups = phase(t, 0.4, 0.5);
        at('aOH', mix(MEET, A_OH, out), groups);
        at('bH', mix(MEET, B_H, out), groups);
        const b = 1 - ease(phase(t, 0.45, 0.9));
        at('bO', mix(B_O, BRIDGE, b));
        stub('aStub', C1A, b); stub('bStub', C4B, b);
        show('bondLab', 1 - phase(t, 0.4, 0.6));
        text('sName', t < 0.95 ? 'hydrolysis: water splits the bond' : 'two α-glucose again');
        text('count', `Water used: ${t >= 0.45 ? 1 : 0}`);
        break;
      }
      case 3: // switch to glycerol and fatty acids
        sugarSeparate();
        show('sugar', 1 - ease(phase(t, 0, 0.4)));
        show('lipid', ease(phase(t, 0.3, 0.8)));
        lipidStart();
        text('count', 'Water released: 0');
        break;
      default: { // three condensation reactions → triglyceride + 3 H₂O
        lipidStart();
        let released = 0;
        ROWS.forEach((y, k) => {
          const pk = phase(t, k * 0.3, k * 0.3 + 0.36);
          const meet: XY = [150, y + 26];
          const m = ease(phase(pk, 0, 0.45));
          const fade = 1 - phase(pk, 0.42, 0.52);
          at(`gH${k}`, mix([124, y], meet, m), fade);
          at(`fOH${k}`, mix([176, y], meet, m), fade);
          show(`gb${k}`, 1 - phase(pk, 0, 0.2));
          at(`fa${k}`, [SHIFT * ease(phase(pk, 0.3, 0.8)), 0]);
          show(`est${k}`, phase(pk, 0.6, 0.85));
          at(`lw${k}`, mix(meet, [360 + k * 60, 300], ease(phase(pk, 0.55, 1))), phase(pk, 0.45, 0.55));
          if (pk >= 0.5) released++;
        });
        show('esterLab', phase(t, 0.85, 1));
        text('lName', t < 0.95 ? 'three condensation reactions…' : 'a triglyceride + 3 H₂O');
        text('count', `Water released: ${released}`);
      }
    }
  }
  render(0, 0);
  return { render, durations: [3, 5, 5, 3, 7] };
}
