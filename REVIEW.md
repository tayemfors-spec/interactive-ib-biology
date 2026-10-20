# REVIEW — things to check with your teacher

This file lists everything on the site that I wasn't fully sure of, or that depends on a judgement call. Each row has a status:

- **open**: needs a teacher's eye
- **checked**: confirmed against a source (named)
- **changed**: corrected after review

Sources used: the official *Biology guide, first assessment 2025* (May 2023 update; a copy is kept in the git-ignored `reference/` folder) and Allott, *Oxford IB Biology Study Guide* (2023 edition). No text from either is reproduced on the site.

## Syllabus and scope

| # | Topic | Item | Why it's here | What I chose | Status |
|---|---|---|---|---|---|
| S1 | all | Guide version | My copy is the May 2023 update and came from a school's public website, not the IB teacher portal | Built `syllabus.json` from it. **Please ask your teacher whether the IB has issued a later update or clarification** | open |
| S2 | all | Understanding titles and summaries | Paraphrased in my own words; a paraphrase can drift from the exact intended scope | Each summary keeps every named example and "students should…" requirement. A script checks that no 7-word run is copied from the guide | open |
| S3 | B2.1 | Code B2.1.9 | The guide prints it as "B.2.1.9" | Treated as B2.1.9 | checked (guide) |
| S4 | A4.2, D4.2 | Topic titles | Allott's contents page says "Conservation of biology" and "Sustainability and changes" | Used the guide's titles, "Conservation of biodiversity" and "Stability and change" | checked (guide) |
| S5 | B2.3, B4.2, C3.1 | SL/AHL split | My first draft from memory had these wrong | B2.3: AHL is 7–10. B4.2: SL only. C3.1: AHL is 17–23 (the plant part only) | checked (guide + Allott) |
| S6 | A2.3, C1.2, C2.1 | Misprinted codes | The guide prints "A.2.3.4", "C.1.2.17" and "C.2.1.2" | Treated as A2.3.4, C1.2.17 and C2.1.2. Numbering is now complete in all 40 topics (553 understandings, 216 of them AHL) | checked (guide) |
| S7 | C2.1.4 | "Nitrous oxide" listed as a neurotransmitter | Almost certainly a slip for **nitric oxide (NO)**, the actual gaseous signalling molecule. Nitrous oxide (N₂O) is laughing gas | Site says nitric oxide. **Ask your teacher**, since an exam answer should match what IB examiners expect | open |
| S8 | A3.1.7 | Human chromosome 2 fusion | The guide uses an old ape chromosome numbering ("12 and 13"); modern papers call them 2A and 2B | Site describes it as the fusion of two ancestral chromosomes (2A and 2B); 46 vs 48 chromosomes | open |
| S9 | B4.1.2 | Sand-dune grass | The guide doesn't name a species | Site uses marram grass (*Ammophila arenaria*) as the example | open |
| S10 | D1.2.11 | Point-mutation example | The guide doesn't name one | Site uses sickle-cell anaemia (HBB, GAG→GTG, Glu→Val) | checked (textbook standard) |
| S11 | several | "Local example" understandings (A3.1.14, A4.2.3, A4.2.4, B2.1.11, C4.1 invasive species, D1.3 CRISPR) | The guide leaves the choice of example to the student or school | The site gives a worked example and flags it as "your teacher may use a local example" | open |
| S13 | B3.1 | Bohr shift direction | The Allott study guide (p. 120) says the curve shifts "to the left" with more CO₂ | Site says **to the right** (lower affinity, more O₂ released in respiring tissue), which is the standard, correct statement | checked (textbook) |
| S12 | all | Shared phrasing with the guide | After rewriting, the remaining 7+ word overlaps are lists of technical terms, ratios (9:3:3:1), species names or standard definitions (e.g. the reference conditions for water potential) | Kept: these are facts and term lists, not creative wording | checked |

## Topic content

Each topic's full list of checkable claims, with sources and confidence, is in `src/content/topics/<id>/facts.yaml`. The rows below are the ones worth a teacher's eye.

### B2.1 Membranes and membrane transport

| # | Item | Why it's here | What the site says | Status |
|---|---|---|---|---|
| B2.1-1 | Membrane thickness | Textbook values vary | Text: "about 7–10 nm including its proteins". Exam diagram scale bar: "bilayer ≈ 4–5 nm" | open |
| B2.1-2 | Osmosis explanation | The molecular mechanism is often taught with the contested "bound water" idea | Uses the guide's three ideas: random movement both ways, a membrane impermeable to solutes, and a solute concentration difference. The mechanism is left to water potential (D2.3) | checked (guide) |
| B2.1-3 | Habitat adaptation example (B2.1.11) | The guide doesn't name one | Polar vs tropical fish (homeoviscous adaptation; goldfish acclimation, Cossins & Prosser 1978) | open |
| B2.1-4 | Voltage-gated channel thresholds | IB-level simplification | Threshold ≈ −50 mV; at about +30 to +40 mV Na⁺ channels inactivate and the slower K⁺ channels are open. In the simulation the voltage slider uses this as a steady-state rule; the "Fire an action potential" button shows the real time sequence | open |
| B2.1-5 | SGLT stoichiometry | Intestine and kidney use different isoforms | Intestine: SGLT1, 2 Na⁺ per glucose. PCT: "similar cotransporters (mainly SGLT2)". Glucose leaves to the blood through GLUT2 (facilitated diffusion) | checked (textbook) |
| B2.1-6 | Transport-rate simulation | Qualitative model | Facilitated diffusion is shown saturating (strictly most typical of carrier proteins; channels also saturate at high concentrations). Active-transport rate is shown independent of the gradient, which is a simplification. Labelled "qualitative model" on the page | open |
| B2.1-7 | Fluidity simulation | Qualitative model | The shape of each effect is correct (temperature ↑ fluidity; unsaturation lowers melting point; cholesterol buffers both ways); the numbers are not real data. Labelled on the page | checked |
| B2.1-8 | SGLT animation | Simplification for clarity | The Na⁺/K⁺ pump in the animation is shown pumping Na⁺ out; the K⁺ it brings in is not drawn (the caption says the pump is Na⁺/K⁺) | open |
| B2.1-9 | 3D model proportions | Schematic | Heads and proteins are enlarged for visibility. Carbohydrate only on the outer face, peripheral proteins not in the core, and cholesterol –OH by the heads are all deliberately correct | checked |
| B2.1-10 | Gated channels: "two ACh molecules bind" | Detail beyond the guide | Nicotinic receptors have two ACh binding sites (on α subunits) | checked (textbook) |


### Theme A: claims for a teacher to confirm

Generated from each topic's `facts.yaml` (status `open`). Everything else in those files is marked `checked` against textbook sources.

**A1.1 Water**: 38 claims recorded, 9 open

- f6: A hydrogen bond is an intermolecular attraction between a δ+ H (bonded to O) and a δ− O of another molecule, roughly one-twentieth the strength of an O–H covalent bond.
- f7: Each water molecule can form up to four hydrogen bonds (two donated via its H atoms, two accepted at its lone pairs); in liquid water most molecules have three or four at any instant.
- f8: Hydrogen bonds in liquid water last only around a picosecond (10⁻¹² s) before breaking and re-forming.
- f23: Ringed seal (Pusa hispida) — Arctic seas; spends most time in water; hauls out on sea ice to rest, moult and give birth; keeps breathing holes open with its fore-flipper claws; pups born in snow lairs; thick blubber; body density close to seawater.
- f24: Black-throated loon (Gavia arctica) — breeds on northern lakes, dives for fish propelled by feet set far back, needs a long take-off run, has dense waterproof plumage, less pneumatized bones than most birds, presses air from its plumage to dive, and in winter, when its breeding lakes freeze, migrates to coastal seas that stay ice-free because seawater's high specific heat capacity slows its cooling.
- f27: Specific heat capacity of liquid methane near its boiling point is about 3.5 J g⁻¹ K⁻¹ (gaseous methane at 25 °C ≈2.2).
- f29: Rocky planets formed inside the snow line (≈2.7 AU in the early Solar System), where it was too hot for water ice; water-rich (carbonaceous) asteroids from the outer belt are the leading hypothesis for delivering Earth's water.
- f30: D/H ratios (× 10⁻⁴) — Earth's oceans 1.56; carbonaceous chondrites ≈1.4–1.8; most Oort-cloud comets ≈2.9–3.3; comet 67P ≈5.3 (Rosetta). A few comets (e.g. 103P/Hartley 2) have Earth-like values.
- f34: The Sun's habitable (Goldilocks) zone is roughly 0.95–1.67 AU; boundaries depend on the climate model, and Mars lies near the outer edge.

**A1.2 Nucleic acids**: 27 claims recorded, 6 open

- f9: The minor groove lies on the side of the base pair where the two glycosidic bonds (sugars) are attached; the model separates paired sugars by 140° around the axis.
- f15: DNA data storage experiments have reached about 200 million gigabytes (≈ 215 petabytes) per gram.
- f21: PDB entry 1KX5 is a nucleosome core particle structure (1.9 Å) suitable for visualization.
- f22: Hershey–Chase (1952) used ³⁵S to label protein (cysteine, methionine) and ³²P to label DNA; after infection, blending and centrifugation, most ³⁵S (about 80%) was in the supernatant and most ³²P (roughly 70%) stayed with the cells in the pellet; ³²P but almost no ³⁵S (<1%) appeared in progeny phage.
- f23: Radioisotopes became widely available to biologists as research tools from the 1940s (e.g. reactor-produced isotopes after 1946).
- f24: Chargaff base compositions (mol %) — human A 29.3 G 20.7 C 20.0 T 30.0; chicken 28.0/22.0/21.6/28.4; octopus 33.2/17.6/17.6/31.6; sea urchin 32.8/17.7/17.3/32.1; wheat 27.3/22.7/22.8/27.1; maize 26.8/22.8/23.2/27.2; yeast 31.3/18.7/17.1/32.9; E. coli 24.7/26.0/25.7/23.6; φX174 (single-stranded) 24.0/23.3/21.5/31.2.

**A2.1 Origins of cells**: 43 claims recorded, 13 open

- f2: Zircon crystals from Jack Hills, Western Australia, about 4.4 billion years old, have oxygen isotope ratios suggesting liquid water at the surface, so oceans may have existed by about 4.4 Ga.
- f4: The young Sun was about 30% dimmer (about 70% of today's luminosity), and the greenhouse effect kept the early Earth warm despite this; whether the surface was warmer than today is debated.
- f12: The water turned pink within a day and deep red (red-brown) by the end of the week.
- f15: The early atmosphere is now thought to have been only weakly reducing or neutral, mainly CO₂ and N₂ with water vapour, and such mixtures give far fewer amino acids in spark experiments.
- f18: Fatty acids have one hydrocarbon chain and a carboxyl group; above a critical concentration they form micelles, and at pH near the apparent pKa of the membrane-bound acid (near neutral to slightly alkaline, depending on chain length) they form bilayer vesicles.
- f23: Lab-evolved polymerase ribozymes can copy RNA templates but none yet copies itself fully.
- f28: LUCA probably had ribosomes, a membrane and a DNA genome.
- f29: Three-domain tree rooted between Bacteria and Archaea+Eukaryotes (as drawn in the LUCA figure).
- f32: ¹³C-depleted graphite in 3.7 Ga metasedimentary rocks from Isua, West Greenland, is evidence of life.
- f33: A graphite inclusion in a 4.1 Ga Jack Hills zircon has a light carbon isotope signature; this is a single, disputed sample.
- f34: Molecular-clock estimates for LUCA range roughly from 3.9 to 4.3 Ga; a large 2024 study estimated about 4.2 Ga (4.09–4.33 Ga).
- f36: Eukaryotic microfossils are clearly present by about 1.6 Ga.
- f41: Possible microfossils (haematite tubes and filaments) in hydrothermal vent precipitates of the Nuvvuagittuq belt, Quebec, at least 3.77 Ga and possibly 4.28 Ga; biological origin disputed.

**A2.2 Cell structure**: 39 claims recorded, 7 open

- f16: Mitochondrial ribosomes are bacterial-type but vary in size between groups (about 55S in mammals); IB calls them 70S.
- f17: Typical sizes — bacteria 1–5 µm (Bacillus ≈ 3 µm long, ≈ 1 µm wide; Staphylococcus ≈ 1 µm); eukaryotic cells 10–100 µm; nucleus ≈ 5–10 µm; mitochondria ≈ 1–4 µm long (0.5–1 µm wide); chloroplasts ≈ 5 µm (2–10 µm); 80S ribosome ≈ 25–30 nm; red blood cell ≈ 7.5 µm; cheek cell ≈ 60 µm; lysosome ≈ 0.1–1 µm; Paramecium ≈ 200 µm.
- f24: Ammonia (as well as CO₂) diffuses out of Paramecium as a nitrogenous waste.
- f30: Skeletal muscle fibres form by fusion of myoblasts, are multinucleate (hundreds of nuclei) and can be several centimetres long.
- f34: Endosymbiosis — all eukaryotes descend from a nucleated, sexually reproducing unicellular ancestor; mitochondria came from an aerobic (alpha-proteo)bacterium, and later, in the ancestor of green algae, red algae and plants, chloroplasts from a cyanobacterium (primary endosymbiosis; some other algae gained chloroplasts later by engulfing such algae, secondary endosymbiosis); most endosymbiont genes moved to the nucleus.
- f36: The anim shows the outer organelle membrane deriving from the host vesicle membrane (the IB/textbook account). Some protein evidence suggests the mitochondrial outer membrane derives from the bacterial outer membrane instead; no quiz question depends on this.
- f38: Multicellularity evolved independently many times (animals once, land plants once, several times in fungi and in brown, red and green algae; estimates of 25 or more origins); all plants and animals are multicellular; yeasts and Chlamydomonas are unicellular; advantages include larger size, cell specialization and longer life.

**A2.3 Viruses**: 30 claims recorded, 4 open

- f6: The lambda tail tube is built from 32 stacked hexameric rings of gpV.
- f9: A lambda lytic cycle takes about an hour and releases about 100 phages per cell.
- f19: The shared genetic code is taken as evidence that viruses arose after the code was established in cells, probably from cellular genetic material.
- f21: RNA-dependent RNA polymerases and reverse transcriptase lack proofreading, giving mutation rates of roughly 10⁻⁶–10⁻⁴ per base per replication, compared with about 10⁻⁸–10⁻⁶ for DNA viruses.

**A3.1 Diversity of organisms**: 37 claims recorded, 7 open

- f9: Diploid chromosome numbers are even; odd numbers in body cells arise from aneuploidy or unpaired sex chromosomes (XO males in e.g. grasshoppers).
- f12: Centromere indices are rounded cytogenetic values; metacentric 1, 3, 16, 19, 20; submetacentric 2, 4–12, 17, 18, X; acrocentric 13–15, 21, 22, Y.
- f18: In the figure the positions of the fusion site (47% along chr2) and vestigial centromere (54.5%) are approximate, derived from GRCh38 coordinates (~114 Mb and ~132 Mb of 242 Mb); chimpanzee centromere positions are drawn to align with these and are schematic.
- f22: Genome sizes used — Mycoplasma genitalium 0.58 Mb; E. coli 4.6 Mb; S. cerevisiae 12.1 Mb; C. elegans 100 Mb; Arabidopsis 135 Mb; Drosophila 175 Mb; rice 390 Mb; Takifugu rubripes 390 Mb; chicken 1.05 Gb; maize 2.3 Gb; mouse 2.7 Gb; human 3.1 Gb; onion 16 Gb; axolotl 32 Gb; Protopterus aethiopicus 130 Gb; Paris japonica 149 Gb; Tmesipteris oblanceolata 160 Gb.
- f28: A human genome can now be sequenced in a day or two for a few hundred US dollars.
- f31: Many dandelions (Taraxacum) reproduce by apomixis and hundreds of microspecies are named; bdelloid rotifers have no known males and appear to have been asexual for millions of years, with several hundred described species.
- f37: The mule animation uses a simplified, hypothetical chromosome set (horse A, B, C, D; donkey A, B, CD) to illustrate failed pairing and unbalanced segregation; real horse–donkey karyotype differences involve several fusions and rearrangements, and in mules meiosis usually arrests.

**A3.2 Classification and cladistics**: 26 claims recorded, 5 open

- f1: About two million species have been named and described; estimates of the total number of species run to several million or more.
- f5: Shared characteristics listed in the sim — vertebrates cranium and vertebrae (simple cartilage elements in lampreys); jawed vertebrates jaws and paired fins; bony vertebrates bone and lungs/swim bladder derived from lungs; tetrapods four limbs with digits; amniotes amniotic egg; mammals hair and mammary glands; reptiles beta-keratin scales (also in feathers); archosaurs four-chambered heart and gizzard.
- f12: Human and chimpanzee genomes differ at about 1.2% of aligned bases; at about 1 × 10⁻⁹ substitutions per base per year per lineage this gives a split about 6 million years ago, consistent with fossils; slower pedigree-based rates give older dates.
- f19: The old figwort family had several thousand species (about 5000 in about 275 genera) and fewer than half of the species remain in it.
- f20: The similarities used to define the figwort family arose by convergent evolution or were shared with other families (ancestral traits), not exclusive common ancestry.

**A4.1 Evolution and speciation**: 39 claims recorded, 6 open

- f5: Approximate cytochrome c amino acid differences from humans: chimpanzee 0, rhesus monkey 1, dog 11, horse 12, chicken 13, tuna 21, baker's yeast about 45; human cytochrome c has 104 amino acids.
- f14: Dolphin flipper — short flattened humerus, radius and ulna; immobile elbow and wrist; hyperphalangy in digits 2 and 3.
- f25: The bonobo–chimpanzee split happened roughly 1–2 million years ago, probably when founders crossed the Congo during a dry period of low water.
- f26: Absence of gorillas south of the Congo leaves more terrestrial plant food for bonobos, a likely selection pressure behind larger, more stable and less aggressive groups.
- f31: Darwin's finches descend from one ancestral seed-eating finch (a tanager) from mainland South America, within the last roughly 1–3 million years, and now number about 15–18 species; up to about ten coexist on one island.
- f37: Persicaria has over 100 species, many formed by hybridization and polyploidy; P. maculosa (2n = 44) is an allotetraploid from P. lapathifolia and P. foliosa, each 2n = 22.

**A4.2 Conservation of biodiversity**: 31 claims recorded, 10 open

- f2: About 2 million species have been described, with roughly 15,000–20,000 new species described each year.
- f7: Probable triggers — End-Ordovician glaciation; Late Devonian uncertain (ocean anoxia, climate change, several pulses); End-Permian Siberian Traps volcanism; End-Triassic volcanism (Central Atlantic Magmatic Province) as Pangaea rifted; End-Cretaceous Chicxulub asteroid impact with Deccan Traps volcanism.
- f8: About 1.5% of well-studied mammal and bird species are recorded as extinct since 1500, and about 26% of assessed mammals are threatened; even losing all threatened mammals would be below the 75% threshold, but the rate is far faster than in past events.
- f9: North Island giant moa (Dinornis novaezealandiae) was one of nine moa species; flightless; females much larger than males (about 2 m at the back, well over 100 kg). Moa evolved with no land mammal predators; Haast's eagle, their only major predator, lived only on the South Island, so the North Island giant moa never met it.
- f11: Moa reproduced slowly (took several years to mature, laid few eggs) and evolved without mammal predators; dogs and rats introduced by settlers may have taken eggs and chicks.
- f14: Dipterocarpaceae has roughly 500–700 species depending on classification; mixed dipterocarp forest is the main lowland rainforest of Borneo, Sumatra and the Malay Peninsula, with emergent trees often over 50 m, very high species richness and mast fruiting every few years.
- f18: Less than a few per cent (commonly cited as under 4%) of the original North American tallgrass prairie remains, lost to ploughing, fire suppression and removal of bison.
- f20: IUCN Red List percentages of assessed species threatened: amphibians ~41%, sharks and rays ~37%, conifers ~34%, mammals ~26%, birds ~12% (2024 summary); reef-building corals ~44% (Global Coral Assessment, November 2024).
- f30: IUCN categories and distinctiveness of EDGE explorer species: Attenborough's long-beaked echidna CR, monotreme (five living species); aye-aye EN, sole living species of Daubentoniidae; Chinese giant salamander CR, family Cryptobranchidae; platypus NT, sole living species of Ornithorhynchidae; tuatara LC (2019), sole living rhynchocephalian, lineage split from squamates over 200 Ma; mountain chicken frog CR, genus Leptodactylus with dozens of species; house sparrow LC. ED is shown only qualitatively; no scores are invented.
- f31: The main threats listed for EDGE explorer species (echidna — hunting and forest loss; baiji — by-catch, dams, pollution, boat traffic; aye-aye — forest loss and killing; salamander — over-collection and genetic mixing from farm releases; tuatara — protected on predator-free islands).

### Theme B: claims for a teacher to confirm

Generated from each topic's `facts.yaml` (status `open`).

**B1.1 Carbohydrates and lipids**: 30 claims recorded, 4 open

- f3: Example sizes used with SI prefixes — blood glucose about 5 mmol dm⁻³ (normal fasting range about 4–6); a white adipocyte can be about 100 μm across (range roughly 20–200 μm); a glucose molecule is about 1 nm across; seal blubber can be several cm thick.
- f12: Starch is about 20–30% amylose and 70–80% amylopectin; amylose is an unbranched α-1,4 chain forming a helix of about 6 glucose units per turn (left-handed, as in V-amylose); amylopectin branches by α-1,6 bonds about every 24–30 residues (often quoted 20–30); glycogen about every 8–12 residues.
- f23: Glycogen is stored with roughly 3 g of water per gram (published estimates about 2.7–4 g); fat droplets in adipocytes contain almost no water.
- f25: Thermal conductivity of adipose tissue ≈ 0.2 W m⁻¹ K⁻¹, about half that of muscle (≈ 0.5) and a third of water (≈ 0.6); water conducts heat about 25 times better than air. The sim's insulation part is a qualitative series-resistance model (R_tissue 0.03 m² K W⁻¹; h = 10 air, 200 water).

**B1.2 Proteins**: 31 claims recorded, 5 open

- f12: Pepsin works at about pH 1.5–2 and is irreversibly denatured at neutral to alkaline pH. In the model it is half-denatured at about pH 6.4.
- f15: Model temperatures and pH thresholds in the denaturation simulation (human enzyme half-denatured at 55 °C and outside pH ~4.2–9.8; Taq at ~99 °C) are illustrative.
- f16: R-group classes at pH 7 (Campbell scheme): non-polar Gly, Ala, Val, Leu, Ile, Met, Phe, Trp, Pro; polar Ser, Thr, Cys, Tyr, Asn, Gln; acidic Asp, Glu; basic Lys, Arg, His. Some texts class Gly, Cys, Tyr, His or Trp differently.
- f27: IB treats insulin and collagen as non-conjugated proteins with quaternary structure. Collagen carries a little carbohydrate (glucose–galactose on some hydroxylysines), which some biochemistry texts would count as a glycoprotein; the page says it has no prosthetic group.
- f31: The haemoglobin, insulin and collagen models are schematic cartoons at a common scale; positions are illustrative, though chain counts, chain lengths, disulfide pairings, haem count and helix handedness are correct.

**B2.2 Organelles and compartmentalization**: 25 claims recorded, 5 open

- f3: Typical differential centrifugation values — about 600–1,000 × g 10 min (nuclei), 1,000–4,000 × g 10 min (chloroplasts, plant tissue; they pellet before mitochondria), 10,000–20,000 × g 20 min (mitochondria), 80,000 × g 60 min (microsomes — ER and plasma membrane fragments), 150,000 × g 3 h (ribosomes).
- f4: The ultracentrifuge was developed in the 1920s (Svedberg) and cell fractionation methods from the 1930s onwards; fractionation showed isolated mitochondria carry out aerobic respiration and led to the discovery of lysosomes in the 1950s through latent enzyme activity that rose when membranes were damaged.
- f18: The nuclear envelope breaks into vesicles at the end of prophase in mitosis and meiosis, releasing the chromosomes, and is rebuilt from the vesicles around the daughter nuclei in telophase; in many animal cells the membrane is actually absorbed into the ER network.
- f21: The Golgi apparatus is a stack of usually about four to eight separate cisternae in animal cells, with a convex cis face towards the ER and a concave trans face towards the plasma membrane; enzymes in the cisternae modify proteins (glycosylation, cleavage); proinsulin is cleaved to insulin mainly in immature secretory vesicles after they leave the trans-Golgi.
- f25: Proportions in the 3D scenes and diagrams are schematic — membrane gaps, pores, ribosomes and proteins are drawn far larger than real; nucleus typically 5–10 µm across.

**B2.3 Cell specialization**: 26 claims recorded, 6 open

- f10: About two million red blood cells are produced every second in an adult.
- f12: Human cell sizes used: red blood cell ~7–8 µm diameter, ~2 µm thick (≈1 µm at centre); white blood cells ~7–20 µm (small lymphocytes smallest, monocytes largest); sperm head ~3 µm wide and ~5 µm long, whole cell ~50–60 µm; secondary oocyte ~110 µm (without zona); motor neuron cell body ~20–100 µm, axon up to ~1 m; skeletal muscle fibre 10–100 µm diameter, mm to >10 cm long.
- f17: Erythrocyte volume ≈ 90 µm³ (90 fL) and surface area ≈ 135–140 µm², giving SA:V ≈ 1.5 µm⁻¹; a sphere of 90 µm³ has SA ≈ 97 µm² (SA:V ≈ 1.1 µm⁻¹).
- f19: Type I pneumocytes are extremely thin squamous cells covering ~95% of the alveolar surface; the air–blood barrier is about 0.5 µm thick (harmonic mean ~0.6 µm in humans, as thin as ~0.2 µm in places).
- f21: Cardiac muscle cells are branched, joined by intercalated discs containing gap junctions and desmosomes, usually have one central nucleus (a minority have two), and are about 100 µm long (≈50–150 µm) and 10–25 µm wide.
- f22: Skeletal muscle fibres are unbranched, multinucleate (peripheral nuclei) cells formed by fusion of myoblasts, 10–100 µm in diameter and from millimetres to over 10 cm long.

**B3.1 Gas exchange**: 30 claims recorded, 5 open

- f5: An adult human lung pair contains roughly 300–500 million alveoli (mean ≈ 480 million in Ochs et al. 2004), each ≈ 0.2–0.3 mm across, with a total alveolar surface area of about 50–100 m² (often quoted as ≈ 70 m²).
- f15: In the exercise model, tidal volume rises to ≈ 2.5 dm³ and rate to ≈ 40 breaths per minute (minute ventilation ≈ 100 dm³ min⁻¹); ≈ 70 % of the extra TV comes from the IRV and ≈ 30 % from the ERV, VC unchanged.
- f22: Illustrative stomatal densities in the sim — lower epidermis 150 mm⁻², upper 40 mm⁻²; high-power field diameter ≈ 0.3–0.6 mm; stoma (guard-cell pair) ≈ 40 µm long; patch-to-patch variation ±20 %.
- f26: Bohr shift model — pH from Henderson–Hasselbalch with HCO₃⁻ fixed at 24 mmol dm⁻³ and CO₂ solubility 0.23 mmol dm⁻³ kPa⁻¹; log₁₀P50 rises by 0.48 per unit fall in pH (CO₂ Bohr coefficient). Fixed bicarbonate exaggerates pH change slightly compared with buffered blood; qualitative direction is correct.
- f28: The Bohr shift moves the curve to the RIGHT. (The study guide page 120 text says "to the left" — a typo; its own graph shows the higher-CO₂ curve to the right.)

**B3.2 Transport**: 36 claims recorded, 4 open

- f14: Occlusion model thresholds are qualitative — angina on exertion with narrowings above about 66% of diameter, ischaemia at rest above about 92%; clinically, exertional angina usually appears with about 70% diameter stenosis and resting flow falls only with very severe stenosis.
- f20: Capillary blood pressure is roughly 35 mmHg at the arteriole end and 15 mmHg at the venule end; plasma proteins retained in the blood oppose filtration osmotically.
- f21: Revised Starling principle — in many tissues little fluid is reabsorbed at the venule end in the steady state and most filtered fluid returns as lymph.
- f32: A resting blood pressure persistently at or above about 140/90 mmHg is usually classed as hypertension.

**B3.3 Muscle and motility**: 31 claims recorded, 7 open

- f2: Muscle fibres are typically 10–100 µm in diameter and can be several centimetres long; myofibrils are about 1–2 µm in diameter.
- f9: Each power stroke moves the thin filament a few nanometres (about 5–10 nm).
- f13: Titin keeps myosin centred, prevents overstretching, stores elastic energy when stretched and its elastic recoil helps the sarcomere return to its resting length.
- f16: Muscles for fine control (eye, fingers) have small motor units (around 10 fibres); large leg muscles have units of 1,000 or more fibres.
- f20: Typical active hip ranges — flexion ≈ 120°, extension ≈ 30°, abduction ≈ 45°, adduction ≈ 30°, medial and lateral rotation ≈ 45° each; elbow flexion ≈ 0–145°.
- f27: Male emperor moths (Saturnia pavonia) locate females by flying upwind along the female's sex pheromone plume.
- f30: The blowhole is the nostril (single in toothed whales, paired in baleen whales) on top of the head, closed by a muscular plug during dives; the airway is separated from the mouth and oesophagus; cartilage-reinforced airways allow rapid breaths that replace most of the lung air.

**B4.1 Adaptation to environment**: 26 claims recorded, 5 open

- f14: Approximate reef conditions: depth mostly < ~50 m with fastest growth in the top 20–30 m; clear, low-sediment water; temperature ~23–29 °C (reef development rare where water falls below ~18 °C); salinity ~32–42 ppt; pH ~8.0–8.3.
- f15: Sim thresholds: temperature stress 18–23 and 29–32 °C, fail < 18 or > 32 °C; salinity stress 28–32 and 42–45 ppt; pH stress 7.8–8.0, fail < 7.8; light ok ≥ 20%, stress 10–20%, fail < 10% of surface; attenuation coefficient 0.045 m⁻¹ in the clearest water (≈10% light at 50 m).
- f19: Biome graph boundaries used in the sim are approximate, simplified from Whittaker (1975) as redrawn by Ricklefs: tundra below −5 °C; taiga −5 to 5 °C; desert below D(T) = 15 + 0.5(T + 5) cm; temperate forest above F(T) = 60 + 4(T − 5) cm (so about 80 cm at 10 °C) between 5 and 20 °C; tropical forest above 150 cm at ≥ 20 °C; upper envelope from 50 cm at −15 °C to 450 cm at 30 °C.
- f20: Approximate climate normals used for example places: Manaus 27 °C / 230 cm; Phoenix 24 °C / 20 cm; Kano 26 °C / 70 cm; Washington DC 14 °C / 105 cm; Denver 10 °C / 38 cm; Fairbanks −2 °C / 28 cm; Utqiaġvik −11 °C / 12 cm.
- f25: Yellow meranti (Shorea faguetiana) is a dipterocarp of Borneo and the Malay Peninsula; the individual "Menara" in Danum Valley, Sabah, measured 100.8 m in 2019, the tallest known tropical tree. It is an evergreen emergent with buttresses and winged fruits; dipterocarps show mast fruiting every few years.

**B4.2 Ecological niches**: 28 claims recorded, 4 open

- f10: Mixotrophs are common in oceanic plankton (dinoflagellates, ciliates and others); Mesodinium rubrum retains functional chloroplasts from ingested cryptophyte algae and must keep feeding, an obligate mixotroph.
- f14: Paranthropus robustus - South Africa (e.g. Swartkrans), roughly 2 to 1 million years ago; very large flat molars, molarized premolars, very thick enamel, small incisors and canines, sagittal crest in many (especially male) skulls, flaring zygomatic arches, deep mandible; inferred herbivorous diet of tough or hard plant foods, with microwear and isotope evidence suggesting some dietary variety.
- f15: Homo floresiensis - Liang Bua, Flores, Indonesia; skeletal remains about 100 000–60 000 years old; adults about 1.1 m tall with a brain of about 400 cm³; small molars similar to small modern humans, primitive premolars, no sagittal crest, no chin; found with stone tools and animal bones including juvenile Stegodon, some cut-marked.
- f22: Tropical rainforest floor receives only about 1–2 % of full sunlight.

### Theme C: claims for a teacher to confirm

Generated from each topic's `facts.yaml` (status `open`).

**C1.1 Enzymes and metabolism**: 24 claims recorded, 5 open

- f7: Large substrates may be immobilized (e.g. DNA for DNA-copying/repair enzymes; starch grains in seeds) and enzymes may be immobilized in membranes (e.g. disaccharidases in the microvillus plasma membrane of the small intestine; ATP synthase in the inner mitochondrial membrane).
- f11: Pepsin is irreversibly inactivated at pH 8 (used as the premise of quiz q3).
- f17: Metabolic heat is inevitable because energy transfers are not 100% efficient; mammals and birds use it to maintain constant body temperature; bumblebees warm flight muscles by shivering and tuna keep swimming muscles warmer than the water.
- f19: Allosteric inhibitors bind reversibly to a specific allosteric site, change conformation and prevent catalysis; IB treats this as non-competitive inhibition, which lowers the maximum rate and is not overcome by substrate.
- f23: Resistance via altered transpeptidases — mutations change amino acids near the active site so penicillin binds poorly while cross-linking continues; in MRSA an additional low-affinity transpeptidase (PBP2a, mecA) is used. β-lactamase is a separate mechanism.

**C1.2 Cell respiration**: 32 claims recorded, 4 open

- f5: Cells store little ATP; in contracting muscle the store lasts only a few seconds. A resting human turns over roughly their own body mass of ATP per day.
- f13: Respirometer sim values are illustrative — 0.3 mm³ O₂ g⁻¹ min⁻¹ at 20 °C, Q10 ≈ 2, falling above ~40 °C (optimum ~35–37 °C).
- f20: Fermentation stops when sugar runs out or ethanol becomes toxic to the yeast, at about 15% for most wine yeasts.
- f31: Fatty acids are broken into 2C units in the mitochondrial matrix and enter as acetyl CoA, so they are respired only aerobically; glycerol can be converted to a glycolysis intermediate (dihydroxyacetone phosphate).

**C1.3 Photosynthesis**: 27 claims recorded, 3 open

- f4: Chromatography order (non-polar solvent, TLC) from the top — carotene (Rf ≈ 0.9+), phaeophytin, chlorophyll a, chlorophyll b, xanthophylls. Sim Rf values 0.92, 0.78, 0.62, 0.50, 0.38, 0.27 are illustrative.
- f7: Action spectrum has peaks in blue and red and a trough in green that is well above zero; modelled trough ≈ 25% of maximum.
- f14: FACE found smaller growth and yield increases than enclosure studies predicted, partly because nitrogen and water become limiting.

**C2.1 Chemical signalling**: 26 claims recorded, 4 open

- f10: The guide lists "nitrous oxide" as a neurotransmitter; the gaseous signalling molecule is nitric oxide (NO). The site uses nitric oxide and flags the discrepancy (REVIEW.md S7).
- f23: Much of oestradiol's feedback on GnRH neurons is mediated by kisspeptin neurons expressing ERα, because GnRH neurons themselves lack ERα; the page follows the IB wording (oestradiol acting on GnRH-secreting cells) and notes the simplification.
- f24: Progesterone, via the progesterone receptor in endometrial cells, maintains the secretory endometrium (glands, blood supply) ready for implantation; falling progesterone leads to menstruation. The Allott study guide says progesterone makes endometrium cells divide repeatedly; proliferation is mainly driven by oestradiol, so the site does not say this.
- f26: In the late follicular phase LH (with FSH) stimulates follicles to secrete more oestradiol, closing the positive feedback loop; the LH surge triggers ovulation at about day 14, after which oestradiol falls.

**C2.2 Neural signalling**: 28 claims recorded, 4 open

- f2: The human brain contains roughly 86 billion neurons and on the order of 10¹⁴ (a hundred trillion) synapses.
- f10b: Negative-correlation example — time for an impulse to travel a fixed distance falls as fibre diameter rises (inverse relationship); cross-species comparisons such as conduction speed against body size give weak correlations confounded by myelination and temperature.
- f20: Neonicotinoids (e.g. imidacloprid) are nicotine-like insecticides that bind nicotinic ACh receptors, much more strongly in insects than mammals; they bind strongly and are not broken down by acetylcholinesterase, so they stay bound for a long time, causing overstimulation then blocked transmission, paralysis and death.
- f21: The EU banned outdoor use of imidacloprid, clothianidin and thiamethoxam in 2018 because of risks to bees.

**C3.1 Integration of body systems**: 31 claims recorded, 3 open

- f12: The biceps is used as the effector (flexing the elbow to lift the hand). Real withdrawal involves several flexor muscles.
- f18: Sim values — resting heart rate 70 min⁻¹, stroke volume 70 cm³, cardiac output ≈ 4.9 dm³ min⁻¹, maximum heart rate ≈ 185 min⁻¹, maximum stroke volume ≈ 110 cm³; resting ventilation 12 breaths min⁻¹ × 0.5 dm³; maximal exercise about 40 breaths min⁻¹ and tidal volume about 2.5 dm³ (≈ 100 dm³ min⁻¹).
- f29: The statement that a larger root system sends more cytokinin to the shoot (and a larger shoot more auxin to the roots), matching their growth, is a simplified model of root–shoot integration.

**C3.2 Defence against disease**: 23 claims recorded, 5 open

- f11: Secondary response is faster (lag ~2 days vs ~7), larger (model 10×; real often 10–100×) and longer-lasting than the primary response. Model numbers are illustrative.
- f16: Halicin was identified in 2020 by machine-learning screening of a chemical library (Stokes et al., Cell 2020).
- f17: About 60% of known human infectious diseases are zoonotic, and about 75% of emerging ones.
- f20: Herd immunity threshold ≈ 1 − 1/R₀; measles R₀ ≈ 12–18 gives ≈ 92–94%; early SARS-CoV-2 R₀ ≈ 3 and seasonal flu ≈ 1.5 (sim presets).
- f22: Percentage difference is given relative to a stated reference group ((A − B) ÷ A × 100); some sources use the mean of the two values. Worked example and quiz data are illustrative, not real.

**C4.1 Populations and communities**: 26 claims recorded, 6 open

- f4: A standard deviation that is large relative to the mean indicates a clumped distribution and a less reliable estimate; a small SD indicates even spread.
- f11: St Matthew Island — 29 reindeer introduced 1944; about 1350 in 1957; about 6000 in 1963; 42 in 1966 after lichen overgrazing and a severe winter (1963–64); no predators.
- f17: Orchid mycorrhizal hyphae penetrate root cell walls but not plasma membranes, forming coils; fungus supplies water and mineral ions, and sugars to seedlings (tiny seeds with almost no reserves); adult green orchids can pass some photosynthetic sugars to the fungus (shown in some species).
- f19: Grey squirrels were introduced to Britain from North America in the late 19th century; they digest tannin-rich acorns more efficiently than red squirrels and take hazelnuts before ripening, outcompeting reds in broadleaved woodland; they also carry squirrelpox virus.
- f22: Snowshoe hare and Canada lynx numbers cycle with a period of about 10 years, lynx lagging hares by about 1–2 years; evidence from Hudson's Bay Company fur records. Kluane (Yukon) experiments showed both predation and food limit hares; combining predator exclusion and food addition raised density far more than either alone.
- f25: Streptomyces griseus secretes streptomycin (discovered 1943, Schatz and Waksman); Penicillium secretes penicillin, which inhibits bacterial cell-wall (peptidoglycan) synthesis. Their role in reducing competition in nature is the standard textbook interpretation.

**C4.2 Transfers of energy and matter**: 24 claims recorded, 6 open

- f4: Food-web example (British oak woodland) — winter moth caterpillars eat oak leaves; blue tits eat caterpillars; sparrowhawks eat blue tits; wood mice eat acorns, bramble seeds/berries and invertebrates such as caterpillars; tawny owls eat wood mice; red foxes eat rabbits, wood mice and blackberries; rabbits eat grasses.
- f7: Producers convert only a small fraction (often about 1–2% or less) of the light reaching them into chemical energy; at Silver Springs gross production was about 1.2% of the sunlight.
- f8: Silver Springs (Odum 1957) energy assimilated, kcal m⁻² yr⁻¹ — sunlight 1,700,000; producers 20,810; herbivores 3,368; carnivores 383; top carnivores 21; decomposers 5,060. In kJ (×4.184, 3 s.f.) — 87,100; 14,100; 1,600; 87.9; decomposers 21,200. Efficiencies ≈16.2%, 11.3%, 5.5%.
- f12: Approximate mean NPP (g dry mass m⁻² yr⁻¹) — tropical rainforest 2,200; temperate deciduous forest 1,200; savanna 900; boreal forest 800; temperate grassland 600; tundra and alpine 140; open ocean 125; desert and semidesert scrub 90. Carbon ≈ 45% of dry biomass.
- f15: Formation times — most peat accumulated over the last ~10,000 years (post-glacial) and is still forming; much coal formed ~300–360 million years ago (Carboniferous); oil and gas mostly from marine plankton over tens to hundreds of millions of years.
- f17: Mauna Loa annual mean CO₂ (ppm, rounded) — 1959 316.0; 1960 316.9; 1965 320.0; 1970 325.7; 1975 331.1; 1980 338.8; 1985 346.1; 1990 354.4; 1995 360.8; 2000 369.7; 2005 380.0; 2010 389.9; 2015 401.0; 2016 404.4; 2017 406.8; 2018 408.7; 2019 411.7; 2020 414.2; 2021 416.4; 2022 418.6; 2023 421.1; 2024 424.6.

### Theme D: claims for a teacher to confirm

Generated from each topic's `facts.yaml` (status `open`).

**D1.1 DNA replication**: 24 claims recorded, 3 open

- f15: DNA profiles use STR loci; the US CODIS core set is 20 loci (13 before 2017) and the UK uses DNA-17 (16 STRs plus a sex marker) — summarised as "about 13–20 markers".
- f16: RT-PCR (reverse transcription then PCR) was used for COVID-19 diagnosis. The IB guide does not name this example; it is included as one of the "broad range of applications".
- f21: Proofreading by Pol III removes a mismatched nucleotide from the 3′ end and replaces it; it improves fidelity about 100-fold, to roughly 1 error in 10⁷ nucleotides added.

**D1.2 Protein synthesis**: 27 claims recorded, 2 open

- f4: About eight to nine RNA nucleotides remain paired with the template in the transcription bubble (RNA–DNA hybrid); the bubble is roughly 12–14 base pairs.
- f14: The start of HBB coding sequence is ATG GTG CAC CTG ACT CCT GAG GAG AAG TCT, coding Met-Val-His-Leu-Thr-Pro-Glu-Glu-Lys-Ser; the initiator Met is removed from mature β-globin.

**D1.3 Mutation and gene editing**: 26 claims recorded, 3 open

- f7: Each human is born with roughly 60–70 de novo mutations (single-base changes) not present in either parent.
- f20: A CRISPR-edited high-GABA tomato (Sicilian Rouge High GABA) went on sale in Japan in 2021; the edit increases the activity of glutamate decarboxylase (GAD), which makes GABA.
- f25: Plant and animal lineages diverged well over a billion years ago.

**D2.1 Cell and nuclear division**: 28 claims recorded, 4 open

- f15: Spindles of meiosis II are shown at right angles to the spindle of meiosis I.
- f18: Down syndrome is trisomy 21 (47 chromosomes), usually from non-disjunction in meiosis, with the extra chromosome most often of maternal origin (around 90% of non-disjunction cases), mostly from maternal meiosis I.
- f20: Approximate live-birth prevalence of Down syndrome by maternal age — 20 about 1 in 1450, 25 about 1 in 1350, 30 about 1 in 950, 35 about 1 in 350, 40 about 1 in 85, 45 about 1 in 30.
- f28: Mitotic-index sim fields (meristem 13/70, elongation zone 1/70, normal epithelium 2/70, tumour 11/70) are invented practice values that show the expected pattern, not measured data.

**D2.2 Gene expression**: 29 claims recorded, 5 open

- f17: Some epigenetic tags survive meiosis and gamete formation (transgenerational epigenetic inheritance).
- f18: Air pollution exposure (PM2.5, NOx, ozone, PAHs) is associated with lower global DNA methylation (e.g. LINE-1, Alu) in blood, gene-specific methylation changes (some hypermethylated promoters), altered expression of inflammatory/immune genes, and higher rates of asthma, inflammation and cardiovascular disease.
- f22: Ligers (lion father × tiger mother) grow larger than both parent species; tigons (tiger father × lion mother) are about parental size or smaller. Usual explanation is genomic imprinting of growth genes and parental conflict (stronger imprints in lions).
- f25: A heterozygote can show the recessive phenotype if the dominant allele is silenced by imprinting.
- f26: Fraga et al. 2005 (PNAS) studied 40 MZ twin pairs aged 3–74; older pairs and pairs who had spent less of their lives together showed greater differences in DNA methylation and histone acetylation and in gene expression; lifestyle differences such as diet, smoking and activity were noted.

**D2.3 Water potential**: 23 claims recorded, 5 open

- f6: Contractile vacuoles of freshwater protists (Paramecium, Amoeba) collect water entering by osmosis and expel it through a pore in the plasma membrane using ATP; in Paramecium they are fed by radiating canals and cycle every few seconds.
- f9: A plant cell in a solution isotonic with its cell sap is flaccid (ψp ≈ 0), as shown in the animation's isotonic step.
- f10: Brief plasmolysis can be reversed; prolonged or severe plasmolysis usually kills the cell.
- f14: Simulated tissue isotonic concentrations (potato 0.30, mystery tissues 0.46 and 0.19 mol dm⁻³ sucrose) are illustrative. Real potato tissue is typically isotonic with roughly 0.25–0.35 mol dm⁻³ sucrose.
- f22: The solution causing no mass change has the same water potential as the tissue; for turgid tissue it is slightly less concentrated than the cell sap.

**D3.1 Reproduction**: 22 claims recorded, 4 open

- f6: Oestradiol increases FSH receptors on follicle cells (positive feedback boosting oestradiol output).
- f9: IVF — down-regulation (often a GnRH analogue, ~2–3 weeks) suspends FSH/LH secretion; FSH injections ~8–14 days give superovulation; hCG injection ~36 h before egg collection completes maturation; embryos transferred after 2–5 days; progesterone support often given.
- f13: Self-incompatibility controlled by a multi-allelic S-locus; pollen with an S-allele matching the stigma is rejected (fails to germinate or tube growth stops in stigma/style); found in Brassicaceae, Rosaceae and Solanaceae.
- f21: Progesterone comes from the corpus luteum in early pregnancy and from the placenta from about 8–12 weeks; a fall in progesterone (or its action) allows oxytocin to rise at term; oxytocin positive feedback via cervical stretch receptors.

**D3.2 Inheritance**: 22 claims recorded, 5 open

- f5: Tanning (increased melanin synthesis after UV exposure) and increased red blood cell production at high altitude are reversible plastic responses without change of genotype.
- f10: The X chromosome carries over 800 protein-coding genes; the Y fewer than 100 (page text says several hundred vs a few dozen).
- f15: Outliers are values more than 1.5 × IQR below Q1 or above Q3; quartiles computed as medians of lower and upper halves (excluding the median when n is odd).
- f19: Gene loci (GRCh38) — HBB 11p15.4, HBD 11p15.4, INS 11p15.5, PAH 12q23.2, CFTR 7q31.2, ABO 9q34.2, F8 Xq28, OPN1LW Xq28, SRY Yp11.2; about 20 000 protein-coding genes.
- f20: Drosophila body colour (b, black) and wing (vg, vestigial) genes are linked on chromosome 2 with roughly 17–18% recombination; the sim and worked example use letters G/g and L/l and invented counts.

**D3.3 Homeostasis**: 21 claims recorded, 6 open

- f3: Blood glucose is held at about 4–8 mmol dm⁻³ through the day with a set point near 5 mmol dm⁻³.
- f9: Peripheral thermoreceptors in skin and central thermoreceptors (hypothalamus) feed the hypothalamus; cold raises TRH → TSH → thyroxine, which raises metabolic rate; thyroxine falls when overheated.
- f12: Thermoregulation sim treats about 24 °C as neutral for a lightly clothed adult at rest; values are qualitative.
- f16: The PCT reabsorbs all filtered glucose and amino acids (Na⁺ cotransport) and around two-thirds or more of the water and Na⁺.
- f19: Blood flow at rest (cardiac output ≈ 5.8 dm³ min⁻¹) — muscle ≈ 1000, gut ≈ 1350, brain ≈ 750, kidneys ≈ 1100 cm³ min⁻¹; vigorous exercise (≈ 17.5 dm³ min⁻¹) — muscle ≈ 12 500, gut ≈ 600, brain ≈ 850, kidneys ≈ 600.
- f20: Sleep values (cardiac output ≈ 4.5 dm³ min⁻¹; muscle ≈ 600, gut ≈ 1200, brain ≈ 700, kidneys ≈ 950 cm³ min⁻¹) are illustrative; cerebral flow falls in deep non-REM sleep and rises in REM sleep.

**D4.1 Natural selection**: 33 claims recorded, 11 open

- f5: An oak can drop tens of thousands of acorns in a mast year; a large female Atlantic cod releases millions of eggs in a breeding season.
- f6: Darwin calculated that one pair of elephants would have nearly 19 million descendants after about 750 years if all survived.
- f7: After the extreme 2014 winter cold snap in Texas, southern populations of green anole lizards (Anolis carolinensis) showed greater cold tolerance than before.
- f8: A prolonged cold, rainy spell in May 1996 in south-western Nebraska killed about half of the cliff swallows; survivors were larger on average.
- f11: Weismann cut off the tails of mice for five successive generations and all offspring were born with normal tails.
- f12: Birds of paradise (Paradisaeidae) number about 45 species, mostly in New Guinea; in most species females alone nest and rear young; some species display at leks.
- f15: Endler's greenhouse experiment: one mixed stock bred for about 6 months in ten pools without predators; then Crenicichla was added to 4 pools, Rivulus to 4, and 2 stayed predator-free; censuses about 5 and 14 months later showed fewer and smaller spots with Crenicichla and more spots with Rivulus and in controls.
- f16: Endler's field transplant: in 1976 guppies from a high-predation (Crenicichla) site were moved to a guppy-free stream above a waterfall containing only Rivulus; about two years (roughly 15 generations) later the males had more and larger spots.
- f19: CCR5-Δ32 (rs333) allele frequency is roughly 0.1–0.15 in northern Europe and close to 0 in most African, East Asian and indigenous American populations; homozygotes resist infection by CCR5-using (R5) HIV strains.
- f28: Cystic fibrosis incidence of about 1 in 2500 newborns is typical of populations of northern European ancestry (often quoted 1 in 2500 to 1 in 3500); PKU is often quoted at about 1 in 10 000.
- f31: The Illinois long-term selection experiment for maize kernel oil began in 1896; after about 100 generations the high-oil line had several times the original oil content (about 4.7% → about 20%) and the low-oil line very little (about 1% or less).

**D4.2 Stability and change**: 30 claims recorded, 12 open

- f2: The Daintree rainforest (Wet Tropics, Queensland) has persisted in the region, at least in refugia, for tens of millions of years and contains many ancient angiosperm lineages (e.g. Idiospermum, Austrobaileyaceae).
- f3: The Namib Desert has been arid or semi-arid for tens of millions of years (often quoted as at least ~55 million years).
- f4: Amazon transpiration recycles water vapour that falls as rain further inland (west); deforestation reduces transpiration and rainfall and increases drought and fire, a positive feedback; the minimum forest area (tipping point) is uncertain, with ~20–25% loss suggested and ~17% already lost.
- f5: PRODES annual deforestation in the Brazilian Legal Amazon was about 27,800 km² in 2004, 4,600 km² in 2012 and 13,000 km² in 2021 (rounded from 27,772; 4,571; 13,038).
- f10: Keystone sim model — crabs as alternative otter prey and rockfish dependent on kelp habitat; parameter values are illustrative (qualitative model). Removing otters gives urchins ~8–10× and kelp ~6%; removing crabs leaves kelp ~97%.
- f13: North Sea cod recovery measures — quotas based on stock surveys, larger mesh, closed areas, fleet reduction; stock increased afterwards.
- f15: Agricultural sustainability factors — soil erosion faster than soil formation (soil forms at roughly 1 cm per century or slower); Haber process uses natural gas; phosphate rock is finite; agrochemical pollution and resistance; carbon footprint from fuel, fertilizer manufacture, CH₄ and N₂O.
- f18: DDT residues (ppm wet mass) in the Carmans River estuary, Long Island — water 0.00005, plankton (mostly zooplankton) 0.04, Atlantic silverside 0.23, needlefish 2.07, double-crested cormorant 26.4.
- f22: Blue Planet II (BBC, 2017) is widely credited with shifting public attitudes to marine plastic ("Blue Planet effect"); UK microbead ban 2018.
- f23: Hinewai Reserve, Banks Peninsula, South Island, New Zealand — former farmland regenerating since 1987; well over 1,000 ha; browsing mammals (goats, deer, possums) controlled; minimal interference; gorse (Ulex europaeus) used as a nurse canopy and shaded out by native trees; bird seed dispersal.
- f27: Heather (Calluna vulgaris) cyclical phases — pioneer (~0–6 yr), building (~6–15), mature (~15–25), degenerate (25+), described by Watt (1947) and Gimingham.
- f28: Californian chaparral is fire-adapted with fires every few decades; wood pasture in north-west Europe cycles between grassland and oak.

**D4.3 Climate change**: 29 claims recorded, 7 open

- f2: Atmospheric methane was about 0.72 ppm (≈ 720 ppb) before industrialization and about 1.93 ppm in 2024 — more than doubled (≈ 2.6×).
- f13: Canada's 2023 fire season burned more than 15 million hectares; recent boreal fire years released carbon comparable to a large industrial country's annual fossil emissions.
- f17: Coastal upwelling (Peru, California, Benguela) brings nutrient-rich deep water to the surface; these zones cover a small fraction of ocean area but supply a large share of fish catch. Warming increases stratification. 1972–73 El Niño contributed to the Peruvian anchoveta collapse.
- f22: Peat forms in waterlogged anaerobic soils; temperate/boreal accumulation ≈ 0.5–1 mm per year; tropical peat (SE Asia, Congo Basin) accumulates faster. Peatlands cover ≈ 3% of land and store ≈ 600 Gt C, more than all forest vegetation. Rewetting can briefly increase CH₄.
- f24: Reindeer/caribou (West Greenland, Kangerlussuaq) — calving timing (photoperiod-related) did not advance while plant green-up (incl. Cerastium arcticum) advanced with warming, causing trophic mismatch and reduced calf production/survival.
- f26: Phenology sim parameters are illustrative — caterpillar peak 20 May shifting 6 d/°C; first egg 20 April; hatching 21 days after first egg (≈ 9 eggs at 1/day + ≈ 12 days incubation); chick demand peak ≈ 9 days after hatching; success curve s.d. 8 days; max 7.5 fledglings; day length at 52° N.
- f28: Dendroctonus micans generation time 1–2 years; Dendroctonus rufipennis shifted from a 2-year to 1-year cycle in warm years, contributing to Alaskan outbreaks (Kenai Peninsula).

## Examiner review log

### B2.1 (example page), 19 Oct 2026
An independent reviewer, acting as a strict IB examiner, read the page text, visuals, quiz, flashcards, simulations and screenshots. The quiz keys, all exam-diagram markers and every 3D label were confirmed correct.

| Severity | Finding | Fix | Re-checked |
|---|---|---|---|
| Critical | "Fire an action potential" showed Na⁺ channels closed while the voltage rose from −50 to +40 mV (states lagged one stage behind) | The run now shows the states of the stage being moved towards; the slider hint explains that it shows rising-phase states | ✓ |
| Major | The flat active-transport line could suggest "a plateau rules out active transport" | Note added in the sim and the text: pumps can also saturate; the inhibitor test is decisive | ✓ |
| Major | Saturation was attributed to channels only | "Channel or carrier proteins" in the text and slider | ✓ |
| Minor ×15 | Wording and precision: "conformational change" added; K⁺ selectivity isn't size alone; bilayer "not covalently bonded"; active-transport definition covers the indirect route; cholesterol –OH wording; membrane area statement; flashcard c2 now covers water; K⁺ channel drawn with 4 subunits; diffusion steps show some molecules moving against the net direction; "bond dipoles cancel"; scale bar relabelled; CAMs drawn spanning the membrane; label 13 moved inside the frame | All applied | ✓ |

### Theme A (A1.1–A4.2), 19 Oct 2026
Three independent reviewers, each acting as a strict IB examiner, covered three topics apiece. They read all page text, visuals, quizzes, flashcards, simulation code and screenshots of every visual (each 3D scene, and each animation step's completed state). All 90 MCQ keys were confirmed correct.

| Topic | Critical | Major | Minor | Key fixes |
|---|---|---|---|---|
| A1.1 Water | 0 | 0 | 6 | Loon migration reasoning; buoyancy readout at near-neutral density; consistent 3,450× figure |
| A1.2 Nucleic acids | 0 | 0 | 5 | Unambiguous 5′→3′ backbone linkage; DNA-length arithmetic; Hershey–Chase legend and minority fractions |
| A2.1 Origins of cells | 0 | 2 | 3 | Self-assembly no longer confused with abiotic synthesis; FeS minerals attributed to proposed Hadean vents, not Lost City |
| A2.2 Cell structure | 0 | 1 | 7 | Quiz distractor value fixed (675,000 mm); plastid lineage (secondary endosymbiosis); unshaded exam drawing |
| A2.3 Viruses | 0 | 1 | 5 | 3D tail-tip and tail-fibre labels re-anchored; slimmer lambda tail; host DNA no longer drawn as degraded |
| A3.1 Diversity of organisms | 0 | 0 | 4 | eDNA primers are group-specific; "almost all the same genes" |
| A3.2 Classification and cladistics | 0 | 1 | 4 | Parsimony counts recomputed and unit-tested (10 vs 12; root set by outgroup) |
| A4.1 Evolution and speciation | 0 | 1 | 5 | Limb homology now described as divergent evolution (not adaptive radiation); ploidy notation; finch tree; bat phalanges |
| A4.2 Conservation of biodiversity | **1** | 0 | 5 | **Haast's eagle lived only on the South Island**, so it was not a predator of the North Island giant moa |

All findings were fixed, every gate was re-run (build, 168 unit tests, 234 browser tests, links, Lighthouse 99–100) and the changed visuals were re-checked from fresh screenshots.

### Theme B (B1.1–B4.2, except B2.1), 20 Oct 2026
Three independent examiner reviewers covered three topics each. The curves and maths were checked by hand: the O₂ dissociation model, cardiac valve timings against the pressure crossings, spirometer volumes, SA:V maths, transect r values, sarcomere band geometry, and the Lotka–Volterra invasion criteria. All 90 MCQ keys were confirmed correct.

| Topic | Critical | Major | Minor | Key fixes |
|---|---|---|---|---|
| B1.1 Carbohydrates and lipids | 0 | 2 | 5 | 3D polysaccharide labels re-anchored onto their structures (amylopectin label had been on cellulose) |
| B1.2 Proteins | 0 | 1 | 4 | Histidine shown as partly charged "(+)" at pH 7, not fully "+" |
| B2.2 Organelles and compartmentalization | 0 | 2 | 3 | Bound vs free ribosome products corrected; centrifugation order (chloroplasts pellet before mitochondria) |
| B2.3 Cell specialization | 0 | 0 | 3 | No meaning given to SA and V curves crossing (different units); surfactant drawn in the fluid lining |
| B3.1 Gas exchange | 0 | 2 | 2 | Quiz explanation on the dissociation curve; leaf stoma drawn open, with the label in the pore |
| B3.2 Transport | 0 | 2 | 2 | Capillary pore and endothelium leader lines; occlusion readout states its assumption |
| B3.3 Muscle and motility | 0 | 0 | 4 | Titin recoil timing; Ca²⁺ colour distinct from tropomyosin |
| B4.1 Adaptation to environment | 0 | 0 | 2 | Forest/precipitation threshold in the biome model raised to match Whittaker |
| B4.2 Ecological niches | 0 | 1 | 5 | Coexistence condition stated correctly (depends on K ratio, not just α < 1) |

Study-guide errors noticed by the builders (the site uses the correct version): the Bohr shift is to the right, not the left (S13); the ventricles contract from the apex, not the base; root pressure is usually much smaller than transpiration pull.

All findings were fixed; every gate was re-run (323 unit tests, 387 browser tests, links, and Lighthouse 99–100 on all 25 pages); the changed 3D scenes were re-checked from fresh screenshots.

### Theme C (C1.1–C4.2), 20 Oct 2026
Three independent examiner reviewers covered three topics each. They checked the sims and curves by hand: enzyme rate and inhibition, the ATP and reduced-NAD tallies, the Calvin-cycle counts, the action-potential trace, the herd-immunity threshold, the Lincoln index and chi-squared working, Lotka–Volterra lag, the Silver Springs efficiencies and the Keeling annual means. All 90 MCQ keys were confirmed correct.

| Topic | Critical | Major | Minor | Key fixes |
|---|---|---|---|---|
| C1.1 Enzymes and metabolism | 0 | 1 | 3 | pH denaturation in the rate sim is now permanent at extreme pH (fresh-enzyme reset) |
| C1.2 Cell respiration | 0 | 0 | 6 | Balanced O₂ + 4e⁻ + 4H⁺ → 2H₂O; "fatty acids cannot enter glycolysis"; yield "about 30–32" throughout |
| C1.3 Photosynthesis | 0 | 3 | 3 | Thylakoid 3D keeps far more H⁺ in the lumen than the stroma; diagram H⁺ arrow passes through ATP synthase; spectra sim explains the green part of the action spectrum |
| C2.1 Chemical signalling | 0 | 0 | 4 | Quorum-sensing threshold line drawn where the switch happens; cleft width 20–40 nm on both pages |
| C2.2 Neural signalling | 0 | 1 | 4 | Action-potential animation ends with ions on their resting sides (no "swap"); channel timing changes at the peak |
| C3.1 Integration of body systems | 0 | 0 | 4 | Sympathetic nerves also act on ventricle muscle; "some" auxin is IAAH |
| C3.2 Defence against disease | 0 | 2 | 4 | Fibrin drawn distinct from fibrinogen; herd-immunity wording and verdict at the threshold |
| C4.1 Populations and communities | 0 | 1 | 4 | Quadrat pattern judged by variance ÷ mean, not SD > mean |
| C4.2 Transfers of energy and matter | 0 | 1 | 4 | Carbon-cycle feeding arrow visible; combustion of biomass added |

Study-guide errors noticed by the builders (the site uses the correct version): an action spectrum labelled as an absorption spectrum; "nicotine adenine dinucleotide" for nicotinamide; an unbalanced O₂-reduction equation.

All findings were fixed; every gate was re-run (627 unit tests, 639 browser tests, 106 links, and Lighthouse with all assertions passing). The full run also covered the Theme D pages merged so far (D1.1, D1.2, D1.3, D2.1, D2.2, D2.3). Known minor leftovers: two antibody disulfide bonds are partly hidden by their label when labels are on; the dark-mode look of the new fibrin colour was checked by axe but not by eye.

### Theme D (D1.1–D4.3), 20 Oct 2026
Four independent examiner reviewers covered three topics each. They checked by hand: 5′/3′ directions in every replication, transcription and translation scene; chromosome and chromatid counts at every mitosis and meiosis step; ψ = ψs + ψp working; the menstrual hormone curves; Punnett, pedigree, dihybrid and χ² maths (critical value 7.815, df 3); box-plot quartiles; nephron anatomy (cortex vs medulla, afferent wider than efferent); Hardy–Weinberg working; MSY = rK/4; and the CO₂ values against C4.2. All 120 MCQ keys were confirmed correct.

| Topic | Critical | Major | Minor | Key fixes |
|---|---|---|---|---|
| D1.1 DNA replication | 0 | 0 | 2 | DNA polymerase I role worded unambiguously; SL fork step marked as simplified |
| D1.2 Protein synthesis | 0 | 0 | 4 | Garbled quiz option rewritten; "Release factor" label added to the 3D model; "amine group" as in B1.2 |
| D1.3 Mutation and gene editing | 0 | 1 | 4 | Guide wording on conserved sequences rewritten; UVC does not reach the ground |
| D2.1 Cell and nuclear division | 0 | 0 | 3 | Spindle no longer crosses an intact nuclear envelope; chromosomes decondense in telophase II |
| D2.2 Gene expression | 0 | 0 | 4 | Male ligers/tigons share autosomal (not all nuclear) genes; testosterone link to D3.1 |
| D2.3 Water potential | 0 | 2 | 2 | Bound-water ("solvation") explanation of osmosis removed; wording now matches B2.1 |
| D3.1 Reproduction | 0 | 0 | 6 | Oocyte arrest until its own follicle ovulates; seminal vesicle (not prostate) supplies alkaline fluid; oestradiol feedback via GnRH |
| D3.2 Inheritance | 0 | 1 | 3 | Fertilization animation no longer says nuclei fuse (consistent with D3.1) |
| D3.3 Homeostasis | 0 | 0 | 2 | "Thyroxine" spelling matches C2.1 |
| D4.1 Natural selection | 0 | 1 | 3 | Sim note: with no surplus young there is no selection; predation still kills in nature |
| D4.2 Stability and change | 0 | 1 | 4 | DDT plankton row "mostly zooplankton"; climax net production levels off |
| D4.3 Climate change | 0 | 1 | 3 | Corals are foundation, not keystone, species; unverified range-shift count removed |

The official guide names both *Ips typographus* and *Dendroctonus micans* for D4.3.11, so the page's choice is compliant. Leaving SRY out of D3.1 matches the guide.

Study-guide errors noticed by the builders (the site uses the correct version): glutamate decarboxylase makes GABA rather than breaking it down; gamma rays are not particles; the lac repressor binds the operator, not the promoter; the PCT reabsorbs about two-thirds of filtered water and Na⁺, not 80%.

All findings were fixed; every gate was re-run on all 40 topics: astro check 0/0, 776 unit tests, 126 links, 732 browser tests (desktop Chrome, Android Chrome and iPhone Safari, axe in light and dark), and Lighthouse on 46 pages with lowest scores Performance 97, Accessibility 100, Best Practices 100, SEO 100.

Known minor leftovers: on phones, labels in the widest diagrams (e.g. the nephron) are small until the reader scrolls the diagram sideways; the mitosis prophase step still shows the "Nuclear membrane" label at the end of the step after the envelope has faded.
