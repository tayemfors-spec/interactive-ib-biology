import { ease, lerp, phase } from '../lib/timeline';

/*
 * Sarcomere geometry shared by the B3.3 scenes and unit tests (not a scene module: no default export).
 *
 * All lengths are in micrometres. The sliding filament model fixes the filament lengths: thick (myosin)
 * filaments are 1.6 µm long and centred on the M-line; each thin (actin) filament is 1.0 µm long and
 * fixed to a Z-line. Only the sarcomere length L (Z-line to Z-line) changes, so:
 *   A-band = myosin length (constant)            I-band = L − A-band (both half I-bands in one sarcomere)
 *   H-zone = L − 2 × actin length (≥ 0)          overlap per half = (A-band − H-zone) / 2
 */
export const SARC = {
  /** scene units per micrometre along the sarcomere axis */
  scale: 4,
  myosin: 1.6,
  actin: 1.0,
  /** central part of each thick filament with no heads (the bare zone) */
  bare: 0.18,
  relaxed: 2.4,
  contracted: 2.05,
  stretched: 2.8,
} as const;

export interface Bands {
  /** sarcomere length, Z-line to Z-line */
  L: number;
  A: number;
  I: number;
  H: number;
  /** length of actin–myosin overlap in each half of the sarcomere */
  overlap: number;
  /** x of the free (inner) end of the right-hand actin filaments, measured from the M-line */
  actinTip: number;
}

export function bandsAt(L: number): Bands {
  const A = SARC.myosin;
  const H = Math.max(0, L - 2 * SARC.actin);
  return { L, A, I: L - A, H, overlap: (A - H) / 2, actinTip: L / 2 - SARC.actin };
}

/** Durations (s) of the five steps of the sarcomere process scene. */
export const SARC_DURATIONS = [4, 5, 7, 4, 6];

/**
 * Sarcomere length at step `index`, progress t:
 *   0 relaxed · 1 Ca²⁺ arrives and cross-bridges form (no change yet) · 2 filaments slide (shortening)
 *   3 contracted (compare the bands) · 4 relaxation then stretching by the antagonist
 */
export function lengthAt(index: number, t: number): number {
  switch (index) {
    case 0:
    case 1:
      return SARC.relaxed;
    case 2:
      return lerp(SARC.relaxed, SARC.contracted, ease(t));
    case 3:
      return SARC.contracted;
    default:
      return lerp(SARC.contracted, SARC.stretched, ease(phase(t, 0.3, 1)));
  }
}
