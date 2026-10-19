/**
 * Data for the A4.2 "evidence for a biodiversity crisis" chart explorer.
 * Every figure is a rounded, widely cited value; sources and years are recorded in
 * src/content/topics/a4-2/facts.yaml. Values are approximate by nature.
 */

export interface MassExtinction {
  id: string;
  name: string;
  /** Approximate age, millions of years ago. */
  ma: number;
  /** Approximate percentage of species lost (estimated from genus-level fossil data). */
  lost: number;
  /** Probable trigger, stated cautiously. */
  trigger: string;
  note: string;
}

/** Barnosky et al. (2011) Nature 471: 51–57, Table 1 (ages updated to current dates for the Permian and Cretaceous). */
export const massExtinctions: MassExtinction[] = [
  { id: 'ordovician', name: 'End-Ordovician', ma: 443, lost: 86,
    trigger: 'A glaciation, with falling sea level and cooling seas.',
    note: 'Most life was marine; many groups of brachiopods, trilobites and graptolites were lost.' },
  { id: 'devonian', name: 'Late Devonian', ma: 359, lost: 75,
    trigger: 'Uncertain: a series of pulses linked to low-oxygen oceans and climate change.',
    note: 'Reef ecosystems were very badly hit. This event was spread over millions of years.' },
  { id: 'permian', name: 'End-Permian', ma: 252, lost: 96,
    trigger: 'Huge volcanic eruptions (Siberian Traps), causing global warming, ocean acidification and low-oxygen seas.',
    note: 'The largest of the five: the last trilobites disappeared and recovery took millions of years.' },
  { id: 'triassic', name: 'End-Triassic', ma: 201, lost: 80,
    trigger: 'Volcanic eruptions as the supercontinent Pangaea began to split, with rapid climate change.',
    note: 'Many large amphibians and reptile groups were lost, opening the way for the dinosaurs.' },
  { id: 'cretaceous', name: 'End-Cretaceous', ma: 66, lost: 76,
    trigger: 'An asteroid impact (Chicxulub, Mexico), with volcanic eruptions in India also under way.',
    note: 'All non-avian dinosaurs, the ammonites and many other groups died out. Birds and mammals then diversified.' },
];

/** A mass extinction is usually defined as the loss of at least about 75% of species in a geologically short time. */
export const MASS_THRESHOLD = 75;

export interface Bar { id: string; name: string; value: number; note: string }

/**
 * Percentage of assessed species in each group listed as threatened (Vulnerable, Endangered or
 * Critically Endangered) on the IUCN Red List, 2024 summary statistics; reef corals from the
 * November 2024 Global Coral Assessment.
 */
export const redList: Bar[] = [
  { id: 'corals', name: 'Reef-building corals', value: 44, note: 'Mainly threatened by climate change: marine heatwaves cause coral bleaching.' },
  { id: 'amphibians', name: 'Amphibians', value: 41, note: 'The most threatened vertebrate class: habitat loss, climate change and the chytrid fungus disease.' },
  { id: 'sharks', name: 'Sharks and rays', value: 37, note: 'Mainly threatened by over-fishing, including being caught as by-catch.' },
  { id: 'conifers', name: 'Conifers', value: 34, note: 'Logging, land clearance, fire and climate change.' },
  { id: 'mammals', name: 'Mammals', value: 26, note: 'Habitat loss and hunting are the main threats.' },
  { id: 'birds', name: 'Birds', value: 12, note: 'About one bird species in eight. Many more have declining populations without yet being threatened.' },
];

/** WWF/ZSL Living Planet Report 2024: average decline in size of monitored vertebrate populations, 1970–2020. */
export const lpiRegions: Bar[] = [
  { id: 'global', name: 'Global average', value: 73, note: 'About 35,000 monitored populations of over 5,000 vertebrate species.' },
  { id: 'latam', name: 'Latin America & Caribbean', value: 95, note: 'The steepest regional decline, linked especially to conversion of forest and other habitats to farmland.' },
  { id: 'africa', name: 'Africa', value: 76, note: 'Habitat loss and over-exploitation of wildlife.' },
  { id: 'asia', name: 'Asia & Pacific', value: 60, note: 'Habitat loss, over-exploitation and invasive species.' },
  { id: 'namerica', name: 'North America', value: 39, note: 'Much habitat had already been lost before monitoring began in 1970.' },
  { id: 'europe', name: 'Europe & Central Asia', value: 35, note: 'Smaller decline since 1970, partly because large losses happened earlier (a shifting baseline).' },
];

export const lpiSystems: Bar[] = [
  { id: 'freshwater', name: 'Freshwater', value: 85, note: 'Dams, water extraction, pollution and invasive species.' },
  { id: 'terrestrial', name: 'Terrestrial', value: 69, note: 'Land clearance for agriculture is the main driver.' },
  { id: 'marine', name: 'Marine', value: 56, note: 'Over-fishing is the main driver.' },
];

/** Index value (1970 = 1) left after an average percentage decline. */
export const indexAfter = (declinePercent: number) => Math.round((1 - declinePercent / 100) * 100) / 100;

/** True if a loss meets the usual definition of a mass extinction. */
export const isMass = (lostPercent: number) => lostPercent >= MASS_THRESHOLD;

/**
 * Today, for comparison with the past events: mammals and birds are well studied, and roughly
 * 1.5% of their known species are recorded as extinct since 1500 (IUCN). About 26% of assessed
 * mammals are threatened; if they were all lost, the loss would still be below the 75% threshold
 * but would have happened in centuries rather than hundreds of thousands to millions of years.
 */
export const today = { recorded: 1.5, ifThreatenedLost: 26 };
