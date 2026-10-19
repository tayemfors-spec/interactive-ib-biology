import { ease, lerp, phase } from '../lib/timeline';

type XY = [number, number];
/*
 * Steps: 0 attach · 1 inject · 2 replicate + make proteins · 3 assemble · 4 lyse   (lytic)
 *        5 integrate · 6 divide · 7 induce → lytic                                   (lysogenic)
 * Every render call sets every element, so steps can be visited in any order.
 */
const PHAGES_IN: XY[] = [[110, 300], [170, 344], [112, 404], [214, 430], [300, 298], [362, 360], [446, 320], [420, 424]];
const PHAGES_OUT: XY[] = [[30, 214], [104, 196], [24, 446], [196, 452], [340, 214], [520, 240], [528, 398], [436, 452]];
const VCIRC: XY = [386, 336];
const PROPHAGE_SITE: XY = [334, 368];
const DB_PRO: XY = [480, 382];
const DB_FREE: XY = [503, 402];

export function create(svg: SVGSVGElement) {
  const el = (k: string) => svg.querySelector<SVGGraphicsElement>(`[data-el="${k}"]`)!;
  const op = (k: string, v: number) => { el(k).style.opacity = String(Math.max(0, Math.min(1, v))); };
  const tr = (k: string, [x, y]: XY, s = 1) => el(k).setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)})${s !== 1 ? ` scale(${s.toFixed(3)})` : ''}`);
  /** Draw a path (with pathLength="1") to fraction v. */
  const draw = (k: string, v: number) => {
    const e = el(k);
    e.style.strokeDashoffset = String(1 - Math.max(0, Math.min(1, v)));
    e.style.visibility = v > 0.001 ? 'visible' : 'hidden'; // round line caps would otherwise leave a dot
  };
  const mix = (a: XY, b: XY, t: number): XY => [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];
  const nodes = 8;
  const highlight = (i: number) => { for (let n = 0; n < nodes; n++) el(`node${n}`).setAttribute('class', n === i ? 'node on' : 'node'); };
  const wall = el('wall');

  function reset() {
    op('cell', 1); op('wall', 1); op('pm', 1); op('chrom', 1);
    wall.style.strokeDasharray = 'none';
    draw('prophage', 0); draw('inj', 0); op('inj', 1);
    tr('vcirc', VCIRC); op('vcirc', 0);
    op('copies', 0); for (let i = 0; i < 7; i++) op(`copy${i}`, 1);
    op('parts', 0);
    op('phagesIn', 0); PHAGES_IN.forEach((p, i) => { tr(`np${i}`, p); op(`np${i}`, 1); });
    op('daughters', 0); tr('dA', [0, 0]); tr('dB', [0, 0]); op('dAPro', 1); op('dBPro', 1);
    tr('dBCirc', DB_FREE); op('dBCirc', 0);
    tr('phage', [280, 0]); op('phage', 1); op('phageDNA', 0);
    op('stress', 0); op('burst', 0); op('toLytic', 0);
    el('induceArrow').setAttribute('class', 'link induce');
  }

  function render(index: number, t: number) {
    reset();
    highlight(index);
    switch (index) {
      case 0: { // attachment
        const u = ease(phase(t, 0, 0.8));
        tr('phage', [280, lerp(-24, 0, u)]);
        op('phageDNA', 1);
        break;
      }
      case 1: // injection, then the linear DNA circularizes
        op('phageDNA', 1 - phase(t, 0.05, 0.55));
        draw('inj', ease(phase(t, 0.05, 0.6)));
        op('inj', 1 - phase(t, 0.7, 0.95));
        op('vcirc', phase(t, 0.7, 0.95));
        break;
      case 2: // host machinery copies the viral DNA and makes viral proteins
        op('chrom', 0.55);
        op('vcirc', 1);
        op('copies', 1);
        for (let i = 0; i < 7; i++) op(`copy${i}`, phase(t, 0.05 + i * 0.07, 0.15 + i * 0.07));
        op('parts', phase(t, 0.55, 0.85));
        break;
      case 3: // assembly
        op('chrom', 0.55);
        op('vcirc', 1 - phase(t, 0, 0.5));
        op('copies', 1 - phase(t, 0, 0.6));
        op('parts', 1 - phase(t, 0, 0.6));
        op('phagesIn', 1);
        PHAGES_IN.forEach((_, i) => op(`np${i}`, phase(t, 0.1 + i * 0.08, 0.25 + i * 0.08)));
        break;
      case 4: { // lysis
        const u = ease(phase(t, 0.15, 0.6));
        wall.style.strokeDasharray = u > 0 ? `${lerp(80, 16, u).toFixed(1)} ${lerp(1, 24, u).toFixed(1)}` : 'none';
        op('wall', 1 - 0.65 * u);
        op('pm', 1 - u);
        op('chrom', lerp(0.55, 0.12, u));
        op('phage', 1 - u);
        op('phagesIn', 1);
        PHAGES_IN.forEach((p, i) => tr(`np${i}`, mix(p, PHAGES_OUT[i]!, ease(phase(t, 0.25, 0.9)))));
        op('burst', phase(t, 0.6, 0.9));
        break;
      }
      case 5: { // lysogenic alternative: integration as a prophage
        const u = ease(phase(t, 0.1, 0.55));
        tr('vcirc', mix(VCIRC, PROPHAGE_SITE, u), lerp(1, 0.55, u));
        op('vcirc', 1 - phase(t, 0.5, 0.7));
        draw('prophage', ease(phase(t, 0.5, 0.9)));
        break;
      }
      case 6: { // the prophage is copied with the chromosome and passed to both daughter cells
        draw('prophage', 1);
        op('phage', 1 - phase(t, 0, 0.2));
        op('cell', 1 - phase(t, 0.15, 0.45));
        const u = ease(phase(t, 0.3, 0.8));
        op('daughters', phase(t, 0.3, 0.6));
        tr('dA', [lerp(60, 0, u), 0]);
        tr('dB', [lerp(-60, 0, u), 0]);
        break;
      }
      default: { // 7: induction — the prophage is cut out and the lytic cycle begins
        op('cell', 0);
        op('phage', 0);
        op('daughters', 1);
        op('stress', phase(t, 0, 0.25));
        op('dBPro', 1 - phase(t, 0.3, 0.6));
        const u = ease(phase(t, 0.4, 0.75));
        op('dBCirc', phase(t, 0.4, 0.6));
        tr('dBCirc', mix(DB_PRO, DB_FREE, u), lerp(0.6, 1, u));
        op('toLytic', phase(t, 0.7, 0.95));
        if (t > 0.6) el('induceArrow').setAttribute('class', 'link induce on');
      }
    }
  }
  render(0, 0);
  return { render, durations: [3.5, 4.5, 5, 4.5, 4.5, 5, 5, 5] };
}
