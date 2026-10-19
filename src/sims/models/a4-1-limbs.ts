/**
 * Pentadactyl limb comparator (A4.1.4, A4.1.5). Schematic forelimb skeletons in a shared 240 × 320 frame,
 * shoulder at the top and digits at the bottom. Proportions are schematic; what must be right is the
 * topology: which bones are present, reduced or fused, how many digits there are and how many phalanges
 * each digit has. Anatomy reviewed against standard comparative-anatomy texts (Kardong; Romer & Parsons).
 */
export type BoneKey = 'humerus' | 'radius' | 'ulna' | 'carpals' | 'metacarpals' | 'phalanges';
export const boneKeys: BoneKey[] = ['humerus', 'radius', 'ulna', 'carpals', 'metacarpals', 'phalanges'];

export const boneInfo: Record<BoneKey, { name: string; plan: string }> = {
  humerus: { name: 'Humerus', plan: 'one bone in the upper arm' },
  radius: { name: 'Radius', plan: 'one of two forearm bones (thumb side)' },
  ulna: { name: 'Ulna', plan: 'the other forearm bone (forms the elbow)' },
  carpals: { name: 'Carpals', plan: 'a group of wrist bones' },
  metacarpals: { name: 'Metacarpals', plan: 'one bone at the base of each digit, in the palm' },
  phalanges: { name: 'Phalanges', plan: 'a series of bones in each digit' },
};

/** A long bone drawn as a thick rounded line. */
export interface Seg { bone: BoneKey; x1: number; y1: number; x2: number; y2: number; w: number; digit?: number }
/** A small rounded bone (carpal), drawn as an ellipse. */
export interface Blob { bone: BoneKey; cx: number; cy: number; rx: number; ry: number }

export interface Limb {
  id: string;
  name: string;
  /** What the forelimb is used for. */
  use: string;
  kind: 'homologous' | 'analogous';
  segs: Seg[];
  blobs: Blob[];
  /** Phalanges per digit, digit 1 (thumb) first; 0 = digit lost. Empty for a structure with no bones. */
  phalanges: number[];
  /** Soft-tissue outline drawn faintly behind the bones (skin membrane, flipper, feathers, hoof, wing). */
  outline?: string;
  /** Bones that are not part of the basic plan (e.g. the mole's extra sesamoid). */
  extras?: Seg[];
  notes: Record<BoneKey, string>;
}

const rad = (deg: number) => (deg * Math.PI) / 180;

/**
 * One digit from its base: a metacarpal followed by phalanges along a fixed direction.
 * `angle` is in degrees with 90 = straight down the page. Small gaps separate the bones.
 */
export function digit(n: number, x: number, y: number, angle: number, lengths: number[], widths: number[]): Seg[] {
  const dx = Math.cos(rad(angle));
  const dy = Math.sin(rad(angle));
  const out: Seg[] = [];
  let px = x;
  let py = y;
  lengths.forEach((len, i) => {
    const qx = px + dx * len;
    const qy = py + dy * len;
    out.push({ bone: i === 0 ? 'metacarpals' : 'phalanges', x1: px, y1: py, x2: qx, y2: qy, w: widths[i] ?? widths[widths.length - 1]!, digit: n });
    px = qx + dx * 2.5;
    py = qy + dy * 2.5;
  });
  return out;
}

const seg = (bone: BoneKey, x1: number, y1: number, x2: number, y2: number, w: number): Seg => ({ bone, x1, y1, x2, y2, w });
const carp = (pts: [number, number, number?][]): Blob[] => pts.map(([cx, cy, r = 4.5]) => ({ bone: 'carpals', cx, cy, rx: r, ry: r * 0.9 }));

const human: Limb = {
  id: 'human',
  name: 'Human arm',
  use: 'Grasping and manipulating objects',
  kind: 'homologous',
  segs: [
    seg('humerus', 120, 16, 118, 110, 13),
    seg('ulna', 129, 112, 134, 196, 8),
    seg('radius', 110, 120, 105, 198, 8),
    ...digit(1, 99, 224, 124, [21, 13, 11], [6, 5.5, 5]),
    ...digit(2, 107, 229, 97, [30, 17, 12, 9], [5.5, 5, 4.5, 4]),
    ...digit(3, 117, 230, 90, [32, 19, 13, 10], [5.5, 5, 4.5, 4]),
    ...digit(4, 126, 229, 84, [30, 17, 12, 9], [5.5, 5, 4.5, 4]),
    ...digit(5, 134, 225, 76, [25, 13, 10, 8], [5, 4.5, 4, 3.5]),
  ],
  blobs: carp([[103, 207], [111, 206], [119, 206], [127, 207], [101, 216], [109, 217], [118, 217], [127, 216]]),
  phalanges: [2, 3, 3, 3, 3],
  notes: {
    humerus: 'One long upper-arm bone. Its rounded head lets the shoulder rotate through a very wide range.',
    radius: 'On the thumb side. It can rotate across the ulna, so the palm can be turned up or down.',
    ulna: 'On the little-finger side. Its upper end forms the point of the elbow.',
    carpals: 'Eight small wrist bones in two rows give a flexible wrist.',
    metacarpals: 'Five, in the palm. The thumb’s metacarpal can swing across the palm, making the thumb opposable.',
    phalanges: '14 in all: 2 in the thumb and 3 in each finger, giving fine control for gripping and manipulating.',
  },
};

const bat: Limb = {
  id: 'bat',
  name: 'Bat wing',
  use: 'Flight: skin is stretched between very long fingers',
  kind: 'homologous',
  segs: [
    seg('humerus', 34, 18, 76, 84, 9),
    seg('radius', 80, 90, 120, 184, 7),
    seg('ulna', 88, 92, 99, 126, 3.5),
    ...digit(1, 131, 186, -52, [9, 7, 6], [3.5, 3, 3]),
    ...digit(2, 132, 198, 38, [60, 14, 9], [3.5, 3, 2.5]),
    ...digit(3, 129, 203, 62, [66, 29, 19], [3.5, 3, 2.5]),
    ...digit(4, 124, 205, 92, [58, 23, 15], [3.5, 3, 2.5]),
    ...digit(5, 118, 202, 122, [52, 20, 11], [3.5, 3, 2.5]),
  ],
  blobs: carp([[120, 194, 4], [128, 192, 4], [124, 200, 3.5]]),
  phalanges: [2, 2, 2, 2, 2],
  outline: 'M30 26 L120 186 L198 252 Q178 266 182 306 Q150 290 121 304 Q100 284 72 276 Q40 254 12 240 L12 52 Z',
  notes: {
    humerus: 'Long and slender, keeping the wing light.',
    radius: 'Long: the main forearm bone, forming the leading edge of the wing.',
    ulna: 'Reduced to a thin splint fused to the radius.',
    carpals: 'A few small wrist bones that let the wing fold.',
    metacarpals: 'Digits 2–5 have extremely long metacarpals that spread the wing membrane.',
    phalanges: 'Long phalanges in digits 2–5 stretch the skin membrane. The short, clawed thumb stays free for climbing.',
  },
};

const dolphin: Limb = {
  id: 'dolphin',
  name: 'Dolphin flipper',
  use: 'Swimming: a stiff paddle for steering and balance',
  kind: 'homologous',
  segs: [
    seg('humerus', 120, 18, 120, 64, 22),
    seg('radius', 107, 76, 105, 124, 15),
    seg('ulna', 133, 76, 137, 122, 15),
    ...digit(1, 94, 164, 106, [12, 9], [8, 7]),
    ...digit(2, 106, 167, 95, [17, 12, 11, 10, 9, 8, 7, 6], [9, 8.5, 8, 7.5, 7, 6, 5, 4.5]),
    ...digit(3, 122, 169, 88, [16, 12, 11, 10, 9, 8], [9, 8.5, 8, 7, 6, 5]),
    ...digit(4, 136, 167, 80, [13, 10, 8], [8, 7, 6]),
    ...digit(5, 148, 161, 68, [10, 7], [6, 5]),
  ],
  blobs: [
    ...[[102, 137], [118, 136], [134, 137], [108, 152], [123, 152], [139, 151]].map(([cx, cy]) => ({ bone: 'carpals' as const, cx: cx!, cy: cy!, rx: 7, ry: 6 })),
  ],
  phalanges: [1, 7, 5, 2, 1],
  outline: 'M100 14 Q82 90 82 160 Q84 236 102 274 Q114 290 128 264 Q152 206 166 160 Q160 82 142 14 Z',
  notes: {
    humerus: 'Very short and flattened. The shoulder is the only joint in the flipper that moves freely.',
    radius: 'Short and flat. The elbow and wrist barely move, which keeps the flipper stiff.',
    ulna: 'Short and flat, bound closely to the radius inside the flipper.',
    carpals: 'Flattened, block-like wrist bones held firmly in connective tissue.',
    metacarpals: 'Five short metacarpals inside the paddle.',
    phalanges: 'Extra phalanges (hyperphalangy) lengthen digits 2 and 3, making a long, tapering paddle.',
  },
};

const bird: Limb = {
  id: 'bird',
  name: 'Bird wing',
  use: 'Flight: feathers, not skin, form the wing surface',
  kind: 'homologous',
  segs: [
    seg('humerus', 100, 16, 112, 96, 12),
    seg('ulna', 120, 104, 141, 212, 10),
    seg('radius', 107, 108, 126, 213, 6),
    // carpometacarpus: three metacarpals fused to each other and to distal carpals
    seg('metacarpals', 127, 233, 124, 242, 6),
    seg('metacarpals', 135, 232, 139, 286, 8),
    seg('metacarpals', 147, 234, 149, 284, 5),
    seg('metacarpals', 134, 233, 147, 234, 6),
    seg('metacarpals', 139, 285, 149, 284, 5),
    // digits: alular digit 1 phalanx, major digit 2, minor digit 1
    { bone: 'phalanges', x1: 122, y1: 248, x2: 113, y2: 264, w: 5, digit: 1 },
    { bone: 'phalanges', x1: 140, y1: 292, x2: 141, y2: 306, w: 7, digit: 2 },
    { bone: 'phalanges', x1: 141, y1: 310, x2: 142, y2: 317, w: 4.5, digit: 2 },
    { bone: 'phalanges', x1: 150, y1: 290, x2: 152, y2: 300, w: 4, digit: 3 },
  ],
  blobs: carp([[130, 223, 4.5], [145, 221, 4.5]]),
  phalanges: [1, 2, 1],
  outline: 'M118 100 L142 214 L152 304 L148 318 Q196 314 230 296 Q234 236 226 176 Q214 118 190 96 Z',
  notes: {
    humerus: 'Short, strong and often hollow (air-filled). The large flight muscles pull on it.',
    radius: 'The thinner of the two forearm bones.',
    ulna: 'Thicker than the radius. The secondary flight feathers are attached along it.',
    carpals: 'Only two free wrist bones remain; the others are fused into the carpometacarpus.',
    metacarpals: 'Fused with some carpals into a single bone, the carpometacarpus, which carries the primary flight feathers.',
    phalanges: 'Only three digits remain, with few phalanges. The first carries the alula (bastard wing), used in slow flight.',
  },
};

const horse: Limb = {
  id: 'horse',
  name: 'Horse foreleg',
  use: 'Running fast on firm ground on a single hoofed digit',
  kind: 'homologous',
  segs: [
    seg('humerus', 116, 16, 132, 72, 18),
    seg('ulna', 143, 62, 134, 124, 7),
    seg('radius', 126, 82, 124, 172, 14),
    ...digit(3, 124, 206, 90, [56, 20, 9, 7], [12, 11, 11, 15]),
    seg('metacarpals', 113, 206, 116, 240, 4),
    seg('metacarpals', 135, 206, 132, 240, 4),
  ],
  blobs: [
    ...[[114, 182], [124, 182], [134, 182], [116, 194], [126, 194], [134, 194]].map(([cx, cy]) => ({ bone: 'carpals' as const, cx: cx!, cy: cy!, rx: 5.5, ry: 5 })),
  ],
  phalanges: [0, 0, 3, 0, 0],
  outline: 'M108 298 L142 298 L150 319 L100 319 Z',
  notes: {
    humerus: 'Short and massive, held close to the body.',
    radius: 'Large and strong: it carries the weight of the front of the body.',
    ulna: 'Reduced: only the upper part, forming the point of the elbow, remains, fused to the radius.',
    carpals: 'Two rows of carpals form the joint horse owners call the “knee”, which is really the wrist.',
    metacarpals: 'One large cannon bone (digit 3) carries the weight. Two thin splint bones are what is left of digits 2 and 4.',
    phalanges: 'Three phalanges in the single digit; the last is enclosed in the hoof. The horse stands on the tip of one finger.',
  },
};

const mole: Limb = {
  id: 'mole',
  name: 'Mole forelimb',
  use: 'Digging tunnels through soil',
  kind: 'homologous',
  segs: [
    seg('humerus', 98, 34, 140, 54, 26),
    seg('ulna', 134, 62, 138, 124, 11),
    seg('radius', 110, 68, 104, 124, 9),
    ...digit(1, 94, 156, 118, [16, 10, 15], [7, 6, 5]),
    ...digit(2, 104, 160, 102, [18, 9, 8, 16], [7, 6, 6, 5]),
    ...digit(3, 118, 161, 90, [19, 9, 8, 17], [7, 6, 6, 5]),
    ...digit(4, 132, 160, 78, [18, 9, 8, 16], [7, 6, 6, 5]),
    ...digit(5, 144, 156, 64, [16, 9, 7, 14], [7, 6, 5, 4.5]),
  ],
  blobs: carp([[102, 135, 5], [114, 133, 5], [126, 133, 5], [138, 135, 5], [108, 145, 5], [121, 145, 5], [134, 145, 5]]),
  extras: [seg('carpals', 86, 140, 74, 178, 6)],
  phalanges: [2, 3, 3, 3, 3],
  notes: {
    humerus: 'Extremely short, broad and robust, with large surfaces for the powerful digging muscles.',
    radius: 'Short and stout.',
    ulna: 'Short and stout, with a large projection at the elbow where muscles attach.',
    carpals: 'Wrist bones support a very broad hand. An extra sickle-shaped bone beside the thumb (grey) widens the palm; it is not a sixth digit.',
    metacarpals: 'Short and broad, giving a spade-like hand.',
    phalanges: 'Short phalanges; the last bone of each digit carries a large, flat claw for scooping soil.',
  },
};

const insectNote = 'No bones at all. An insect wing is a thin outgrowth of the exoskeleton (cuticle containing chitin), stiffened by veins and moved by muscles in the thorax.';
const insect: Limb = {
  id: 'insect',
  name: 'Insect wing',
  use: 'Flight, but the wing is not a limb and contains no bone',
  kind: 'analogous',
  segs: [],
  blobs: [],
  phalanges: [],
  notes: { humerus: insectNote, radius: insectNote, ulna: insectNote, carpals: insectNote, metacarpals: insectNote, phalanges: insectNote },
};

export const limbs: Limb[] = [human, bat, dolphin, bird, horse, mole, insect];
export const defaultShown = ['human', 'bat', 'dolphin', 'bird', 'horse', 'insect'];

/** Bone groups present in a limb. */
export function bonesPresent(l: Limb): Set<BoneKey> {
  return new Set([...l.segs, ...l.blobs].map((b) => b.bone));
}

/** Number of digits that still have bones. */
export function digitCount(l: Limb): number {
  return l.phalanges.filter((n) => n > 0).length;
}

/** Bones drawn for a given digit (metacarpal + phalanges), counted from the drawing data. */
export function drawnPhalanges(l: Limb, n: number): number {
  return l.segs.filter((s) => s.digit === n && s.bone === 'phalanges').length;
}

/** One-sentence summary of what is shown, for the live region. */
export function summary(shown: Limb[], bone: BoneKey | 'all'): string {
  if (!shown.length) return 'No animals selected. Choose at least one animal to compare.';
  const names = shown.map((l) => l.name.toLowerCase()).join(', ');
  if (bone === 'all') return `Comparing ${names}. Matching colours show the same bones in every vertebrate limb.`;
  const vert = shown.filter((l) => l.kind === 'homologous').length;
  const insects = shown.length - vert;
  return `${boneInfo[bone].name} highlighted: present in ${vert} of the ${shown.length} limbs shown${insects ? '; the insect wing has no bones' : ''}.`;
}
