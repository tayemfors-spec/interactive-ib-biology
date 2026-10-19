/**
 * Dentition and diet in the Hominidae (B4.2.8). Schematic side views of four skulls, face to the left,
 * in a shared 260 × 200 frame with the biting (occlusal) plane at y = OCC. Skulls are drawn to the same
 * size so features can be compared; they are not to scale. What must be right is the presence or absence
 * of features (sagittal crest, chin, diastema, projecting canines) and the relative size of front and
 * cheek teeth within each skull. Descriptions checked against Wood (Human Evolution, 2019), Ungar
 * (Evolution's Bite, 2017), Brown et al. 2004 and Kaifu et al. 2015 (H. floresiensis teeth),
 * Sutikna et al. 2016 (Liang Bua dates). See facts.yaml.
 */
export const OCC = 132;

export type ToothKind = 'incisor' | 'canine' | 'premolar' | 'molar' | 'gap';
export interface Tooth { kind: ToothKind; /** width along the tooth row */ w: number; /** crown height */ h: number }

export type FeatureKey = 'cheek' | 'front' | 'muscles' | 'jaw';
export const featureKeys: FeatureKey[] = ['cheek', 'front', 'muscles', 'jaw'];
export const featureNames: Record<FeatureKey, string> = {
  cheek: 'Molars and premolars',
  front: 'Incisors and canines',
  muscles: 'Chewing muscles and crests',
  jaw: 'Jaw and face',
};

export type Diet = 'herbivore' | 'omnivore';

export interface Hominid {
  id: string;
  name: string;
  /** shown in italics */
  latin: string;
  living: boolean;
  where: string;
  cranium: string;
  orbit: [number, number, number, number];
  brow?: string;
  zyg: string;
  /** external ear opening, just behind the jaw joint */
  ear: [number, number];
  mandible: string;
  temporalis: string;
  crest?: string;
  teethX: number;
  teeth: Tooth[];
  notes: Record<FeatureKey, string>;
  diet: Diet;
  verdict: string;
}

const t = (kind: ToothKind, w: number, h: number): Tooth => ({ kind, w, h });

export const hominids: Hominid[] = [
  {
    id: 'gorilla',
    name: 'Gorilla (living)',
    latin: 'Gorilla gorilla',
    living: true,
    where: 'Living reference species. Gorillas eat mainly leaves, stems, pith and fruit, with a few insects, so their diet can be watched and compared with their teeth.',
    cranium: 'M26 124 L132 124 L140 114 L196 116 C216 116 232 100 236 80 C238 62 226 50 208 44 C180 36 130 38 104 52 C94 58 86 62 78 62 C66 62 58 66 60 74 C50 84 36 96 30 106 C26 112 26 118 26 124 Z',
    orbit: [84, 82, 11, 10],
    zyg: 'M98 100 L182 100',
    ear: [192, 102],
    brow: 'M56 72 C64 58 96 57 106 66',
    mandible: 'M28 128 L132 128 L138 126 L150 94 L158 94 L166 108 L174 98 L186 96 L188 104 L186 150 C184 160 176 166 164 168 L52 168 C42 166 36 158 32 146 C30 142 28 134 28 128 Z',
    temporalis: 'M98 96 C92 64 110 44 140 34 C176 26 216 36 226 60 C230 82 206 98 166 104 Z',
    crest: 'M110 50 C136 26 186 24 220 46 L216 50 C186 34 140 36 112 54 Z',
    teethX: 28,
    teeth: [t('incisor', 8, 12), t('incisor', 7, 11), t('gap', 7, 0), t('canine', 12, 30), t('premolar', 12, 13), t('premolar', 11, 12), t('molar', 14, 13), t('molar', 15, 13), t('molar', 14, 12)],
    notes: {
      cheek: 'Large molars with tall, sharp shearing crests that slice tough leaves and stems. The enamel is relatively thin.',
      front: 'Very large canines, especially in males, used in display and fighting, not for eating meat. A gap (diastema) in the upper tooth row takes the tip of the lower canine.',
      muscles: 'Very large temporalis (chewing) muscles. In adult males they meet at the top of the skull, where a bony sagittal crest gives them a bigger area to attach to.',
      jaw: 'Long, projecting jaws and a large, deep lower jaw (mandible) with no chin.',
    },
    diet: 'herbivore',
    verdict: 'Herbivore. Field studies confirm a diet of leaves, stems and fruit: this is the kind of observation that the theory linking teeth to diet is built on.',
  },
  {
    id: 'paranthropus',
    name: 'Paranthropus robustus',
    latin: 'Paranthropus robustus',
    living: false,
    where: 'Extinct. Fossils from caves in South Africa (such as Swartkrans), roughly 2 to 1 million years old.',
    cranium: 'M54 124 L148 124 L154 114 L194 116 C214 116 228 102 230 84 C232 62 214 44 186 40 C156 34 120 40 100 56 C92 62 84 66 78 70 C72 72 70 76 74 80 C64 92 58 104 56 114 C55 118 54 122 54 124 Z',
    orbit: [88, 86, 11, 10],
    zyg: 'M84 104 L176 102',
    ear: [188, 104],
    mandible: 'M56 128 L148 128 L152 126 L160 96 L168 96 L174 108 L180 98 L192 96 L194 104 L192 160 C190 172 180 180 166 182 L70 182 C60 180 54 172 54 162 C54 152 55 140 56 128 Z',
    temporalis: 'M100 100 C94 68 108 48 136 40 C166 32 200 42 210 64 C214 86 196 100 166 106 Z',
    crest: 'M112 52 C136 30 176 30 200 46 L198 50 C174 38 138 38 114 56 Z',
    teethX: 56,
    teeth: [t('incisor', 5, 8), t('incisor', 5, 8), t('canine', 6, 9), t('premolar', 13, 12), t('premolar', 14, 12), t('molar', 16, 13), t('molar', 17, 13), t('molar', 17, 12)],
    notes: {
      cheek: 'Very large, broad, flat-topped molars, and premolars enlarged to work like extra molars, all with very thick enamel: a large grinding surface that resists wear.',
      front: 'Small incisors and canines, crowded together at the front of the jaw. Little biting, slicing or tearing was done with the front teeth.',
      muscles: 'Huge temporalis muscles. Many adult skulls, especially of males, have a sagittal crest, and wide, flaring cheekbones (zygomatic arches) leave room for the muscles to pass.',
      jaw: 'A very deep, thick mandible with no chin, and a broad, flat, dish-shaped face that braced the skull against strong chewing forces.',
    },
    diet: 'herbivore',
    verdict: 'Herbivore: the teeth and muscles suggest heavy, prolonged grinding of tough or hard plant foods such as seeds, nuts, roots and tough stems. Tooth wear and chemical (isotope) studies suggest the diet was more varied, so this is a hypothesis, not a certainty.',
  },
  {
    id: 'floresiensis',
    name: 'Homo floresiensis',
    latin: 'Homo floresiensis',
    living: false,
    where: 'Extinct. Liang Bua cave on the island of Flores, Indonesia. Skeletons about 100 000 to 60 000 years old; adults about 1.1 m tall with a brain of about 400 cm³.',
    cranium: 'M56 124 L124 124 L130 114 L184 116 C204 116 220 104 224 86 C228 62 210 42 178 38 C146 34 110 40 92 56 C84 62 74 66 70 72 C66 78 66 82 70 86 C62 96 58 108 57 116 C56 120 56 122 56 124 Z',
    orbit: [84, 90, 10, 9],
    zyg: 'M94 104 L168 104',
    ear: [178, 106],
    brow: 'M62 80 C70 70 92 70 102 78',
    mandible: 'M58 128 L124 128 L128 126 L140 100 L148 100 L154 110 L160 100 L170 98 L172 106 L168 150 C166 160 160 166 150 168 L68 170 C60 168 56 160 56 152 C56 142 57 134 58 128 Z',
    temporalis: 'M96 98 C90 70 108 52 134 50 C164 48 190 62 192 84 C192 98 176 104 150 106 Z',
    teethX: 58,
    teeth: [t('incisor', 6, 8), t('incisor', 6, 8), t('canine', 7, 10), t('premolar', 8, 9), t('premolar', 8, 9), t('molar', 10, 9), t('molar', 10, 9), t('molar', 9, 8)],
    notes: {
      cheek: 'Small molars in a short tooth row, similar in size and shape to those of small modern humans. The premolars keep some ancestral (primitive) features.',
      front: 'Small canines that do not project beyond the other teeth, and no gap in the tooth row.',
      muscles: 'No sagittal crest: the chewing muscles were moderate in size and did not reach the top of the skull.',
      jaw: 'A small skull and jaw. The mandible is quite robust but has no chin.',
    },
    diet: 'omnivore',
    verdict: 'Omnivore: small, unspecialized teeth like ours. Stone tools and bones of animals, including young Stegodon (an extinct relative of elephants), some with cut marks, are found with the remains, which supports meat in the diet alongside plant foods.',
  },
  {
    id: 'sapiens',
    name: 'Homo sapiens (modern human)',
    latin: 'Homo sapiens',
    living: true,
    where: 'Living. Our diet is known and very varied: plant foods and meat, mostly processed with tools and cooked.',
    cranium: 'M72 124 L142 124 L150 114 L190 118 C214 120 232 104 236 84 C240 52 214 18 168 14 C120 10 82 26 70 50 C64 60 64 68 68 74 C62 84 62 96 66 108 C68 114 70 120 72 124 Z',
    orbit: [86, 84, 11, 10],
    zyg: 'M96 102 L176 104',
    ear: [186, 106],
    mandible: 'M74 128 L142 128 L146 126 L156 100 L162 100 L166 110 L172 100 L180 98 L182 106 L178 146 C176 156 170 162 160 164 L84 168 C74 168 68 164 68 156 C68 146 72 136 74 128 Z',
    temporalis: 'M100 92 C96 60 120 36 152 34 C186 34 206 54 204 80 C200 96 180 104 160 106 Z',
    teethX: 74,
    teeth: [t('incisor', 6, 8), t('incisor', 6, 8), t('canine', 7, 10), t('premolar', 7, 9), t('premolar', 7, 9), t('molar', 10, 9), t('molar', 10, 9), t('molar', 9, 8)],
    notes: {
      cheek: 'Small molars with low, rounded cusps and fairly thick enamel: good for crushing a mixed diet, not specialized for shearing leaves or grinding very hard seeds.',
      front: 'Small, spade-shaped incisors and small canines that do not project above the other teeth. No gap in the tooth row.',
      muscles: 'Small temporalis muscles that stay low on the side of the skull, so there is no sagittal crest.',
      jaw: 'Short jaws tucked under a flat face, and a chin. Tools and cooking soften food, so much less chewing force is needed.',
    },
    diet: 'omnivore',
    verdict: 'Omnivore. We know our own diet, so humans, like gorillas, are a check on the theory: small, unspecialized teeth go with a varied diet of plant foods and meat.',
  },
];

export const defaultShown = hominids.map((h) => h.id);

/** x positions of each tooth along the row (gaps included), for drawing. */
export function toothLayout(h: Hominid): { tooth: Tooth; x: number }[] {
  let x = h.teethX;
  return h.teeth.map((tooth) => {
    const out = { tooth, x };
    x += tooth.w;
    return out;
  });
}

/** Share of the tooth row (by width, gaps excluded) taken up by premolars and molars. */
export function cheekShare(h: Hominid): number {
  const teeth = h.teeth.filter((x) => x.kind !== 'gap');
  const total = teeth.reduce((s, x) => s + x.w, 0);
  const cheek = teeth.filter((x) => x.kind === 'premolar' || x.kind === 'molar').reduce((s, x) => s + x.w, 0);
  return cheek / total;
}

/** Ratio of the biggest canine to the biggest molar crown height: high for projecting canines. */
export function canineRatio(h: Hominid): number {
  const c = Math.max(...h.teeth.filter((x) => x.kind === 'canine').map((x) => x.h));
  const m = Math.max(...h.teeth.filter((x) => x.kind === 'molar').map((x) => x.h));
  return c / m;
}

export function featureFor(kind: ToothKind): FeatureKey | null {
  if (kind === 'premolar' || kind === 'molar') return 'cheek';
  if (kind === 'incisor' || kind === 'canine') return 'front';
  return null;
}

export function summary(shown: Hominid[], feature: FeatureKey | 'all'): string {
  if (!shown.length) return 'Choose at least one skull to compare.';
  const names = shown.map((h) => h.latin).join(', ');
  if (feature === 'all') return `Showing ${names}. Pick a feature to compare it across the skulls, then decide on each diet.`;
  return `Comparing ${featureNames[feature].toLowerCase()}: ${shown.map((h) => `${h.latin}: ${h.notes[feature]}`).join(' ')}`;
}
