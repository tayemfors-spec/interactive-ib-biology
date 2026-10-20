import { ease, lerp, phase } from '../lib/timeline';

type XY = [number, number];
const BEE_START: XY = [40, 60];
const BEE_A: XY = [130, 150];
const BEE_B: XY = [430, 150];
/** Points along the pollen tube (for the male gametes to follow). */
const TUBE: XY[] = [[262, 50], [268, 84], [273, 130], [273, 180], [274, 230], [280, 254]];
const SEED_END: XY[] = [[250, 334], [340, 330], [430, 336], [520, 332]];

export function create(svg: SVGSVGElement) {
  const el = (k: string) => svg.querySelector<SVGGraphicsElement>(`[data-el="${k}"]`)!;
  const show = (k: string, on: number | boolean) => { el(k).style.opacity = String(typeof on === 'boolean' ? (on ? 1 : 0) : on); };
  const move = (k: string, [x, y]: XY, rot = 0) => el(k).setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)})${rot ? ` rotate(${rot.toFixed(1)})` : ''}`);
  const mix = (a: XY, b: XY, t: number): XY => [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];
  const grow = (k: string, p: number) => { el(k).style.strokeDasharray = `${Math.max(0, Math.min(1, p)).toFixed(3)} 1`; };
  const along = (pts: XY[], t: number): XY => {
    const s = Math.max(0, Math.min(0.9999, t)) * (pts.length - 1);
    const i = Math.floor(s);
    return mix(pts[i]!, pts[i + 1]!, s - i);
  };
  const scene = (n: string) => ['A', 'B', 'C', 'D'].forEach((s) => show(`scene${s}`, s === n));

  function render(index: number, t: number) {
    // defaults for scene B
    show('self', false); show('selfX', false); grow('selfTube', 0);
    show('mg1', false); show('mg2', false); show('fate', false);
    el('egg').classList.remove('zyg');
    el('eggLab').textContent = 'egg cell (n)';
    switch (index) {
      case 0: { // gametes made; insect arrives at plant A
        scene('A');
        move('bee', mix(BEE_START, BEE_A, ease(phase(t, 0, 0.8))));
        show('beePollen', t > 0.85);
        show('pollenB', false);
        break;
      }
      case 1: { // cross-pollination: pollen carried to plant B
        scene('A');
        const p = ease(phase(t, 0.05, 0.8));
        const [x, y] = mix(BEE_A, BEE_B, p);
        // after landing on B the bee moves aside so the pollen on the stigma is visible
        const off = ease(phase(t, 0.88, 1));
        move('bee', [x + 50 * off, y - 70 * Math.sin(Math.PI * p) - 60 * off]);
        show('beePollen', t < 0.9);
        show('pollenB', t >= 0.9);
        break;
      }
      case 2: { // pollen tube grows down the style to the ovule
        scene('B');
        grow('tube', ease(phase(t, 0.1, 0.95)));
        break;
      }
      case 3: { // self-incompatibility: own pollen rejected
        scene('B');
        grow('tube', 1);
        show('self', true);
        grow('selfTube', ease(phase(t, 0.05, 0.6)));
        show('selfX', t > 0.65);
        break;
      }
      case 4: { // fertilization
        scene('B');
        grow('tube', 1);
        const p = ease(phase(t, 0, 0.6));
        show('mg1', t < 0.7); show('mg2', true);
        move('mg1', [along(TUBE, p)[0] - 262, along(TUBE, p)[1] - 50]);
        move('mg2', [along(TUBE, p * 0.94)[0] - 262, along(TUBE, p * 0.94)[1] - 50]);
        if (t >= 0.7) { el('egg').classList.add('zyg'); el('eggLab').textContent = 'zygote (2n)'; }
        show('fate', t >= 0.75);
        break;
      }
      case 5: { // seed dispersal
        scene('C');
        [0, 1, 2, 3].forEach((i) => {
          const p = ease(phase(t, i * 0.12, 0.6 + i * 0.12));
          const [x, y] = mix([90 + i * 6, 150 + i * 10], SEED_END[i]!, p);
          move(`seed${i}`, [x, y - 50 * Math.sin(Math.PI * p)], 360 * 2 * p);
        });
        break;
      }
      default: { // germination
        scene('D');
        [0, 1, 2, 3].forEach((i) => {
          const c: XY = [[200, 300], [350, 310], [190, 230], [372, 250]][i] as XY;
          const p = ease(phase(t, 0, 0.3));
          const [x, y] = mix(c, [280, 240], p);
          el(`w${i}`).setAttribute('cx', x.toFixed(1)); el(`w${i}`).setAttribute('cy', y.toFixed(1));
          show(`w${i}`, 1 - phase(t, 0.25, 0.32));
        });
        show('food', t > 0.35);
        grow('radicle', ease(phase(t, 0.35, 0.7)));
        show('hairs', t > 0.7); show('radLab', t > 0.6);
        grow('plumule', ease(phase(t, 0.6, 0.95)));
        show('leaves', t > 0.93); show('plumLab', t > 0.9);
      }
    }
  }
  render(0, 0);
  return { render, durations: [3.5, 4, 4, 4, 4.5, 4, 5] };
}
