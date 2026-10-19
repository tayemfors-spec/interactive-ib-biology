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
