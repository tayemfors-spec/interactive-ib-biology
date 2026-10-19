/**
 * Magnification maths for A2.2.2: magnification = image size ÷ actual size.
 * All lengths are converted to micrometres (µm) internally. Pure functions, shared by the server render,
 * the browser and the unit tests.
 */
export type Unit = 'mm' | 'µm' | 'nm';
export const UNITS: Unit[] = ['mm', 'µm', 'nm'];
/** How many micrometres are in one of each unit (1 mm = 1000 µm, 1 µm = 1000 nm). */
export const UM_PER: Record<Unit, number> = { mm: 1000, 'µm': 1, nm: 0.001 };

export const toUm = (value: number, unit: Unit) => value * UM_PER[unit];
export const fromUm = (um: number, unit: Unit) => um / UM_PER[unit];
export const isUnit = (u: string): u is Unit => (UNITS as string[]).includes(u);

export const magnification = (imageUm: number, actualUm: number) => imageUm / actualUm;
export const actualSize = (imageUm: number, mag: number) => imageUm / mag;
export const imageSize = (actualUm: number, mag: number) => actualUm * mag;

/** The unit an examiner would expect for a length: nm below 1 µm, mm from 1000 µm, otherwise µm. */
export function bestUnit(um: number): Unit {
  const a = Math.abs(um);
  if (a < 1) return 'nm';
  if (a >= 1000) return 'mm';
  return 'µm';
}

/** Round to `n` significant figures (avoids floating-point tails such as 2.4999999). */
export const sig = (x: number, n = 4) => (x === 0 || !Number.isFinite(x) ? x : Number(x.toPrecision(n)));

/** Format a number for display, e.g. 12000 → "12,000", 0.0250 → "0.025". */
export function fmt(x: number, n = 4): string {
  if (!Number.isFinite(x)) return '–';
  return sig(x, n).toLocaleString('en-GB', { maximumFractionDigits: 6 });
}
export const fmtLen = (um: number, unit: Unit, n = 4) => `${fmt(fromUm(um, unit), n)} ${unit}`;
export const fmtMag = (m: number) => `×${fmt(m, 3)}`;

export type Mode = 'magnification' | 'actual' | 'image';
export interface Inputs {
  image?: { value: number; unit: Unit };
  actual?: { value: number; unit: Unit };
  mag?: number;
  /** Unit to give a length answer in; defaults to bestUnit (actual size) or mm (image size). */
  outUnit?: Unit;
}
export interface Working { ok: boolean; result: number; text: string; steps: string[] }

const bad = (msg: string): Working => ({ ok: false, result: NaN, text: msg, steps: [] });
const positive = (x: number | undefined): x is number => typeof x === 'number' && Number.isFinite(x) && x > 0;

/** Solve for one of the three quantities from the other two, with the working an examiner wants to see. */
export function solve(mode: Mode, inp: Inputs): Working {
  const conv = (label: string, q: { value: number; unit: Unit }) =>
    q.unit === 'µm' ? `${label} = ${fmt(q.value)} µm` : `${label} = ${fmt(q.value)} ${q.unit} = ${fmt(toUm(q.value, q.unit))} µm (1 ${q.unit === 'mm' ? 'mm = 1,000 µm' : 'µm = 1,000 nm'})`;
  if (mode === 'magnification') {
    if (!inp.image || !positive(inp.image.value) || !inp.actual || !positive(inp.actual.value)) return bad('Enter a positive image size and actual size.');
    const I = toUm(inp.image.value, inp.image.unit), A = toUm(inp.actual.value, inp.actual.unit);
    const M = magnification(I, A);
    return {
      ok: true, result: M, text: `Magnification = ${fmtMag(M)}`,
      steps: [
        'Magnification = image size ÷ actual size',
        `Use the same units for both lengths: ${conv('image size', inp.image)}; ${conv('actual size', inp.actual)}.`,
        `Magnification = ${fmt(I)} µm ÷ ${fmt(A)} µm = ${fmtMag(M)}`,
        'The units cancel, so a magnification has no units: write it as ×' + fmt(M, 3) + '.',
      ],
    };
  }
  if (!positive(inp.mag)) return bad('Enter a magnification greater than 0.');
  const M = inp.mag;
  if (mode === 'actual') {
    if (!inp.image || !positive(inp.image.value)) return bad('Enter a positive image size.');
    const I = toUm(inp.image.value, inp.image.unit);
    const A = actualSize(I, M);
    const unit = inp.outUnit ?? bestUnit(A);
    const steps = [
      'Rearrange: actual size = image size ÷ magnification',
      `${conv('Image size', inp.image)}.`,
      `Actual size = ${fmt(I)} µm ÷ ${fmt(M)} = ${fmt(A)} µm`,
    ];
    if (unit !== 'µm') steps.push(`In ${unit}: ${fmt(A)} µm = ${fmtLen(A, unit)}`);
    return { ok: true, result: A, text: `Actual size = ${fmtLen(A, unit)}`, steps };
  }
  if (!inp.actual || !positive(inp.actual.value)) return bad('Enter a positive actual size.');
  const A = toUm(inp.actual.value, inp.actual.unit);
  const I = imageSize(A, M);
  const unit = inp.outUnit ?? 'mm';
  const steps = [
    'Rearrange: image size = actual size × magnification',
    `${conv('Actual size', inp.actual)}.`,
    `Image size = ${fmt(A)} µm × ${fmt(M)} = ${fmt(I)} µm`,
  ];
  if (unit !== 'µm') steps.push(`In ${unit}: ${fmt(I)} µm = ${fmtLen(I, unit)}`);
  return { ok: true, result: I, text: `Image size = ${fmtLen(I, unit)}`, steps };
}

// ---------- scale bars ----------

/** Length (in mm) to draw a scale bar that represents `representsUm` on an image at magnification `mag`. */
export const scaleBarMm = (representsUm: number, mag: number) => (representsUm * mag) / 1000;
/** Magnification of an image whose scale bar measures `barMm` and is labelled `representsUm`. */
export const magFromScaleBar = (barMm: number, representsUm: number) => (barMm * 1000) / representsUm;

/** A round value (1, 2 or 5 × 10ⁿ µm) whose scale bar would be 10–50 mm long at this magnification. */
export function niceScaleBar(mag: number): { representsUm: number; barMm: number } {
  const target = 25 / (mag / 1000); // µm represented by 25 mm
  const p = 10 ** Math.floor(Math.log10(target));
  const options = [1, 2, 5, 10].map((k) => k * p);
  const representsUm = options.reduce((best, v) => (Math.abs(Math.log(v / target)) < Math.abs(Math.log(best / target)) ? v : best), options[0]!);
  return { representsUm: sig(representsUm, 6), barMm: scaleBarMm(representsUm, mag) };
}

/** Conversion step for a scale-bar label that is not in µm, e.g. "50 nm = 0.05 µm (1 µm = 1,000 nm)". */
function labelToUm(representsUm: number, labelUnit: Unit): string[] {
  if (labelUnit === 'µm') return [];
  const rule = labelUnit === 'nm' ? '1 µm = 1,000 nm' : '1 mm = 1,000 µm';
  return [`Convert the label to µm: ${fmt(fromUm(representsUm, labelUnit))} ${labelUnit} = ${fmt(representsUm)} µm (${rule})`];
}

export function scaleBarWorking(representsUm: number, mag: number, labelUnit: Unit = 'µm'): Working {
  if (!positive(representsUm) || !positive(mag)) return bad('Enter a positive length and magnification.');
  const um = representsUm * mag;
  const mm = scaleBarMm(representsUm, mag);
  return {
    ok: true, result: mm, text: `Draw the scale bar ${fmt(mm)} mm long`,
    steps: [
      'Length of scale bar = length it represents × magnification',
      ...labelToUm(representsUm, labelUnit),
      `= ${fmt(representsUm)} µm × ${fmt(mag)} = ${fmt(um)} µm`,
      `Convert to mm to measure with a ruler: ${fmt(um)} µm ÷ 1,000 = ${fmt(mm)} mm`,
    ],
  };
}

export function readScaleBarWorking(barMm: number, representsUm: number, labelUnit: Unit = 'µm'): Working {
  if (!positive(barMm) || !positive(representsUm)) return bad('Enter a positive bar length and label.');
  const M = magFromScaleBar(barMm, representsUm);
  return {
    ok: true, result: M, text: `Magnification = ${fmtMag(M)}`,
    steps: [
      'Magnification = measured length of scale bar ÷ length it represents',
      ...labelToUm(representsUm, labelUnit),
      `Same units: ${fmt(barMm)} mm = ${fmt(barMm * 1000)} µm`,
      `Magnification = ${fmt(barMm * 1000)} µm ÷ ${fmt(representsUm)} µm = ${fmtMag(M)}`,
    ],
  };
}

// ---------- practice questions ----------

/** Real structures with typical sizes in µm (checked in facts.yaml). */
export const SPECIMENS = [
  { name: 'a mitochondrion', what: 'length', um: 3 },
  { name: 'a chloroplast', what: 'length', um: 5 },
  { name: 'a nucleus', what: 'diameter', um: 8 },
  { name: 'a red blood cell', what: 'diameter', um: 7.5 },
  { name: 'a Bacillus cell', what: 'length', um: 3 },
  { name: 'a Staphylococcus cell', what: 'diameter', um: 1 },
  { name: 'a human cheek cell', what: 'diameter', um: 60 },
  { name: 'an 80S ribosome', what: 'diameter', um: 0.025 },
  { name: 'a lysosome', what: 'diameter', um: 0.5 },
  { name: 'a Paramecium', what: 'length', um: 200 },
] as const;
export const MAGS = [40, 100, 400, 1000, 2000, 4000, 5000, 10000, 20000, 25000, 50000, 100000, 200000, 500000, 1000000];

export type QKind = 'actual' | 'magnification' | 'image' | 'scalebar';
export interface Question {
  kind: QKind;
  text: string;
  answer: number;
  /** The unit the answer must be given in ('×' for a magnification). */
  unit: Unit | '×';
  working: string[];
}

/** Make a random exam-style question. `rand` returns numbers in [0, 1). */
export function makeQuestion(rand: () => number, kind?: QKind): Question {
  const kinds: QKind[] = ['actual', 'magnification', 'image', 'scalebar'];
  const k = kind ?? kinds[Math.floor(rand() * kinds.length)]!;
  const sp = SPECIMENS[Math.floor(rand() * SPECIMENS.length)]!;
  // magnifications that give an image 15–120 mm long
  const fits = MAGS.filter((m) => { const mm = (sp.um * m) / 1000; return mm >= 15 && mm <= 120; });
  const M = fits[Math.floor(rand() * fits.length)] ?? 1000;
  const imageMm = sig((sp.um * M) / 1000, 3);
  const outUnit: Unit = bestUnit(sp.um);
  if (k === 'actual') {
    const w = solve('actual', { image: { value: imageMm, unit: 'mm' }, mag: M, outUnit });
    return { kind: k, text: `In a micrograph at ${fmtMag(M)}, the ${sp.what} of ${sp.name} measures ${fmt(imageMm)} mm. Calculate its actual ${sp.what} in ${outUnit}.`, answer: sig(fromUm(w.result, outUnit)), unit: outUnit, working: w.steps };
  }
  if (k === 'magnification') {
    const w = solve('magnification', { image: { value: imageMm, unit: 'mm' }, actual: { value: fromUm(sp.um, outUnit), unit: outUnit } });
    return { kind: k, text: `The ${sp.what} of ${sp.name} is ${fmtLen(sp.um, outUnit)}. In a drawing its ${sp.what} is ${fmt(imageMm)} mm. Calculate the magnification of the drawing.`, answer: sig(w.result), unit: '×', working: w.steps };
  }
  if (k === 'image') {
    const w = solve('image', { actual: { value: fromUm(sp.um, outUnit), unit: outUnit }, mag: M, outUnit: 'mm' });
    return { kind: k, text: `${sp.name[0]!.toUpperCase()}${sp.name.slice(1)} has a ${sp.what} of ${fmtLen(sp.um, outUnit)}. How long, in mm, should it be drawn at ${fmtMag(M)}?`, answer: sig(fromUm(w.result, 'mm')), unit: 'mm', working: w.steps };
  }
  const bar = niceScaleBar(M);
  const barUnit = bestUnit(bar.representsUm);
  const w = readScaleBarWorking(bar.barMm, bar.representsUm, barUnit);
  return { kind: k, text: `A scale bar on a micrograph is ${fmt(bar.barMm)} mm long and is labelled ${fmtLen(bar.representsUm, barUnit)}. Calculate the magnification of the micrograph.`, answer: sig(w.result), unit: '×', working: w.steps };
}

/** Accept an answer within 2 % of the correct value (allows for sensible rounding). */
export const checkAnswer = (given: number, q: Question) => Number.isFinite(given) && given > 0 && Math.abs(given - q.answer) / q.answer <= 0.02;
