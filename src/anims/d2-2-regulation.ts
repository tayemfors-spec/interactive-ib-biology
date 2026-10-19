import { ease, lerp, phase } from '../lib/timeline';

type XY = [number, number];
const GTF: [XY, XY] = [[230, 64], [267, 128]];
const POL: [XY, XY] = [[420, 70], [332, 124]];
const ACT: [XY, XY] = [[76, 64], [76, 126]];
const REP: [XY, XY] = [[205, 64], [205, 126]];
const POLY_A = 'AAAAAAAAA';

export function create(svg: SVGSVGElement) {
  const el = (k: string) => svg.querySelector<SVGElement>(`[data-el="${k}"]`)!;
  const mix = (a: XY, b: XY, t: number): XY => [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];
  const place = (k: string, [x, y]: XY, opacity = 1) => {
    el(k).setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)})`);
    el(k).style.opacity = String(opacity);
  };
  const show = (k: string, o: number) => { el(k).style.opacity = o.toFixed(2); };
  const text = (k: string, s: string) => { el(k).textContent = s; };

  function render(index: number, t: number) {
    // ---- nucleus ----
    const gtf = index === 0 ? 0 : index === 1 ? ease(phase(t, 0, 0.45)) : 1;
    const pol = index === 0 ? 0 : index === 1 ? ease(phase(t, 0.45, 0.85)) : 1;
    const act = index < 2 ? 0 : index === 2 ? ease(phase(t, 0, 0.5)) : 1;
    const rep = index < 3 ? 0 : index === 3 ? ease(phase(t, 0, 0.5)) : 1;
    const repressed = index < 3 ? 0 : index === 3 ? ease(phase(t, 0.5, 0.95)) : 1;
    // step 1: RNA polymerase drifts towards the promoter but cannot bind on its own
    const hover = index === 0 ? Math.sin(Math.PI * ease(t)) : 0;
    place('gtf', mix(GTF[0], GTF[1], gtf));
    place('pol', pol > 0 ? mix(POL[0], POL[1], pol) : mix(POL[0], [372, 96], hover));
    place('act', mix(ACT[0], ACT[1], act), index < 2 ? 0 : index === 2 ? Math.min(1, act * 3) : 1);
    place('rep', mix(REP[0], REP[1], rep), index < 3 ? 0 : index === 3 ? Math.min(1, rep * 3) : 1);
    const arc = index === 2 ? ease(phase(t, 0.5, 0.8)) : index === 3 ? 1 - repressed : 0;
    show('arc', arc);
    show('arc-lbl', arc);
    const tx0 = index === 0 ? 0 : index === 1 ? ease(phase(t, 0.85, 1)) : index === 2 ? 1 : 1 - repressed;
    const tx12 = index === 2 ? ease(phase(t, 0.8, 1)) : index === 3 ? 1 - repressed : 0;
    show('tx0', tx0);
    show('tx1', tx12);
    show('tx2', tx12);
    text('rate', ['Transcription: none', 'Transcription: low', 'Transcription: high', 'Transcription: very low'][Math.min(index, 3)]!);

    // ---- cytoplasm ----
    show('cyto', index < 4 ? 0 : index === 4 ? ease(phase(t, 0, 0.2)) : 1);
    show('wait', index < 4 ? 1 : 0);
    const run = index === 4 ? ease(phase(t, 0.15, 1)) : 1;
    const fade = index === 5 ? ease(phase(t, 0.3, 0.55)) : 0;
    [0, 1, 2].forEach((i) => {
      const g = el(`ribo${i}`);
      g.setAttribute('transform', `translate(${(run * 36).toFixed(1)} 0)`);
      g.style.opacity = index < 4 ? '0' : (1 - fade).toFixed(2);
      el(`chain${i}`).style.opacity = index === 4 ? (0.3 + 0.7 * run).toFixed(2) : '1';
    });
    const made = index < 4 ? 0 : index === 4 ? Math.round(6 * run) : 6;
    text('count', index === 5 ? 'Polypeptides made: 6 (no more)' : `Polypeptides made: ${made}`);
    // the poly-A tail shortens over time, then nucleases break the mRNA down
    const tail = index < 4 ? 9 : index === 4 ? Math.round(9 - 3 * run) : Math.round(6 - 6 * ease(phase(t, 0, 0.35)));
    text('polya', POLY_A.slice(0, tail));
    text('polya-lbl', tail > 0 ? 'poly-A tail' : 'tail gone');
    const deg = index === 5 ? ease(phase(t, 0.45, 0.85)) : 0;
    show('nuc', index === 5 ? ease(phase(t, 0.3, 0.45)) : 0);
    show('cuts', deg);
    show('mrna-body', 1 - 0.65 * deg);
    show('half', index === 5 ? ease(phase(t, 0.8, 1)) : 0);
  }
  render(0, 0);
  return { render, durations: [3.5, 4.5, 4.5, 4.5, 5, 5] };
}
