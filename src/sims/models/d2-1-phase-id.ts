/**
 * D2.1.8 identify-the-phase quiz: procedurally drawn, micrograph-style onion (Allium cepa) root-tip
 * cells. Pure functions only (shared by the sim, the mitotic-index field and the unit tests).
 *
 * Allium cepa has 2n = 16, so prophase and metaphase cells show 16 chromosomes and each anaphase
 * group has 16 (the separated sister chromatids). Drawings are schematic, not traced micrographs.
 * Coordinates are in a 200 × 240 box; the division axis is vertical (along the root).
 */

export type Phase = 'interphase' | 'prophase' | 'metaphase' | 'anaphase' | 'telophase';
export const PHASES: Phase[] = ['interphase', 'prophase', 'metaphase', 'anaphase', 'telophase'];
export const MITOTIC: Phase[] = ['prophase', 'metaphase', 'anaphase', 'telophase'];
export const DIPLOID = 16;
export const W = 200, H = 240, MIDX = 100, MIDY = 120;

export const NAMES: Record<Phase, string> = {
  interphase: 'Interphase', prophase: 'Prophase', metaphase: 'Metaphase', anaphase: 'Anaphase', telophase: 'Telophase',
};

/** What to look for: shown as feedback after each answer. */
export const CLUES: Record<Phase, string> = {
  interphase: 'Interphase: one intact nucleus with evenly grainy chromatin (no separate chromosomes visible) and a dark nucleolus. Interphase is not a phase of mitosis.',
  prophase: 'Prophase: the chromosomes are visible as long, thin threads inside the nucleus as they condense; the nucleolus has gone and the nuclear membrane is breaking down.',
  metaphase: 'Metaphase: condensed chromosomes lined up in a single band across the middle (the equator) of the cell, with no nuclear membrane.',
  anaphase: 'Anaphase: two groups of chromosomes (the separated sister chromatids) moving to opposite poles, often V-shaped with the arms trailing behind the centromere.',
  telophase: 'Telophase: two compact groups of chromosomes at opposite ends of the cell, with nuclear membranes re-forming; in plant cells a cell plate forms between them.',
};

/** A neutral description of what is visible, for readers who cannot see the drawing. */
export const LOOKS: Record<Phase, string> = {
  interphase: 'One large round nucleus with a clear outline. The stain inside it is evenly grainy and there is one darker dot or two.',
  prophase: 'A nucleus with a faint, broken outline. Inside it are many long, thin, tangled dark threads; no darker dot.',
  metaphase: 'No nucleus outline. Short dark rods form a single band straight across the middle of the cell.',
  anaphase: 'No nucleus outline. Two bands of V-shaped dark rods, one in each half of the cell, with a clear gap between them.',
  telophase: 'Two dense dark patches at opposite ends of the cell, each with a faint outline, and a thin line across the middle of the cell.',
};

export type Pt = [number, number];
export interface Drawing {
  phase: Phase;
  /** rotation of the whole cell, degrees */
  rot: number;
  wall: { x: number; y: number; w: number; h: number };
  nuclei: { cx: number; cy: number; rx: number; ry: number; faint: boolean }[];
  nucleoli: { cx: number; cy: number; r: number }[];
  grains: { cx: number; cy: number; r: number }[];
  /** chromosomes or chromatids as polylines */
  chroms: { pts: Pt[]; w: number }[];
  plate: { x1: number; x2: number; y: number } | null;
}

/** Small seeded PRNG (mulberry32). */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const inEllipse = (x: number, y: number, cx: number, cy: number, rx: number, ry: number) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1;

export function drawCell(phase: Phase, seed: number): Drawing {
  const r = rng(seed * 7919 + PHASES.indexOf(phase) * 104729 + 1);
  const j = (a: number) => (r() - 0.5) * 2 * a;
  const wall = { x: 10 + j(4), y: 10 + j(4), w: 180 + j(6), h: 220 + j(6) };
  const d: Drawing = { phase, rot: j(7), wall, nuclei: [], nucleoli: [], grains: [], chroms: [], plate: null };
  const cx = MIDX + j(6), cy = MIDY + j(8);

  if (phase === 'interphase') {
    const rx = 44 + j(5), ry = 48 + j(5);
    d.nuclei.push({ cx, cy, rx, ry, faint: false });
    for (let k = 0; k < 90; k++) {
      const x = cx + j(rx), y = cy + j(ry);
      if (inEllipse(x, y, cx, cy, rx * 0.9, ry * 0.9)) d.grains.push({ cx: x, cy: y, r: 1.4 + r() * 1.4 });
    }
    const nn = r() < 0.5 ? 1 : 2;
    for (let k = 0; k < nn; k++) d.nucleoli.push({ cx: cx + j(14), cy: cy + j(16), r: 8 + r() * 4 });
  } else if (phase === 'prophase') {
    const rx = 48 + j(4), ry = 52 + j(4);
    d.nuclei.push({ cx, cy, rx, ry, faint: true });
    for (let k = 0; k < DIPLOID; k++) {
      let x = cx + j(rx * 0.6), y = cy + j(ry * 0.6);
      let a = r() * Math.PI * 2;
      const pts: Pt[] = [[x, y]];
      for (let s = 0; s < 8; s++) {
        a += j(0.9);
        let nx = x + Math.cos(a) * 6.5, ny = y + Math.sin(a) * 6.5;
        if (!inEllipse(nx, ny, cx, cy, rx * 0.88, ry * 0.88)) { a += Math.PI * 0.8; nx = x + Math.cos(a) * 6.5; ny = y + Math.sin(a) * 6.5; }
        x = nx; y = ny;
        pts.push([x, y]);
      }
      d.chroms.push({ pts, w: 2.6 });
    }
  } else if (phase === 'metaphase') {
    for (let k = 0; k < DIPLOID; k++) {
      const x = cx - 60 + (120 * (k + 0.5)) / DIPLOID + j(3);
      const y = cy + j(5);
      const len = 12 + r() * 9;
      const a = Math.PI / 2 + j(0.6);
      d.chroms.push({ pts: [[x - (Math.cos(a) * len) / 2, y - (Math.sin(a) * len) / 2], [x + (Math.cos(a) * len) / 2, y + (Math.sin(a) * len) / 2]], w: 4.2 });
    }
  } else if (phase === 'anaphase') {
    const gap = 30 + r() * 18; // distance of each group from the equator
    for (const side of [-1, 1]) {
      for (let k = 0; k < DIPLOID; k++) {
        const x = cx - 52 + (104 * (k + 0.5)) / DIPLOID + j(3);
        const y = cy + side * (gap + j(5));
        const arm = 11 + r() * 6, spread = 3 + r() * 3;
        // V shape: centromere leads towards the pole, arms trail towards the equator
        d.chroms.push({ pts: [[x - spread, y - side * arm], [x, y], [x + spread, y - side * arm]], w: 2.8 });
      }
    }
  } else {
    const off = 60 + j(6);
    for (const side of [-1, 1]) {
      const ny = cy + side * off, rx = 38 + j(4), ry = 18 + j(3);
      d.nuclei.push({ cx, cy: ny, rx: rx + 4, ry: ry + 4, faint: true });
      for (let k = 0; k < 26; k++) {
        const x = cx + j(rx * 0.85), y = ny + j(ry * 0.8);
        const a = r() * Math.PI;
        d.chroms.push({ pts: [[x - Math.cos(a) * 5, y - Math.sin(a) * 5], [x + Math.cos(a) * 5, y + Math.sin(a) * 5]], w: 3.4 });
      }
    }
    const half = 30 + r() * 50; // the cell plate grows outwards from the middle
    d.plate = { x1: cx - half, x2: cx + half, y: cy + j(3) };
  }
  return d;
}

/** A practice set of n cells with every phase at least once (n ≥ 5), in shuffled order. */
export function makeDeck(n: number, seed: number): { phase: Phase; seed: number }[] {
  const r = rng(seed);
  const phases: Phase[] = [];
  for (let i = 0; i < n; i++) phases.push(PHASES[i % PHASES.length]!);
  for (let i = phases.length - 1; i > 0; i--) { const k = Math.floor(r() * (i + 1)); [phases[i], phases[k]] = [phases[k]!, phases[i]!]; }
  return phases.map((phase, i) => ({ phase, seed: seed * 31 + i * 17 + 3 }));
}

export interface Score { answered: number; correct: number }
export const record = (s: Score, answer: Phase, truth: Phase): Score => ({ answered: s.answered + 1, correct: s.correct + (answer === truth ? 1 : 0) });

/** Number of separately drawn chromosomes or chromatids: what a student could count. */
export const countChromosomes = (d: Drawing) => (d.phase === 'telophase' || d.phase === 'interphase' ? null : d.chroms.length);
