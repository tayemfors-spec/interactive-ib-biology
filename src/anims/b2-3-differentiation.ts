import { ease, lerp, phase } from '../lib/timeline';

type XY = [number, number];
const N = 16;
const BASE_R = 24;
// final strip: 8 columns × 2 rows; cell i is in column floor(i/2), row i % 2, so each division splits a block
const col = (i: number) => Math.floor(i / 2);
const row = (i: number) => i % 2;
const P16: XY[] = Array.from({ length: N }, (_, i) => [85 + 50 * col(i), 95 + 50 * row(i)]);
/** Radius of each cell when the embryo has n cells (cells get smaller as the embryo cleaves). */
const RADIUS: Record<number, number> = { 1: 66, 2: 54, 4: 40, 8: 27, 16: 23 };
const LEVELS = [1, 2, 4, 8, 16];
const STEM = 8; // the cell that stays a stem cell
const group = (i: number): 'a' | 'b' | 'c' => (col(i) <= 2 ? 'a' : col(i) <= 5 ? 'b' : 'c');
const fate = { a: 'nerve', b: 'muscle', c: 'epi' } as const;

/** Centre of cell i's ancestor when the embryo has n cells: the centroid of that ancestor's descendants. */
function centre(i: number, n: number): XY {
  const size = N / n, first = Math.floor(i / size) * size;
  let x = 0, y = 0;
  for (let k = first; k < first + size; k++) { x += P16[k]![0]; y += P16[k]![1]; }
  return [x / size, y / size];
}

export function create(svg: SVGSVGElement) {
  const el = (k: string) => svg.querySelector<SVGElement>(`[data-el="${k}"]`)!;
  const show = (k: string, o: number) => { el(k).style.opacity = String(o); };
  const cellEl = Array.from({ length: N }, (_, i) => el(`c${i}`) as SVGGElement);
  const part = (i: number, p: string) => cellEl[i]!.querySelector<SVGElement>(`[data-part="${p}"]`)!;
  const dots = [...svg.querySelectorAll<SVGCircleElement>('[data-el^="m"]')].filter((d) => d.dataset.x);

  const place = (i: number, [x, y]: XY, r: number) => cellEl[i]!.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${(r / BASE_R).toFixed(3)})`);
  /** Embryo at cleavage progress s ∈ [0, 1] (1 → 2 → 4 → 8 → 16 cells). Returns the cell count. */
  const cleave = (s: number) => {
    const seg = Math.min(3, Math.floor(s * 4));
    const u = ease(phase(s * 4 - seg, 0.15, 0.85));
    const from = LEVELS[seg]!, to = LEVELS[seg + 1]!;
    for (let i = 0; i < N; i++) {
      const a = centre(i, from), b = centre(i, to);
      place(i, [lerp(a[0], b[0], u), lerp(a[1], b[1], u)], lerp(RADIUS[from]!, RADIUS[to]!, u));
    }
    return s >= 1 ? 16 : u > 0.5 ? to : from;
  };
  /** Cell appearance: colour by expressed gene (0–1), shape change to the specialized form (0–1). */
  const look = (expr: number, spec: number) => {
    for (let i = 0; i < N; i++) {
      const g = group(i), stem = i === STEM;
      const round = part(i, 'round');
      round.setAttribute('class', `cell${expr > 0.5 ? ` ${g}` : ''}${stem && spec > 0 ? ' stemc' : ''}`);
      const s = stem ? 0 : spec;
      round.style.opacity = String(1 - s);
      for (const f of ['nerve', 'muscle', 'epi']) part(i, f).style.opacity = f === fate[g] ? String(s) : '0';
    }
  };
  const morphogen = (reach: number, o = 1) => {
    show('source', o);
    show('dots', o);
    dots.forEach((d) => { d.style.opacity = Number(d.dataset.x) - 50 <= reach ? '1' : '0'; });
  };
  const hideAll = () => {
    for (const k of ['wedge', 'thresholds', 'legend', 'source', 'dots', 'lblEgg', 'lblSperm', 'lblZyg', 'count', 'lblEmb', 'types', 'stemTag', 'stem']) show(k, 0);
    show('sperm', 0);
  };

  function render(index: number, t: number) {
    hideAll();
    switch (index) {
      case 0: { // fertilization
        for (let i = 0; i < N; i++) place(i, centre(i, 1), RADIUS[1]!);
        look(0, 0);
        const m = ease(phase(t, 0, 0.7));
        // the sperm ends with its head just inside the egg membrane and its tail outside (kept visible at t = 1)
        el('sperm').setAttribute('transform', `translate(${lerp(430, 318, m).toFixed(1)} ${lerp(56, 97, m).toFixed(1)}) rotate(${lerp(0, -22, m).toFixed(1)})`);
        show('sperm', 1);
        show('lblSperm', 1);
        show('lblEgg', 1);
        show('lblZyg', phase(t, 0.75, 1));
        break;
      }
      case 1: { // cleavage by mitosis
        const n = cleave(t);
        look(0, 0);
        el('count').textContent = `mitosis: ${n} ${n === 1 ? 'cell' : 'cells'}`;
        show('count', 1);
        show('lblEmb', phase(t, 0.9, 1));
        break;
      }
      case 2: { // morphogen gradient
        cleave(1);
        look(0, 0);
        morphogen(lerp(0, 420, ease(phase(t, 0, 0.8))));
        show('wedge', phase(t, 0.5, 0.9));
        break;
      }
      case 3: { // gene expression
        cleave(1);
        morphogen(420);
        show('wedge', 1);
        show('thresholds', phase(t, 0, 0.3));
        look(phase(t, 0.3, 0.6) > 0.5 ? 1 : 0, 0);
        show('legend', phase(t, 0.3, 0.6));
        break;
      }
      case 4: { // differentiation
        cleave(1);
        morphogen(420, 1 - phase(t, 0, 0.3));
        show('legend', 1);
        look(1, ease(phase(t, 0.2, 0.8)));
        show('types', phase(t, 0.6, 0.9));
        show('stemTag', phase(t, 0.7, 1));
        break;
      }
      default: { // stem cell properties
        cleave(1);
        look(1, 1);
        show('types', 1);
        show('stemTag', 1);
        show('stem', ease(phase(t, 0, 0.5)));
      }
    }
  }
  render(0, 0);
  return { render, durations: [4, 5, 4, 4, 4.5, 4] };
}
