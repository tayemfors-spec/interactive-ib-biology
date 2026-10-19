/**
 * A simplified Whittaker-style biome graph: mean annual temperature (°C) against annual
 * precipitation (cm). The boundaries are approximate and drawn from straight-line rules so that
 * the drawing and the classification always agree. Real boundaries are blurred (ecotones) and also
 * depend on how rainfall is spread through the year, soils, fire, grazing and human activity.
 *
 * Rules (T = mean annual temperature, P = annual precipitation):
 *   - Above the upper envelope: a climate that is rare on Earth, so no biome is mapped.
 *   - T < −5 °C: tundra.
 *   - P below the desert limit D(T): desert (hot desert if T ≥ 20 °C, otherwise cold desert).
 *     D rises with temperature because warmer air evaporates more water.
 *   - −5 ≤ T < 5 °C: taiga.
 *   - 5 ≤ T < 20 °C: temperate grassland below the forest limit F(T), temperate forest above it.
 *   - T ≥ 20 °C: savanna (tropical grassland) below 150 cm, tropical forest above.
 */

export const T_MIN = -15;
export const T_MAX = 30;
export const P_MAX = 450;
export const TROPICAL_FOREST_P = 150;

export type BiomeId =
  | 'tundra' | 'taiga' | 'temperate-forest' | 'grassland' | 'savanna' | 'hot-desert' | 'tropical-forest' | 'cold-desert';

function interp(pts: [number, number][], x: number): number {
  if (x <= pts[0]![0]) return pts[0]![1];
  for (let i = 1; i < pts.length; i++) {
    const [x1, y1] = pts[i]!;
    const [x0, y0] = pts[i - 1]!;
    if (x <= x1) return y0 + ((x - x0) / (x1 - x0)) * (y1 - y0);
  }
  return pts.at(-1)![1];
}

/** The wettest climates that are common at each temperature (upper edge of the graph's envelope). */
const ENVELOPE: [number, number][] = [[-15, 50], [-5, 120], [5, 250], [10, 300], [20, 370], [30, 450]];
export const envelope = (t: number) => interp(ENVELOPE, t);
/** Below this rainfall the land is desert; more is needed when it is warmer. */
export const desertLimit = (t: number) => 15 + 0.5 * (t + 5);
/** In the temperate band, forest needs at least this much rain; more when it is warmer. */
export const forestLimit = (t: number) => 40 + 3 * (t - 5);

export type Result = BiomeId | 'rare';

export function classify(t: number, p: number): Result {
  if (p > envelope(t)) return 'rare';
  if (t < -5) return 'tundra';
  if (p < desertLimit(t)) return t >= 20 ? 'hot-desert' : 'cold-desert';
  if (t < 5) return 'taiga';
  if (t < 20) return p < forestLimit(t) ? 'grassland' : 'temperate-forest';
  return p < TROPICAL_FOREST_P ? 'savanna' : 'tropical-forest';
}

/** A region between two temperatures, bounded below and above by functions of temperature. */
function band(t0: number, t1: number, lower: (t: number) => number, upper: (t: number) => number): [number, number][] {
  const ts: number[] = [];
  for (let t = t0; t < t1; t += 1) ts.push(t);
  ts.push(t1);
  return [...ts.map((t): [number, number] => [t, lower(t)]), ...ts.reverse().map((t): [number, number] => [t, upper(t)])];
}
const zero = () => 0;
const flat = (v: number) => () => v;

/** Polygons in data units (°C, cm), built from the same rules as classify(). */
export const regions: Record<BiomeId, [number, number][]> = {
  tundra: band(T_MIN, -5, zero, envelope),
  'cold-desert': band(-5, 20, zero, desertLimit),
  taiga: band(-5, 5, desertLimit, envelope),
  grassland: band(5, 20, desertLimit, forestLimit),
  'temperate-forest': band(5, 20, forestLimit, envelope),
  'hot-desert': band(20, T_MAX, zero, desertLimit),
  savanna: band(20, T_MAX, desertLimit, flat(TROPICAL_FOREST_P)),
  'tropical-forest': band(20, T_MAX, flat(TROPICAL_FOREST_P), envelope),
};

/** Where to print each region's label on the graph (data units), and whether it fits on a phone. */
export const labelAt: Record<BiomeId, { t: number; p: number; narrow: boolean; lines: string[] }> = {
  tundra: { t: -10, p: 25, narrow: true, lines: ['tundra'] },
  'cold-desert': { t: 7.5, p: 9, narrow: false, lines: ['cold desert'] },
  taiga: { t: 0, p: 110, narrow: true, lines: ['taiga'] },
  grassland: { t: 12.5, p: 48, narrow: true, lines: ['temperate', 'grassland'] },
  'temperate-forest': { t: 12.5, p: 175, narrow: true, lines: ['temperate', 'forest'] },
  'hot-desert': { t: 25, p: 11, narrow: false, lines: ['hot desert'] },
  savanna: { t: 25, p: 85, narrow: true, lines: ['savanna'] },
  'tropical-forest': { t: 25, p: 280, narrow: true, lines: ['tropical', 'forest'] },
};

export interface BiomeInfo {
  id: BiomeId;
  name: string;
  /** One of the six biomes named in the IB guide? */
  required: boolean;
  climate: string;
  community: string;
  adaptations: string;
  where: string;
  convergence: string;
}

export const biomes: Record<BiomeId, BiomeInfo> = {
  tundra: {
    id: 'tundra', name: 'Tundra', required: true,
    climate: 'Very cold: mean annual temperature below about −5 °C, with a very short, cool summer. Low precipitation, much of it as snow. Permanently frozen ground (permafrost) lies below the surface. Low light for much of the year, but long days in summer.',
    community: 'No trees. Low-growing shrubs such as dwarf willow and dwarf birch, sedges, grasses, mosses and lichens. Animals include caribou (reindeer), Arctic foxes, lemmings and many birds that migrate in only for the summer.',
    adaptations: 'Plants grow low or as cushions, out of the wind and under insulating snow, and complete their growth in a few weeks of summer. Mammals have thick fur and small ears and tails, which reduce heat loss.',
    where: 'Northern Alaska and Canada, Greenland\'s coasts, northern Scandinavia and Siberia.',
    convergence: 'Similar dwarf, cushion-forming plants have evolved separately in Arctic tundra and in high mountains elsewhere.',
  },
  taiga: {
    id: 'taiga', name: 'Taiga (boreal forest)', required: true,
    climate: 'Long, very cold winters and short, mild summers; mean annual temperature roughly −5 to 5 °C. Precipitation is low to medium, a good part of it as snow. Light intensity is low to medium.',
    community: 'Dense forest of a few species of coniferous trees, such as spruces, firs, pines and larches, over acidic soils. Animals include moose, lynx, wolves, bears and snowshoe hares.',
    adaptations: 'Most conifers are evergreen, so they can photosynthesize as soon as it is warm enough. Narrow needles with a thick waxy cuticle lose little water when the ground is frozen, and the conical shape sheds snow.',
    where: 'A broad belt across Canada and Alaska, Scandinavia and Russia.',
    convergence: 'The taiga of North America and of Eurasia is dominated by different species of spruce, fir and larch with the same adaptations.',
  },
  'temperate-forest': {
    id: 'temperate-forest', name: 'Temperate forest', required: true,
    climate: 'Moderate temperatures with clear seasons: warm summers and cold winters. Medium to high rainfall spread through the year. Moderate light intensity.',
    community: 'Mostly broadleaved deciduous trees such as oak, beech and maple, with shrubs and spring-flowering herbs below. Very wet coastal areas have temperate rainforest. Animals include deer, squirrels, badgers, woodpeckers and many insects.',
    adaptations: 'Deciduous trees drop their leaves before winter, when frozen soil would make water uptake hard, and grow new ones in spring. Woodland-floor plants such as bluebells flower in spring, before the canopy closes.',
    where: 'Western and central Europe, the eastern USA, eastern China, Japan and New Zealand.',
    convergence: 'Deciduous forests on different continents have similar trees and shrubs, although most of their species are different.',
  },
  grassland: {
    id: 'grassland', name: 'Temperate grassland', required: true,
    climate: 'Hot summers and cold winters. Moderate rainfall, too little for forest, often with a dry season. Medium to high light intensity.',
    community: 'Grasses and other herbaceous plants with few or no trees. Grazing mammals (such as bison) and burrowing animals (such as prairie dogs) are common.',
    adaptations: 'Grasses grow from points at the base of the leaves, so they recover after grazing, fire or drought. Deep, dense root systems reach water and survive when the shoots die back.',
    where: 'The prairies of North America, the steppes of Eurasia, the pampas of South America and the veld of southern Africa.',
    convergence: 'The prairies, steppes and pampas are on different continents but have similar communities of grasses and grazing animals.',
  },
  savanna: {
    id: 'savanna', name: 'Savanna (tropical grassland)', required: true,
    climate: 'Warm or hot all year. Medium rainfall with a long dry season. High light intensity.',
    community: 'Grassland with scattered trees, such as acacias, kept open by fire, grazing and the dry season. Large herds of grazers (zebra, wildebeest) and their predators (lions).',
    adaptations: 'Many trees have thick bark that resists fire and deep roots. Grasses survive the dry season and fire underground and regrow quickly when rain returns.',
    where: 'East and southern Africa, northern Australia and parts of South America.',
    convergence: 'Savanna trees in Africa, Australia and South America belong to different groups but have similar fire-resistant bark.',
  },
  'hot-desert': {
    id: 'hot-desert', name: 'Hot desert', required: true,
    climate: 'Very little rainfall (usually under about 25 cm a year) and long droughts. Very high daytime temperatures with much colder nights. Clear skies, so light intensity is very high. Soils are thin, with little organic matter.',
    community: 'Sparse plants: succulents such as cacti, deep-rooted shrubs, and annuals that survive as seeds and grow only after rain. Many animals are nocturnal or burrow, such as the fennec fox.',
    adaptations: 'Plants store water, have reduced leaves or spines, thick waxy cuticles and CAM photosynthesis. Animals avoid daytime heat and lose very little water.',
    where: 'The Sahara and Arabian deserts, the Sonoran Desert of the USA and Mexico, and central Australia.',
    convergence: 'American cacti and African euphorbias evolved separately but both have swollen green water-storing stems with spines and CAM. Kangaroo rats (North America) and jerboas (Africa and Asia) are hopping desert rodents from different families.',
  },
  'tropical-forest': {
    id: 'tropical-forest', name: 'Tropical forest', required: true,
    climate: 'High temperatures all year with no cold season. High rainfall: in tropical rainforest it falls in every month; tropical seasonal forest has a dry season. High light intensity at the canopy but dim at ground level. Soils tend to be thin and poor in nutrients.',
    community: 'The most species-rich biome on land. Tall evergreen trees in several layers, with emergent trees above the canopy, climbing lianas and epiphytes. Animals include monkeys, many birds and huge numbers of insects.',
    adaptations: 'Tall trees with buttress roots for support in shallow soil, leaves with drip tips that shed rain, and animals adapted to climbing and feeding in the canopy.',
    where: 'The Amazon and Congo basins and Southeast Asia, for example Borneo.',
    convergence: 'Rainforests in South America, Africa and Southeast Asia have different species but a similar structure, with buttressed trees, lianas and epiphytes.',
  },
  'cold-desert': {
    id: 'cold-desert', name: 'Cold (temperate) desert', required: false,
    climate: 'Very little rain or snow, with hot summers and cold or freezing winters. (Not one of the six biomes you need to know.)',
    community: 'Sparse low shrubs such as sagebrush, and grasses.',
    adaptations: 'Plants tolerate both drought and frost.',
    where: 'The Gobi Desert in Asia and the Great Basin in the USA.',
    convergence: 'Shrublands of cold deserts in Asia and North America look alike although their species differ.',
  },
};

export interface Place { id: string; label: string; t: number; p: number }

/** Approximate long-term climate averages for example places (rounded). */
export const places: Place[] = [
  { id: 'manaus', label: 'Manaus, Amazon', t: 27, p: 230 },
  { id: 'phoenix', label: 'Phoenix, Sonoran Desert', t: 24, p: 20 },
  { id: 'kano', label: 'Kano, Nigeria', t: 26, p: 70 },
  { id: 'washington', label: 'Washington, DC', t: 14, p: 105 },
  { id: 'denver', label: 'Denver, Great Plains', t: 10, p: 38 },
  { id: 'fairbanks', label: 'Fairbanks, Alaska', t: -2, p: 28 },
  { id: 'utqiagvik', label: 'Utqiaġvik, Arctic Alaska', t: -11, p: 12 },
];
