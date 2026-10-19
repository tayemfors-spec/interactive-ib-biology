/**
 * EDGE of Existence scoring (Isaac et al. 2007, PLoS ONE 2: e296):
 *   EDGE = ln(1 + ED) + GE × ln 2
 * ED is evolutionary distinctiveness in millions of years (MY) of unique evolutionary history;
 * GE is the IUCN Red List category coded 0 (Least Concern) to 4 (Critically Endangered).
 * Each step up the Red List is treated as doubling the risk of extinction. The programme now uses
 * an updated method (EDGE2), but the principle is the same.
 */

export const categories = [
  { code: 'LC', name: 'Least Concern', ge: 0 },
  { code: 'NT', name: 'Near Threatened', ge: 1 },
  { code: 'VU', name: 'Vulnerable', ge: 2 },
  { code: 'EN', name: 'Endangered', ge: 3 },
  { code: 'CR', name: 'Critically Endangered', ge: 4 },
] as const;
export type Category = (typeof categories)[number]['code'];

export const geOf = (c: Category) => categories.find((x) => x.code === c)!.ge;
export const nameOf = (c: Category) => categories.find((x) => x.code === c)!.name;

/** EDGE score for an ED value (MY) and a Red List category weight GE (0–4). */
export function edgeScore(ed: number, ge: number): number {
  return Math.log(1 + Math.max(0, ed)) + ge * Math.LN2;
}

/** Threatened categories are VU, EN and CR. */
export const isThreatened = (c: Category) => geOf(c) >= 2;

export type Distinctiveness = 'low' | 'moderate' | 'high' | 'very high';
export const distinctLevels: Distinctiveness[] = ['low', 'moderate', 'high', 'very high'];

export interface EdgeSpecies {
  id: string;
  name: string;
  latin: string;
  category: Category;
  /** Qualitative ED band, based on how many close relatives the species has and how long ago they split. */
  ed: Distinctiveness;
  why: string;
  status: string;
}

/**
 * Real species with verified IUCN categories. ED is shown only qualitatively, because exact
 * ED values change as phylogenies are updated; no scores are invented here.
 */
export const species: EdgeSpecies[] = [
  { id: 'echidna', name: "Attenborough's long-beaked echidna", latin: 'Zaglossus attenboroughi', category: 'CR', ed: 'very high',
    why: 'An egg-laying mammal (monotreme). Only five monotreme species survive, on a lineage that split from all other mammals well over 150 million years ago.',
    status: 'Known from one mountain range in New Guinea; threatened by hunting and forest loss.' },
  { id: 'baiji', name: 'Baiji (Yangtze river dolphin)', latin: 'Lipotes vexillifer', category: 'CR', ed: 'very high',
    why: 'The only species in its family. In the first EDGE analysis (2007) it had the highest score of any mammal.',
    status: 'None were found in a 2006 survey and it is listed as Critically Endangered (possibly extinct): by-catch, dams, pollution and boat traffic.' },
  { id: 'ayeaye', name: 'Aye-aye', latin: 'Daubentonia madagascariensis', category: 'EN', ed: 'very high',
    why: 'A lemur that is the only living species in its family, with no close relatives.',
    status: 'Madagascar; forest loss and killing because of local beliefs.' },
  { id: 'salamander', name: 'Chinese giant salamander', latin: 'Andrias davidianus', category: 'CR', ed: 'high',
    why: 'One of only a few living giant salamanders, an ancient amphibian family. (It may in fact be several species — a lumper/splitter question.)',
    status: 'Over-collected for food; animals released from farms have mixed genetically distinct wild populations.' },
  { id: 'platypus', name: 'Platypus', latin: 'Ornithorhynchus anatinus', category: 'NT', ed: 'very high',
    why: 'Another monotreme, the only living species in its family, so very distinct.',
    status: 'Near Threatened: still widespread in eastern Australia, though declining.' },
  { id: 'tuatara', name: 'Tuatara', latin: 'Sphenodon punctatus', category: 'LC', ed: 'very high',
    why: 'The only survivor of an order of reptiles (Rhynchocephalia) whose lineage split from lizards and snakes over 200 million years ago.',
    status: 'Least Concern, thanks largely to predator-free islands in New Zealand.' },
  { id: 'mountainchicken', name: 'Mountain chicken frog', latin: 'Leptodactylus fallax', category: 'CR', ed: 'low',
    why: 'A large frog in a genus with dozens of closely related species, so relatively little unique evolutionary history.',
    status: 'Caribbean (Dominica and Montserrat); devastated by the chytrid fungus disease.' },
  { id: 'sparrow', name: 'House sparrow', latin: 'Passer domesticus', category: 'LC', ed: 'low',
    why: 'One of many closely related sparrows and other songbirds.',
    status: 'Least Concern: very widespread, though it has declined in some cities.' },
];

/** EDGE species: distinct (high or very high ED) and threatened (VU, EN or CR). */
export const isEdge = (s: EdgeSpecies) => isThreatened(s.category) && (s.ed === 'high' || s.ed === 'very high');

