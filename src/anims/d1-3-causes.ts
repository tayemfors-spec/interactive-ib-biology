import { ease, lerp, phase } from '../lib/timeline';

export const MAIN_X = 134; // x of the first base pair in panels 0–1
export const PITCH = 28; // spacing of base pairs in panels 0–1
export const BOX = 22; // base box width
export const Y_TOP = 70; // top of the upper strand's base boxes
export const Y_BOT = 100; // top of the lower strand's base boxes
export const SM = 20; // small base box (daughter molecules)
export const SMP = 24; // small base pitch
export const DX: [number, number] = [24, 280]; // x of the two daughter molecules
export const RAD_X = 36; // first base pair in the radiation panel

const PANELS = 5;
const ADDUCT_DOCK: [number, number] = [184, 146];
const ADDUCT_START: [number, number] = [98, 150];

/**
 * One panel per step: 0 replication error, 1 chemical mutagen, 2 radiation, 3 randomness,
 * 4 somatic vs germ-line. Each step's completed state (t = 1) shows the whole panel.
 */
export function create(svg: SVGSVGElement) {
  const q = <T extends SVGElement>(k: string) => svg.querySelector<T>(`[data-el="${k}"]`)!;
  const show = (el: SVGElement, o: number) => { el.style.opacity = o.toFixed(2); };
  const panels = Array.from({ length: PANELS }, (_, i) => q<SVGGElement>(`p${i}`));

  const newBases = Array.from({ length: 9 }, (_, i) => q<SVGGElement>(`p0-n${i}`));
  const pol = q<SVGGElement>('p0-pol');
  const bb = q<SVGLineElement>('p0-bb');
  const mis = q<SVGGElement>('p0-mis');
  const next0 = q<SVGGElement>('p0-next');

  const smoke = Array.from({ length: 5 }, (_, k) => q<SVGCircleElement>(`p1-s${k}`));
  const bap = q<SVGGElement>('p1-bap');
  const lbl1 = q<SVGGElement>('p1-lbl');
  const next1 = q<SVGGElement>('p1-next');

  const uv = q<SVGGElement>('p2-uv');
  const dimer = q<SVGGElement>('p2-dimer');
  const ion = q<SVGGElement>('p2-ion');
  const brk = q<SVGGElement>('p2-break');
  const bridge = q<SVGGElement>('p2-bridge');
  const notes = q<SVGGElement>('p2-notes');

  const marksA = Array.from({ length: 6 }, (_, k) => q<SVGPolygonElement>(`p3-a${k}`));
  const marksB = Array.from({ length: 6 }, (_, k) => q<SVGPolygonElement>(`p3-b${k}`));
  const hot = q<SVGGElement>('p3-hot');
  const note3 = q<SVGGElement>('p3-note');

  const p4 = ['s2', 's3', 'g2', 'g3', 'g4'].map((k) => q<SVGGElement>(`p4-${k}`));
  const p4Times: [number, number][] = [[0.05, 0.25], [0.25, 0.45], [0.35, 0.55], [0.55, 0.7], [0.7, 0.88]];

  function render(index: number, t: number) {
    panels.forEach((p, i) => show(p, i === index ? 1 : 0));

    // panel 0: DNA polymerase builds the new strand and adds T opposite G at position 4
    {
      const u = index === 0 ? ease(phase(t, 0, 0.6)) : 1;
      const end = MAIN_X + 9 * PITCH + 15;
      const x = lerp(MAIN_X - 30, end, u);
      pol.setAttribute('transform', `translate(${x.toFixed(1)} 112)`);
      newBases.forEach((g, i) => show(g, x >= MAIN_X + i * PITCH + BOX ? 1 : 0));
      bb.setAttribute('x2', Math.min(x - 22, MAIN_X + 8 * PITCH + BOX + 4).toFixed(1));
      show(mis, x >= MAIN_X + 4 * PITCH + BOX ? 1 : 0);
      show(next0, index === 0 ? ease(phase(t, 0.65, 0.9)) : 1);
    }

    // panel 1: a mutagen from tobacco smoke bonds to a guanine
    {
      const u = index === 1 ? t : 1;
      smoke.forEach((c, k) => {
        const s = phase(u, k * 0.08, 0.45 + k * 0.08);
        c.setAttribute('cx', lerp(104, 150 + k * 8, s).toFixed(1));
        c.setAttribute('cy', lerp(150, 120 - k * 10, s).toFixed(1));
        show(c, s > 0 && s < 1 ? 0.35 * Math.sin(Math.PI * s) + 0.1 : 0);
      });
      const m = ease(phase(u, 0.1, 0.55));
      bap.setAttribute('transform', `translate(${lerp(ADDUCT_START[0], ADDUCT_DOCK[0], m).toFixed(1)} ${lerp(ADDUCT_START[1], ADDUCT_DOCK[1], m).toFixed(1)})`);
      show(lbl1, u >= 0.55 ? 1 : 0);
      show(next1, ease(phase(u, 0.62, 0.88)));
    }

    // panel 2: UV makes a thymine dimer; ionizing radiation breaks both strands
    {
      const u = index === 2 ? t : 1;
      uv.setAttribute('transform', `translate(0 ${lerp(-10, 0, ease(phase(u, 0, 0.2))).toFixed(1)})`);
      show(dimer, ease(phase(u, 0.18, 0.32)));
      ion.setAttribute('transform', `translate(0 ${lerp(-10, 0, ease(phase(u, 0.3, 0.45))).toFixed(1)})`);
      show(ion, phase(u, 0.28, 0.35));
      const b = ease(phase(u, 0.45, 0.58));
      show(brk, b);
      show(bridge, 1 - b);
      show(notes, ease(phase(u, 0.62, 0.85)));
    }

    // panel 3: mutations appear at random places in two cells; one hotspot
    {
      const u = index === 3 ? t : 1;
      for (let k = 0; k < 6; k++) {
        show(marksA[k]!, u >= 0.05 + k * 0.11 ? 1 : 0);
        show(marksB[k]!, u >= 0.1 + k * 0.11 ? 1 : 0);
      }
      show(hot, ease(phase(u, 0.72, 0.82)));
      show(note3, ease(phase(u, 0.8, 0.92)));
    }

    // panel 4: somatic mutation → clone (not inherited); germ-line mutation → gamete → every cell of offspring
    {
      const u = index === 4 ? t : 1;
      p4.forEach((g, i) => show(g, ease(phase(u, p4Times[i]![0], p4Times[i]![1]))));
    }
  }

  render(0, 0);
  return { render, durations: [6, 5.5, 5.5, 6, 6] };
}
