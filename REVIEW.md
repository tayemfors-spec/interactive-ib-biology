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

## Examiner review log

### B2.1 (example page), 19 Oct 2026
An independent reviewer, acting as a strict IB examiner, read the page text, visuals, quiz, flashcards, simulations and screenshots. The quiz keys, all exam-diagram markers and every 3D label were confirmed correct.

| Severity | Finding | Fix | Re-checked |
|---|---|---|---|
| Critical | "Fire an action potential" showed Na⁺ channels closed while the voltage rose from −50 to +40 mV (states lagged one stage behind) | The run now shows the states of the stage being moved towards; the slider hint explains that it shows rising-phase states | ✓ |
| Major | The flat active-transport line could suggest "a plateau rules out active transport" | Note added in the sim and the text: pumps can also saturate; the inhibitor test is decisive | ✓ |
| Major | Saturation was attributed to channels only | "Channel or carrier proteins" in the text and slider | ✓ |
| Minor ×15 | Wording and precision: "conformational change" added; K⁺ selectivity isn't size alone; bilayer "not covalently bonded"; active-transport definition covers the indirect route; cholesterol –OH wording; membrane area statement; flashcard c2 now covers water; K⁺ channel drawn with 4 subunits; diffusion steps show some molecules moving against the net direction; "bond dipoles cancel"; scale bar relabelled; CAMs drawn spanning the membrane; label 13 moved inside the frame | All applied | ✓ |
