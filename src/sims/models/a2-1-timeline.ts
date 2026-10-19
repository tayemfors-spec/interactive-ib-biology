/**
 * Early-Earth timeline for A2.1. Ages are in billions of years ago (Ga) and use only widely cited
 * values; every one is recorded with its confidence in src/content/topics/a2-1/facts.yaml.
 * `range` gives the spread of published estimates where it matters.
 */
export type Certainty = 'well established' | 'widely accepted' | 'debated';

export interface EarlyEvent {
  id: string;
  /** Best single estimate, Ga. */
  ga: number;
  /** Spread of estimates [older, younger], Ga. */
  range?: [number, number];
  title: string;
  text: string;
  /** Which approach the date or evidence comes from. */
  method: string;
  certainty: Certainty;
}

/** Age of the Earth, Ga. */
export const EARTH_AGE = 4.54;
/** Great Oxidation Event, Ga (start of lasting free O₂ in the atmosphere). */
export const GOE = 2.4;

const list: EarlyEvent[] = [
  {
    id: 'earth', ga: 4.54, range: [4.59, 4.49], certainty: 'well established',
    title: 'Earth forms',
    text: 'The Earth forms from material orbiting the young Sun. Its surface is at first molten and there is no free oxygen.',
    method: 'Radiometric dating of meteorites and the oldest minerals',
  },
  {
    id: 'oceans', ga: 4.4, certainty: 'widely accepted',
    title: 'Liquid water and oceans',
    text: 'The oldest known mineral grains (zircon crystals from Jack Hills, Western Australia) have oxygen isotope ratios suggesting they formed in contact with liquid water, so oceans may have existed by this time.',
    method: 'Radiometric (uranium–lead) dating and oxygen isotopes of zircons',
  },
  {
    id: 'jack-hills', ga: 4.1, certainty: 'debated',
    title: 'Possible carbon from life in a zircon',
    text: 'A tiny flake of graphite sealed inside a 4.1 billion-year-old zircon has a low ¹³C/¹²C ratio, like carbon fixed by organisms. One sample only, and the ratio could have a non-living cause.',
    method: 'Carbon isotope ratio',
  },
  {
    id: 'luca', ga: 4.2, range: [4.33, 3.9], certainty: 'debated',
    title: 'LUCA (molecular-clock estimates)',
    text: 'Molecular-clock studies place the last universal common ancestor before the oldest accepted fossils. A large 2024 study estimated about 4.2 billion years ago; other studies give somewhat younger dates. All have wide error margins.',
    method: 'Molecular clock calibrated with fossils',
  },
  {
    id: 'vent-fossils', ga: 3.77, range: [4.28, 3.77], certainty: 'debated',
    title: 'Possible microfossils in vent deposits',
    text: 'Tubes and filaments of iron oxide in rocks of the Nuvvuagittuq belt (Quebec, Canada), thought to have formed at seafloor hydrothermal vents, have been interpreted as fossil microbes. The rocks are at least 3.77 and possibly 4.28 billion years old; whether the structures are biological is disputed.',
    method: 'Fossils in ancient hydrothermal vent precipitates',
  },
  {
    id: 'isua', ga: 3.7, certainty: 'widely accepted',
    title: 'Isotopic evidence of life, Greenland',
    text: 'Graphite in 3.7 billion-year-old sedimentary rocks from Isua, West Greenland, is depleted in ¹³C, as expected for carbon fixed by living organisms. This is some of the oldest widely cited evidence of life, though not all researchers accept it.',
    method: 'Carbon isotope ratio',
  },
  {
    id: 'stromatolites', ga: 3.48, range: [3.48, 3.43], certainty: 'widely accepted',
    title: 'Stromatolites, Western Australia',
    text: 'Layered stromatolites in the Pilbara region (Strelley Pool and Dresser formations) were built by mats of microbes trapping sediment. These are the oldest widely accepted fossil evidence of life.',
    method: 'Fossils in rocks dated radiometrically',
  },
  {
    id: 'goe', ga: 2.4, range: [2.45, 2.32], certainty: 'well established',
    title: 'Great Oxidation Event',
    text: 'Oxygen released by photosynthetic cyanobacteria starts to build up in the atmosphere. An ozone layer can now form and begins to absorb ultraviolet radiation.',
    method: 'Chemistry of sedimentary rocks (e.g. sulfur isotopes, oxidized iron)',
  },
  {
    id: 'eukaryotes', ga: 1.6, certainty: 'widely accepted',
    title: 'Eukaryotic cells in the fossil record',
    text: 'Fossils of eukaryotic cells are clearly present by about 1.6 billion years ago, so for roughly the first two billion years of life all organisms were prokaryotes.',
    method: 'Microfossils',
  },
  {
    id: 'cambrian', ga: 0.54, certainty: 'well established',
    title: 'Cambrian explosion',
    text: 'Most major groups of animals appear in the fossil record over a few tens of millions of years, many with hard parts that fossilize well.',
    method: 'Fossils in rocks dated radiometrically',
  },
  {
    id: 'humans', ga: 0.0003, certainty: 'well established',
    title: 'Homo sapiens',
    text: 'Modern humans appear about 300 000 years ago, less than a hundredth of a per cent of the history of life.',
    method: 'Fossils and molecular evidence',
  },
];

export const events: EarlyEvent[] = [...list].sort((a, b) => b.ga - a.ga);

/** Events that have happened by the given age (older than or equal to it). */
export const eventsBy = (ga: number) => events.filter((e) => e.ga >= ga - 1e-9);

/** The most recent event that has happened by the given age, or null before the Earth formed. */
export const latestEvent = (ga: number): EarlyEvent | null => eventsBy(ga).at(-1) ?? null;

/** Position on a 24-hour clock where the Earth forms at 00:00:00 and the present is 24:00:00. */
export function clock(ga: number): string {
  const f = Math.max(0, Math.min(1, (EARTH_AGE - ga) / EARTH_AGE));
  const total = Math.round(f * 86400);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return [h, m, s].map((n) => String(n).padStart(2, '0')).join(':');
}

export type Oxygen = 'none' | 'present';
/** Free O₂ in the atmosphere: negligible before the Great Oxidation Event. */
export const oxygen = (ga: number): Oxygen => (ga > GOE ? 'none' : 'present');

export type LifeEvidence = 'none' | 'disputed' | 'isotopic' | 'fossil';
/** The strongest kind of evidence for life that exists from rocks of this age or older. */
export function lifeEvidence(ga: number): LifeEvidence {
  if (ga <= 3.48) return 'fossil';
  if (ga <= 3.7) return 'isotopic';
  if (ga <= 4.1) return 'disputed';
  return 'none';
}

export const lifeText: Record<LifeEvidence, string> = {
  none: 'No evidence of life from rocks this old.',
  disputed: 'Only disputed traces of life so far.',
  isotopic: 'Isotopic evidence of life (carbon depleted in ¹³C).',
  fossil: 'Widely accepted fossil evidence of life (stromatolites).',
};

export const oxygenText: Record<Oxygen, string> = {
  none: 'Little or no free O₂, so no ozone layer: strong UV reaches the surface.',
  present: 'Free O₂ in the atmosphere; an ozone layer absorbs much of the UV.',
};

/** Format an age for reading aloud and on screen. */
export function formatAge(ga: number): string {
  if (ga <= 0) return 'today';
  if (ga < 0.001) return `${Math.round(ga * 1e6).toLocaleString('en-GB')} years ago`;
  if (ga < 1) return `${Math.round(ga * 1000)} million years ago`;
  return `${ga.toFixed(2)} billion years ago`;
}
