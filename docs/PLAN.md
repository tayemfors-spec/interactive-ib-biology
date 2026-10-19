# Interactive IB Biology — build plan

## Context
You want an interactive revision site for IB Diploma Biology (2025 guide, first assessment 2025, topics A1.1–D4.3) for your HL class. It should have 3D models, animations and simulations for the hard-to-picture topics, self-tests, and pages that Google can find. You asked for a staged build that puts accuracy first. The steps are: syllabus first, then this plan, then one example page (B2.1) for your approval, then Themes A–D, with an examiner-style accuracy pass after each theme and a git commit after each stage.

**What I found**
- This session's folder was empty: no existing site and no guide PDF. Node.js isn't installed. git, Chrome and Xcode (iOS Simulator) are.
- **Official guide:** a full copy of the official *Biology guide, first assessment 2025* (May 2023 update, 133 pages, searchable text) turned up on a school website. My cross-check read it, and a copy is now saved in this session's working files. I'll use it as the **primary reference** for `syllabus.json`, paraphrased and never copied. Better still: get your teacher's current copy from the IB Programme Resource Centre and put it in the project folder. I'll then treat that copy as the single source of truth and re-check against it.
- **Allott study guide:** with your permission, *Allott, Oxford IB Biology Study Guide (2023)* from `~/Documents/everything` is a **second cross-check** for facts and SL/AHL boundaries. I never copy its text, IB text or past-paper questions.

**Your decisions**
- Project folder: `~/Documents/interactive-ib-biology`
- Node.js: you install the official LTS `.pkg` from nodejs.org
- Host: **GitHub Pages**

**Approving this plan confirms the topic list in §1.** The detailed key understandings, written in my own words, go into `syllabus.json` in Stage 1. You can review them alongside the B2.1 example page.

---

## 1. Syllabus: 40 topics (please confirm)

Codes, titles and SL/AHL splits come from the official guide; IB spelling is kept. "AHL n–m" means understandings n to m are HL-only.

**Corrections to my first draft:**
- **B2.3** has AHL content (understandings 7–10).
- **B4.2** is SL only. Fundamental/realized niche and competitive exclusion are SL.
- **C3.1** AHL covers only the plant part (17–23). Heart-rate control, ventilation control and peristalsis are SL.

Priority: **H** = 3D model or animated process (hard to picture or happens over time), **M** = 2D interactive or simulation, **L** = light interactives (data and charts).

### Theme A — Unity and diversity
| Code | Title | Level | Pri | Why |
|---|---|---|---|---|
| A1.1 | Water | SL + AHL 7–8 | H | Polarity and the hydrogen-bond network only make sense in 3D |
| A1.2 | Nucleic acids | SL + AHL 11–15 | H | Double helix, antiparallel strands, base pairing, nucleosome |
| A2.1 | Origins of cells | AHL only | M | Miller–Urey and vesicle self-assembly animate well; mostly conceptual |
| A2.2 | Cell structure | SL + AHL 12–14 | H | Organelles in 3D across cell types; endosymbiosis over time |
| A2.3 | Viruses | AHL only | H | Lytic vs lysogenic cycles are step processes (λ phage) |
| A3.1 | Diversity of organisms | SL + AHL 12–15 | L | Conceptual; karyogram and key tools are enough |
| A3.2 | Classification and cladistics | AHL only | M | Reading cladogram topology is easier when you can manipulate it |
| A4.1 | Evolution and speciation | SL + AHL 8–11 | M | Speciation over time; homologous limbs |
| A4.2 | Conservation of biodiversity | SL only | L | Case studies and data |

### Theme B — Form and function
| Code | Title | Level | Pri | Why |
|---|---|---|---|---|
| B1.1 | Carbohydrates and lipids | SL only | M | α/β glucose, cellulose vs starch, fatty-acid kinks in 3D |
| B1.2 | Proteins | SL + AHL 6–12 | H | The four levels of structure are spatial |
| B2.1 | Membranes and membrane transport | SL + AHL 11–17 | H | Fluid mosaic in 3D plus transport processes |
| B2.2 | Organelles and compartmentalization | SL + AHL 4–9 | H | Mitochondrion, chloroplast, nucleus, ER→Golgi→vesicle traffic |
| B2.3 | Cell specialization | SL + AHL 7–10 | M | SA:V is a variable relationship; cell adaptations |
| B3.1 | Gas exchange | SL + AHL 11–13 | H | Alveolus in 3D, ventilation, O₂ dissociation curve and Bohr shift |
| B3.2 | Transport | SL + AHL 11–18 | H | Heart and cardiac cycle (AHL), transpiration, tissue fluid |
| B3.3 | Muscle and motility | AHL only | H | Sliding filaments in a sarcomere over time |
| B4.1 | Adaptation to environment | SL only | L | Biome and tolerance graphs |
| B4.2 | Ecological niches | SL only | M | Niche and competitive-exclusion simulation |

### Theme C — Interaction and interdependence
| Code | Title | Level | Pri | Why |
|---|---|---|---|---|
| C1.1 | Enzymes and metabolism | SL + AHL 11–17 | H | Rate vs temperature, pH and [S]; inhibition types |
| C1.2 | Cell respiration | SL + AHL 7–17 | H | Stages located in a 3D mitochondrion; chemiosmosis |
| C1.3 | Photosynthesis | SL + AHL 9–19 | H | Light-dependent reactions, Calvin cycle, limiting factors |
| C2.1 | Chemical signalling | AHL only | H | Signal-transduction pathways are step processes |
| C2.2 | Neural signalling | SL + AHL 8–16 | H | Neuron and synapse in 3D; action potential over time |
| C3.1 | Integration of body systems | SL + AHL 17–23 | M | Reflex arc, feedback loops, phototropism |
| C3.2 | Defence against disease | SL only | H | Immune response is a multi-step process |
| C4.1 | Populations and communities | SL only | H | Population-growth and sampling simulations |
| C4.2 | Transfers of energy and matter | SL only | H | Energy pyramids and the carbon cycle |

### Theme D — Continuity and change
| Code | Title | Level | Pri | Why |
|---|---|---|---|---|
| D1.1 | DNA replication | SL + AHL 6–9 | H | Replication fork over time; PCR and gels |
| D1.2 | Protein synthesis | SL + AHL 12–19 | H | Transcription and translation over time |
| D1.3 | Mutation and gene editing | SL + AHL 8–10 | M | Sequence editor shows each mutation's effect; CRISPR |
| D2.1 | Cell and nuclear division | SL + AHL 12–17 | H | Mitosis and meiosis are processes over time |
| D2.2 | Gene expression | AHL only | M | Toggles for chromatin and methylation |
| D2.3 | Water potential | SL + AHL 8–11 | H | ψ = ψs + ψp relationships |
| D3.1 | Reproduction | SL + AHL 13–20 | M | Menstrual-cycle hormone timeline; anatomy |
| D3.2 | Inheritance | SL + AHL 16–21 | M | Punnett, pedigree and chi-squared tools |
| D3.3 | Homeostasis | SL + AHL 7–11 | H | Nephron in 3D (AHL); feedback-loop simulations |
| D4.1 | Natural selection | SL + AHL 9–15 | H | Selection and Hardy–Weinberg simulations |
| D4.2 | Stability and change | SL + AHL 12–15 | M | Succession timeline; eutrophication; biomagnification |
| D4.3 | Climate change | SL + AHL 9–12 | L | Feedback loops; phenology-mismatch simulation |

**Totals:** 24 high, 12 medium, 4 low. Six topics are AHL only (A2.1, A2.3, A3.2, B3.3, C2.1, D2.2), and seven are SL only (A4.2, B1.1, B4.1, B4.2, C3.2, C4.1, C4.2).

Named examples the guide expects (e.g. ringed seal and black-throated loon, λ phage, Hinewai Reserve, *Vibrio fischeri*) are recorded per topic in `syllabus.json` and must appear on the pages.

---
## 2. Interactive elements per topic
Legend: **3D** = Three.js model you can rotate and zoom, with clickable labels. **Anim** = step-through process with play, pause, step and speed controls. **Sim** = slider-driven model with a live graph. Items marked (AHL) sit inside AHL-badged sections. Every topic also gets 5–10 MCQs and 12–20 flashcards.

**Theme A**
- **A1.1:**
  - 3D water molecules showing δ+/δ− and a live hydrogen-bond network, with a liquid ↔ ice lattice toggle
  - Anim: cohesion and adhesion (capillary rise, surface tension), and hydration shells around Na⁺/Cl⁻ and glucose
  - Sim: property comparison of water vs methane, with buoyancy, viscosity, thermal conductivity and specific heat applied to the ringed seal and black-throated loon
  - (AHL) Earth's water origin explainer
- **A1.2:**
  - 3D DNA double helix: sugar–phosphate backbone, A–T with 2 H-bonds, G–C with 3, 5′→3′ labels, major/minor groove
  - 3D DNA vs RNA comparison
  - Nucleotide builder (drag and drop)
  - (AHL) 3D nucleosome (DNA wound round a histone octamer, linker DNA, H1)
  - (AHL) Anim: Hershey–Chase experiment
  - (AHL) Chargaff data explorer
- **A2.1 (AHL):**
  - Anim: Miller–Urey apparatus
  - Anim: fatty acids self-assembling into bilayer vesicles
  - Early-Earth / LUCA timeline slider
- **A2.2:**
  - 3D explorable prokaryote, animal, plant and fungal cells, with a compare mode
  - Sim: magnification and scale-bar calculator
  - Light vs electron micrograph identification quiz
  - (AHL) Anim: endosymbiosis
  - (AHL) multicellularity explainer
- **A2.3 (AHL):**
  - 3D λ phage and an enveloped virus
  - Anim: lytic vs lysogenic cycle with a branch toggle
  - Sim: rapid viral evolution (mutation rate × generations)
- **A3.1:**
  - Karyogram sorter (drag chromosomes into pairs; spot trisomy or sex)
  - Genome-size comparison chart
  - (AHL) dichotomous-key builder
  - (AHL) eDNA barcoding explainer
- **A3.2 (AHL):**
  - Interactive cladogram: rotate nodes to show equivalent trees, click to highlight clades
  - Molecular-clock calculator
  - Three-domains explorer
- **A4.1:**
  - Pentadactyl limb comparator, with bones colour-matched across species
  - Anim: allopatric vs sympatric speciation
  - (AHL) Anim: adaptive radiation
  - (AHL) Anim: polyploidy and hybrid sterility (mule)
- **A4.2:**
  - Biodiversity-crisis data charts
  - EDGE-score explorer
  - Cause → effect cards for ecosystem loss

**Theme B**
- **B1.1:**
  - 3D α vs β glucose, starch / glycogen / cellulose chains, triglyceride, phospholipid
  - Anim: condensation and hydrolysis
  - Saturated vs cis-unsaturated fatty-acid comparison
- **B1.2:**
  - 3D amino-acid structure and R-group explorer
  - 3D levels of structure: primary → α-helix / β-sheet → tertiary, with bond-type toggles (H-bond, ionic, disulfide, hydrophobic) → quaternary (haemoglobin with haem; collagen; insulin)
  - Sim: denaturation as temperature and pH unfold the model
- **B2.1:** the example page; full spec in §4.
- **B2.2:**
  - 3D nucleus (double membrane, pores)
  - (AHL) 3D mitochondrion, 3D chloroplast and 3D rough ER, with each adaptation labelled
  - (AHL) Anim: secretory pathway (ribosome → RER → Golgi → vesicle → exocytosis), including clathrin-coated vesicles
- **B2.3:**
  - Sim: SA:V cube-size slider with a live SA:V graph
  - Stem-cell potency tree
  - (AHL) cards on type I/II pneumocytes, cardiac vs striated muscle, and sperm/egg adaptations
- **B3.1:**
  - 3D alveolus with capillary bed and type I/II pneumocytes; Anim: diffusion
  - Anim: ventilation (diaphragm and intercostals, pressure/volume changes) synced to a spirometer trace
  - Leaf cross-section explorer
  - Sim: stomatal density
  - (AHL) Sim: O₂ dissociation curve with pO₂ and CO₂ sliders (Bohr shift), adult vs foetal Hb
- **B3.2:**
  - Artery / vein / capillary cross-sections
  - Anim: transpiration and cohesion–tension
  - Stem and root transverse sections
  - (AHL) 3D heart: chambers, valves, vessels
  - (AHL) Anim: cardiac cycle synced to a pressure graph (atrial, ventricular, aortic) with valve open/close markers
  - (AHL) Sim: tissue-fluid formation along a capillary
  - (AHL) Anim: phloem translocation and root pressure
- **B3.3 (AHL):**
  - 3D sarcomere (actin, myosin, titin, Z-lines; the bands change as it contracts)
  - Anim: cross-bridge cycle (Ca²⁺, troponin/tropomyosin, ATP)
  - Synovial-joint and antagonistic-muscles diagram
  - Motor-unit diagram
- **B4.1:**
  - Sim: biome explorer (temperature × precipitation)
  - Sim: range-of-tolerance curve
  - Coral-reef condition checker
- **B4.2:**
  - Nutrition-mode classifier
  - Sim: fundamental vs realized niche
  - Sim: competitive exclusion (Gause-style) with sliders
  - Dentition-vs-diet comparator

**Theme C**
- **C1.1:**
  - Sim: enzyme activity with temperature, pH and [S] sliders, live rate graph and a particle view of collisions and denaturation
  - Activation-energy diagram
  - (AHL) Sim: competitive vs non-competitive inhibition
  - (AHL) Anim: feedback inhibition (threonine → isoleucine)
  - (AHL) mechanism-based inhibition (penicillin)
- **C1.2:**
  - Respirometer simulation
  - ATP/ADP energy explainer
  - (AHL) 3D mitochondrion with each stage located on it
  - (AHL) Anim: glycolysis → link reaction → Krebs → ETC and chemiosmosis (ATP synthase rotating), with a running ATP/NADH/FADH₂ ledger
  - (AHL) anaerobic pathways in humans and yeast
- **C1.3:**
  - Chromatography Rf calculator
  - Absorption vs action spectrum interactive
  - Sim: limiting factors (light, CO₂, temperature)
  - (AHL) 3D chloroplast / thylakoid
  - (AHL) Anim: PSII → photolysis → ETC → PSI → NADP reduction and ATP synthase
  - (AHL) Anim: Calvin cycle (RuBisCO, TP, RuBP regeneration)
- **C2.1 (AHL):**
  - Anim: quorum sensing (*V. fischeri*), driven by a cell-density slider
  - Anim: GPCR (adrenaline → G protein → cAMP)
  - Anim: tyrosine-kinase receptor (insulin)
  - Anim: intracellular steroid receptor → gene expression
  - Feedback-loop explorer
- **C2.2:**
  - 3D neuron (dendrites, soma, axon, myelin, nodes)
  - Anim: action potential along the axon with ion channels, synced to the membrane-potential trace
  - 3D synapse (vesicles, Ca²⁺, ACh, receptors, AChE)
  - (AHL) Anim: saltatory vs continuous conduction race
  - (AHL) Sim: EPSP/IPSP summation
  - (AHL) exogenous-chemicals toggles (neonicotinoids, cocaine)
- **C3.1:**
  - Anim: pain reflex arc
  - Hypothalamus–pituitary map
  - Sim: heart-rate and ventilation feedback (baroreceptors and chemoreceptors)
  - (AHL) Anim: phototropism and auxin redistribution
  - (AHL) auxin–cytokinin balance explorer
  - (AHL) ethylene positive-feedback explainer
- **C3.2:**
  - Anim: immune response (phagocytosis → helper T → B-cell activation → plasma and memory cells), with an antibody-titre graph for primary vs secondary response
  - Anim: blood clotting
  - Sim: herd immunity (vaccination %)
  - Sim: antibiotic resistance
  - COVID-19 data explorer
- **C4.1:**
  - Sim: logistic growth (r, K; exponential vs sigmoid)
  - Sim: virtual quadrat sampling
  - Sim: capture–mark–recapture (Lincoln index)
  - Sim: predator–prey cycles
  - Chi-squared association calculator
- **C4.2:**
  - Sim: energy pyramid with transfer % and heat-loss slider
  - Food-web builder
  - Clickable carbon-cycle diagram
  - Keeling-curve data viewer

**Theme D**
- **D1.1:**
  - Anim: replication fork (helicase, DNA polymerase, semi-conservative pairing)
  - Sim: PCR cycle (temperature steps, copy count)
  - Sim: gel electrophoresis
  - (AHL) leading vs lagging strand with Okazaki fragments, primase, Pol III, Pol I, ligase and proofreading
- **D1.2:**
  - Anim: transcription
  - Anim: translation, with a 3D ribosome (A/P/E sites, tRNA anticodons)
  - Interactive codon table: type an mRNA, get the polypeptide
  - Sickle-cell mutation demo
  - (AHL) Anim: splicing and alternative splicing
  - (AHL) pre-proinsulin → insulin
  - (AHL) proteasome
- **D1.3:**
  - Sequence editor: make substitutions, insertions and deletions and see silent, missense, nonsense or frameshift effects
  - (AHL) Anim: CRISPR-Cas9
  - (AHL) gene-knockout explainer
- **D2.1:**
  - Anim: mitosis (with a chromosome / chromatid counter)
  - Anim: meiosis I/II (crossing over, independent assortment, non-disjunction toggle)
  - Identify-the-phase quiz
  - (AHL) cell-cycle wheel with cyclins
  - (AHL) mitotic-index counter on a virtual micrograph
- **D2.2 (AHL):**
  - Chromatin / methylation / acetylation toggles that change the transcription rate
  - Genome vs transcriptome vs proteome explainer
  - Twin-studies data
- **D2.3:**
  - Animal-cell and plant-cell tonicity animations
  - Sim: potato-cylinder experiment with a graph to find the isotonic point
  - (AHL) Sim: ψ = ψs + ψp for a cell and its solution, with arrows for water movement
- **D3.1:**
  - Labelled reproductive anatomy
  - Sim: menstrual-cycle hormone timeline (FSH, LH, oestradiol, progesterone) with a day slider showing ovary and uterus states
  - Flower-structure explorer
  - (AHL) gametogenesis
  - (AHL) Anim: fertilization and polyspermy block
  - (AHL) hCG pregnancy test
- **D3.2:**
  - Punnett-square generator (codominance, multiple alleles / ABO, sex linkage)
  - Pedigree analyser
  - (AHL) dihybrid crosses, linkage and recombinants
  - (AHL) chi-squared calculator
- **D3.3:**
  - Sim: blood-glucose feedback (meal and exercise buttons; insulin and glucagon)
  - Sim: thermoregulation
  - (AHL) 3D nephron with its blood supply
  - (AHL) Anim: filtrate path (ultrafiltration, PCT reabsorption, loop of Henle, ADH and aquaporins)
- **D4.1:**
  - Sim: natural selection on a varied population
  - Guppy model (sexual vs predation selection)
  - (AHL) Sim: Hardy–Weinberg calculator and allele-frequency simulator (selection strength, population size)
  - (AHL) directional / stabilizing / disruptive selection demo
- **D4.2:**
  - Keystone-removal food-web sim
  - Anim: eutrophication
  - Biomagnification chart (DDT, mercury)
  - Mesocosm model
  - (AHL) Anim: primary succession and cyclical succession
- **D4.3:**
  - Greenhouse and positive-feedback loop explorer
  - Range-shift map
  - (AHL) Sim: phenology mismatch (great tit vs caterpillar peak)

Caps: at most 2–3 WebGL viewers per page; other processes use SVG or canvas so phones stay fast.

**Exam drawings:** wherever the guide expects a drawing or sketch, the page has an **"Exam diagram" 2D view**: a clean annotated SVG with a "must include" checklist. These are:
- A1.2: nucleotide; antiparallel DNA with A–T and G–C; ribose vs deoxyribose
- A2.2: organelles from electron micrographs
- B1.2: amino acid; dipeptide condensation
- B2.1: fluid mosaic model
- B3.1: leaf tissue plan
- B3.2: stem and root plans
- C1.1: sketch graphs
- D3.1: reproductive systems; insect-pollinated flower

## 3. Page template (every topic)
1. **Header bar** (site-wide):
   - Logo
   - Search (Pagefind)
   - **SL / SL+AHL view filter**, so SL classmates can hide AHL sections
   - Light / dark / system theme
   - Reduced-motion toggle
   - Menu button on mobile
2. **Sidebar:** Themes A–D → levels 1–4 → topics. Each topic has a progress tick, the current topic is highlighted, and on phones the sidebar becomes a drawer.
3. **Topic header:**
   - Breadcrumb: Theme › Level › Topic
   - H1 `B2.1 Membranes and membrane transport`
   - SL / AHL badges
   - "Big questions" (my own wording)
   - "On this page" jump links
4. **Sections:** each one is a visual (3D, Anim or Sim), then a text description, then the explanation with **bold key terms**. AHL sections sit in a visually distinct box with an "AHL" badge and a matching `data-level` attribute (this drives the filter).
5. **Must-know definitions** box and **Common exam mistakes** box.
6. **Self-test:**
   - MCQ quiz (5–10 questions, instant feedback, an explanation for every option)
   - Flashcards (flip, "knew it" / "again")
   - Score and progress saved in localStorage
7. **Links:** related-topic links (for example B2.1 ↔ C2.2, D2.3, D3.3), then previous/next topic.
8. **Footer:** disclaimer ("Not affiliated with or endorsed by the International Baccalaureate Organization"), credits and licences, and "Report an error" (a mailto link or GitHub issue link, your choice later).

## 4. Example page spec: B2.1 Membranes and membrane transport
- **3D: fluid mosaic membrane patch** (instanced, so it runs fast on phones). It shows:
  - Phospholipids with hydrophilic heads and hydrophobic tails, some tails kinked (cis-unsaturated)
  - Cholesterol with its –OH beside the heads
  - Integral proteins: a channel with a visible pore, an aquaporin, a pump and a cotransporter
  - Peripheral proteins on the surface only
  - Glycoproteins and glycolipids on the **extracellular face only**
  - Scale marker (≈7–10 nm); lipids drift laterally
  - Every structure is a clickable label that opens an info panel
  - An **"Exam diagram" toggle** swaps to the 2D drawing the guide asks for: integral and peripheral proteins, glycoprotein, phospholipids, cholesterol, and the hydrophilic and hydrophobic regions marked
- **Anim (3D): transport modes**, in tabs:
  - Simple diffusion of O₂ and CO₂ through the bilayer
  - Osmosis through aquaporins
  - Facilitated diffusion through a K⁺ channel
  - Active transport by a pump using ATP
  - Each tab has gradient indicators, play/pause/step/speed, and step captions in a live region
- **Sim: rate of transport vs concentration difference.** It plots simple diffusion as a straight line, facilitated diffusion levelling off (with a slider for the number of channel proteins), and active transport as limited by ATP supply (with an O₂ / respiratory-inhibitor toggle). It's labelled a qualitative model, and its formulas are unit-tested.
- **Sim: permeability tester.** Pick O₂, CO₂, H₂O, glucose, Na⁺, a steroid or a protein, and see which route it uses or whether it's blocked, with the reason (size, polarity, charge).
- **AHL:**
  - Sim: membrane fluidity (temperature, % unsaturated fatty acids, cholesterol), which shows cholesterol's two-way buffering, with an example of a habitat adaptation
  - Anim: Na⁺/K⁺ pump cycle (3 Na⁺ out, 2 K⁺ in, 1 ATP, phosphorylation and shape change), with counters
  - Anim: sodium–glucose cotransporter in the small intestine and PCT, linked to the pump on the other side of the cell
  - Interactive gated channels: an ACh button opens the nicotinic receptor; a voltage slider opens and closes the voltage-gated Na⁺ and K⁺ channels
  - Anim: endocytosis and exocytosis
  - CAM diagram
- **Boxes:** about 8 must-know definitions (diffusion, osmosis, facilitated diffusion, active transport, amphipathic, integral and peripheral protein, fluid mosaic). About 8 exam mistakes, for example "water moves from high to low water concentration" as the only explanation, "phospholipids are hydrophobic", glycoproteins drawn on both faces, getting the Na⁺/K⁺ ratio backwards, and "channels pump ions".
- **Self-test:** 10 MCQs (at least 4 AHL) and about 16 flashcards.

## 5. Accuracy process
- **Per topic:**
  - Draft from the `syllabus.json` understandings
  - Fill in a **fact checklist** (`content/checklists/<code>.md`): every understanding covered; every number with a source; every 3D label checked against a screenshot
  - Cross-check against the official guide and the Allott study guide
  - Log anything uncertain in **REVIEW.md** (topic, claim, why I'm unsure, what I chose, status)
- **After each theme:** a separate **strict IB examiner pass** by independent reviewer agents. They read the rendered page text, the label manifests and the screenshots, looking for wrong labels, wrong numbers, mark-losing oversimplifications, SL/AHL mislabels and missing understandings. Fixes are logged in REVIEW.md, then I commit.
- **Originality:** all text, questions and models are original. 3D models are procedural, so no external model licences are needed; any CC0 or CC-BY asset would be credited on the page.

## 6. Tech stack and architecture
- **Astro** (latest stable, static output) with **MDX** topic pages and TypeScript. Each topic is built to plain HTML, which is good for Google, and ships almost no JS until an interactive is used.
- **Three.js** via dynamic `import()` inside one shared `Viewer3D` island, so it's never in the initial bundle. **SVG / canvas + vanilla TS** for 2D animations and simulations.
- **Pagefind** (static search index built after `astro build`) behind a header search box.
- **@astrojs/sitemap**, a hand-written `robots.txt`, OG/Twitter meta, and JSON-LD (`LearningResource` + `BreadcrumbList` on topics, `WebSite` on home).
- **Hosting:** GitHub Pages via a GitHub Actions workflow. The site URL is `https://<username>.github.io/interactive-ib-biology/`, and every internal link goes through a base-aware `url()` helper so the subpath never breaks.

**Project layout**
```
syllabus.json                 # single source for nav, theme pages, validation
REVIEW.md  SYLLABUS.md  docs/PLAN.md
src/content/topics/<code>.mdx # page content + frontmatter (code, title, description, level, related)
src/content/quizzes/<code>.json  src/content/flashcards/<code>.json
src/content/checklists/<code>.md # per-topic fact checklist (not published)
src/components/  Viewer3D.astro, ProcessControls, Sim.astro, Quiz.astro, Flashcards.astro, AHL.astro,
                 MustKnow.astro, ExamMistakes.astro, ExamDiagram.astro, Sidebar.astro, Search.astro
src/scenes/<code>-<name>.ts    # one Three.js scene module per model
src/sims/<name>/model.ts + view.ts   # pure model (unit-tested) + renderer
src/lib/  three-viewer/ (renderer, controls, labels, timeline), storage.ts, url.ts
tests/   unit (vitest), e2e (playwright crawl, 3D, axe), lighthouserc
```

**Key components**
- **Content schema:** zod schemas validate every topic, quiz and flashcard file. The build **fails** if any of these are true:
  - a `syllabus.json` topic has no page
  - a quiz has fewer than 5 questions, or a question has no explanation
  - an AHL understanding is shown without AHL marking
- **Scene modules:** each is `build(ctx) → { objects, labels[{id, anchorMesh, title, text, level}], steps[{caption, apply(t)}] }`. Labels are HTML overlays anchored to named meshes, so they're focusable and readable by screen readers. A test fails if a label's `anchorMesh` doesn't exist. The viewer handles the rest:
  - OrbitControls; keyboard controls (arrows rotate, +/− zoom, R reset, Tab through labels)
  - render-on-demand, paused when offscreen or the tab is hidden
  - DPR capped at 2, and full disposal when done
  - a static SVG poster plus text description as the no-WebGL fallback
- **Process timeline:** a shared controller for play/pause, step ←/→ and speed (0.25×–2×). Captions go to an `aria-live` region. With reduced motion, playback becomes manual stepping with no auto-rotate.
- **Sims:** pure functions like `rate(temp, pH, S)` and `psi(ψs, ψp)` with Vitest tests against textbook values. Every sim has a text readout and data-table alternative.
- **Storage:** a versioned localStorage key (`ibbio:v1`) holding per-topic quiz best score, flashcard boxes and last visit. It's wrapped in try/catch, so the site still works if storage is blocked. The home page shows progress across all 40 topics.
- **Theme and motion:** a tiny inline script sets `data-theme` before first paint (no flash). There's a reduced-motion toggle, and `prefers-reduced-motion` is respected. All colours are design tokens contrast-checked in both themes.
- **Performance:** viewers load when scrolled near **and** the browser is idle. A lightweight SVG poster is the first paint, and the system font stack means no font downloads. If Lighthouse still shows blocking time, the fallback is a "tap to load 3D" poster on mobile.

## 7. Quality gates and verification
`npm run verify` runs all of these and must pass before every commit:
1. `astro check` + `astro build` with **0 errors and 0 warnings**, including the zod content validation.
2. `vitest` for the simulation models. Examples: an enzyme curve that peaks at the optimum, Hardy–Weinberg p²+2pq+q²=1, Lincoln index, logistic growth that approaches K, ψ = ψs + ψp.
3. **Link check** on `dist/` (internal and external), so there are no broken links.
4. **Playwright crawl of every page** at desktop size, Android Chromium and iPhone WebKit. A run fails on any console error, page error or failed request. It also:
   - scrolls every viewer into view
   - checks the WebGL canvas drew non-blank pixels and every label anchor resolved
   - drives play, step and reduced motion
   - tabs through the controls
5. **axe-core** accessibility scan of every page in light and dark mode, with no serious or critical issues.
6. **Lighthouse CI** on every page with the mobile preset: Performance, Accessibility, Best Practices and SEO all **≥ 90**, which the build asserts.
7. **Real mobile check:** sample 3D scenes in Safari on the iOS Simulator (Xcode is installed), plus a check on your own phone after deploy.
8. **Visual review:** I take screenshots of each 3D scene with labels on and check every label points at the right structure. This is part of the per-topic checklist.

**End-to-end check after deploy:**
- Re-run the crawl and Lighthouse against the live GitHub Pages URL
- Validate JSON-LD with the Rich Results / schema.org validators
- Confirm `sitemap-index.xml` and `robots.txt` resolve
- Confirm Search Console accepts the sitemap

## 8. Work order (each stage ends with a git commit)
| Stage | What happens | Gate |
|---|---|---|
| 0 Setup | You install Node LTS. I create `~/Documents/interactive-ib-biology`, move the session there, run `git init`, and save this plan as `docs/PLAN.md`. I also add a **git-ignored `reference/` folder** for the guide PDF, so copyrighted PDFs never reach the public repo | — |
| 1 Syllabus | `syllabus.json` (40 topics, paraphrased understandings with SL/AHL tags, priority and reason, named examples), `SYLLABUS.md` (a readable table) and REVIEW.md, all checked against the official guide and Allott | You can review it alongside Stage 2 |
| 2 Framework + B2.1 | Scaffold, layout, sidebar, search, themes, Viewer3D, sim kit, quiz engine, SEO, the full test pipeline, and the complete B2.1 page. All quality gates run locally | **STOP: you approve design and quality** (screenshots plus a local preview) |
| 3 Theme A | 9 topic pages, then the examiner pass, fixes and gates | Progress report |
| 4 Theme B | 9 remaining topic pages, then the same | Progress report |
| 5 Theme C | 9 topic pages, then the same | Progress report |
| 6 Theme D | 12 topic pages, then the same | Progress report |
| 7 Polish | Home page and progress dashboard, about/credits, 404, OG image, full Lighthouse on all pages, final link check | — |
| 8 Deploy | I walk you through creating a GitHub account (you sign in and handle all passwords and tokens yourself), creating the repo and pushing (I confirm with you before the first push), and enabling Pages. Then I verify the live site, including Lighthouse on the live URL | You publish |
| 9 Indexing | Google Search Console walkthrough: you sign in, I add the verification meta tag, you submit the sitemap | — |
| Done | Live link plus a short summary of what's on the site | — |

This is a long build, about 40 content-heavy pages. Each theme stage may take several working turns; I'll report at the end of each.

## 9. Risks and how I'll handle them
- **Scope:** 40 pages and around 25 3D/animated scenes. I'll build reusable generators (bilayer, helix, protein blob, organelle shells, label/timeline kit) so each new scene is small. B2.1 proves the kit before anything is scaled up.
- **Scientific errors:** checks against the official guide and Allott, per-topic checklists, an independent examiner pass per theme, and REVIEW.md for anything your teacher should confirm. Simplified models (e.g. the transport-rate sim) are labelled "qualitative model".
- **Three.js on phones:** lazy loading, at most 2–3 viewers per page, DPR cap, an SVG fallback, and tests on Android emulation, WebKit and the iOS Simulator.
- **Lighthouse ≥ 90 on pages with 3D:** poster first, load on idle, and tap-to-load as a fallback.
- **Guide version:** my copy is the May 2023 update. If your teacher's copy differs, I'll reconcile `syllabus.json` against it.
- **Copyright and trademark:** original text only; an "IB" trademark disclaimer in the footer and on the about page; no past-paper questions.

## 10. What I'll need from you
1. **Now:** install Node.js LTS from nodejs.org (the macOS installer), then tell me it's done.
2. **Optional:** put your teacher's copy of the Biology guide PDF in the project folder once it exists.
3. **After Stage 2:** review the B2.1 page and approve it or ask for changes.
4. **Stage 8:** create a GitHub account (I'll walk you through it), sign in, and approve the first push.
5. **Stage 9:** sign in to Google Search Console and submit the sitemap (with my walkthrough).

---

## Addendum: architecture refinements (independent review, 19 Oct 2026)
These replace the matching details above.
- **Versions:** Node **24 LTS** (`.nvmrc` = 24; Node 26 only becomes LTS in late October), Astro 7.x, three 0.186.x, Pagefind 1.5.x, Vitest 5, Playwright 1.64, @axe-core/playwright 4.14, @lhci/cli 0.15, linkinator 8. Pin exact versions with `save-exact=true` and a committed lockfile. No UI framework, no Tailwind, no chart library.
- **One WebGL viewer per page.** When a topic needs more than one model, it gets a **scene switcher** inside that viewer (this avoids iOS context limits). Processes where the lesson is really a graph or sequence (cardiac cycle with pressure curves, action potential with voltage trace, nephron flow) are **2D SVG animations with synced graphs** on the same shared timeline.
- **3D loading is gated:** a prefetch hint when the viewer is visible and the browser is idle; the real load happens once it's visible and the user has interacted (tap "Explore", scroll, key, pointer). The poster and labels are server-rendered, so the no-JS version is already a labelled diagram, and Lighthouse never records three.js.
- **Content layout per topic:** `src/content/topics/<id>/` holding `index.mdx` + `quiz.yaml` + `flashcards.yaml` + `visual.yaml` (label names, definitions and step captions live here, so facts are reviewable as text and indexable) + `facts.yaml` (every checkable claim, with confidence and basis). REVIEW.md is generated partly from the facts files. A `src/lib/integrity.ts` check runs in validation and in `getStaticPaths`.
- **Sims** render their default chart as SVG at build time (a real graph without JS) and hydrate when visible. Models use a seeded RNG, so they're reproducible in tests.
- **Progress:** `ibbio.progress` / `ibbio.prefs`, versioned, with content-hash `rev` per quiz. Export/import on `/progress/`, because Safari can clear storage after 7 days without a visit.
- **SEO:** BreadcrumbList everywhere, WebSite on home, and Education Q&A (flashcards) where valid. LearningResource is kept as valid schema but gives no Google rich result. No FAQ/HowTo/SearchAction. Static OG image per theme.
- **GitHub Pages:** if the name is free, use a **`<username>.github.io` user-site repo**, which serves from the root so robots.txt is honoured. Otherwise use a project repo with a base path, routing all URLs through `withBase()` either way. CI runs the full verify suite before deploy (SwiftShader for WebGL).
- **iOS Simulator** needs an iOS runtime installed (Xcode › Settings › Components) before the Safari check.
- **Accessibility:** axe target is zero violations (WCAG 2.2 AA). The timeline never autoplays. On-screen rotate/zoom buttons mean dragging is never required.
