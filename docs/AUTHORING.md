# Authoring a topic page

How to build one topic (e.g. A1.1) so it matches the approved B2.1 example and passes every gate. **Read the B2.1 files first**; they're the reference implementation:

- `src/content/topics/b2-1/*`
- `src/scenes/b2-1-*.ts`
- `src/anims/b2-1-*`
- `src/sims/b2-1-*`
- `src/diagrams/b2-1-*`

## 1. Files you create (topic id = code in lower case with a hyphen, e.g. `a1-1`)

| File | What it holds |
|---|---|
| `src/content/topics/<id>/index.mdx` | Frontmatter (description, related, mustKnow, mistakes) and the page body |
| `src/content/topics/<id>/visuals.yaml` | Every visual: ids, titles, alt, description, 3D labels, step captions |
| `src/content/topics/<id>/quiz.yaml` | Exactly 10 MCQs (ids q1–q10), options a–d, a `why` for every option |
| `src/content/topics/<id>/flashcards.yaml` | 14–18 cards (ids c1…) |
| `src/content/topics/<id>/facts.yaml` | Every checkable claim, with confidence and basis (not published) |
| `src/scenes/<id>-<name>.ts` | Three.js scene modules (default export `SceneModule`) |
| `src/diagrams/<id>-<name>.astro` | Static SVG diagrams. **Each 3D viewer needs one named after its first scene module**, used as the exam-diagram view and first paint |
| `src/anims/<id>-<name>.astro` + `.ts` | 2D step animations (SVG plus a driver exporting `create(svg)`) |
| `src/sims/<id>-<name>.astro` (+ `src/sims/models/<id>-<name>.ts`) | Slider simulations; the maths lives in a pure model file |
| `tests/unit/<id>.test.ts` | Unit tests for any sim model you wrote (behaviour that must hold biologically) |

**Do not edit shared files:**
- `src/components/**`, `src/lib/**`, `src/viewer3d/**`, `src/layouts/**`, `src/styles/**`, `src/schemas/**`, `src/pages/**`
- configs, `syllabus.json`, other topics' files, and existing tests

If you need a shared change, put the helper inside your own file, or describe the change in your final report.

## 2. Schemas and build checks

The schemas are in `src/schemas/index.ts`; the cross-file checks in `src/lib/integrity.ts` run during `astro build`. The build fails if any of these happen:

- A syllabus understanding isn't covered by exactly one `<Section covers="…">`.
- An AHL understanding sits in a non-AHL section, or an AHL section covers SL content.
- A quiz question's `level` doesn't match its `understanding`'s level.
- In an AHL-only topic, a quiz question or card isn't AHL.
- A visual used in MDX isn't in `visuals.yaml`.
- A high-priority topic has no `viewer3d` or `anim` visual.
- A link starts with `/` (use `<TopicLink code="…" />` for topic links).

The frontmatter must contain:
- `code`
- `description`: 70–160 characters, written for Google
- `updated: 2026-10-19`
- `related`: topic codes
- `mustKnow`: 8–11 entries of `{term, definition, level}`
- `mistakes`: 8–10 entries of `{wrong, right, level}`

Definitions may use inline `<strong>`, `<sub>` and `<sup>`.

## 3. MDX body

Use only the provided components. Don't use `import`, and don't use `#` or `##` headings (`Section` renders the h2; use `###` inside a section).

```mdx
<Section id="bilayer" title="Lipid bilayers form membranes" level="SL" covers="B2.1.1 B2.1.2">
…prose…
<Viewer3D topic="b2-1" id="membrane" />
<Sim topic="b2-1" id="transport-rate" />
<Anim topic="b2-1" id="na-k-pump" />
<Figure name="b2-1-cams" caption="…" />
<Callout type="exam">…</Callout>     <!-- also type="tip" | "note", optional title="…" -->
<TopicLink code="C2.2" />
</Section>
```

- Write `<Section …>` attributes as plain double-quoted strings on **one line**. Order the sections logically, with SL sections before AHL sections where you can.
- Sections should be ~200–400 words each.
- **Bold** each key term the first time it appears.
- Use short paragraphs, lists and markdown tables.
- Include at least 3 `Callout type="exam"` tips.
- Every **named example** and **required skill** for the topic in `syllabus.json` must appear on the page. When the guide asks for a drawing or sketch, give an exam-style diagram (a `Figure`, or the viewer's exam-diagram view) plus a "must include" Callout.
- Use British/IB spelling (haemoglobin, oestradiol; IB uses -ization, e.g. "specialization").
- Write everything in your own words. Never copy the IB guide, the study guide or past papers.

## 4. visuals.yaml

Kinds (see B2.1 for full examples):

- **`viewer3d`**: `id, title, alt (≤160), description (≥120), scenes: [{id, module, title, labels: [{id, name, text (15–260 chars), level}], steps: [{id, title, caption, level}]}]`
  - **One viewer per page.** If you need several models, use several `scenes` in that viewer (a scene switcher).
  - `module` must match `src/scenes/<module>.ts`. Each label `id` must be an anchor key in that scene.
  - A scene with `steps` must implement `render(index, t)` and `durations` (one per step).
- **`anim`**: `id, module, title, alt, description, steps (≥2)`. Needs `src/anims/<module>.astro` (SVG) and `.ts` (driver).
- **`sim`**: `id, module, title, alt, description`. Needs `src/sims/<module>.astro`.
- Add `level: AHL` on any visual that belongs only to AHL content.

All reader-facing text (label names and texts, step captions) lives in YAML so it can be reviewed. Scenes and drivers hold geometry and motion only.

## 5. Writing a 3D scene (`src/scenes/<id>-<name>.ts`)

```ts
import * as THREE from 'three';
import type { SceneModule } from '../viewer3d/types';
import { anchorAt, blobGeometry, rng, setInstance } from '../viewer3d/kit';
const scene: SceneModule = {
  camera: { position: [x, y, z], target: [0, 0, 0], fov: 38, minDistance: 5, maxDistance: 40 },
  build(ctx) {
    const root = new THREE.Group(); ctx.scene.add(root);
    const m = ctx.material('protein');           // colour follows the theme
    const geo = ctx.track(new THREE.SphereGeometry(1, 24, 16)); // tracked → disposed
    // …build meshes…
    return {
      anchors: { 'label-id': { object: anchorAt(root, x, y, z, 'label-id'), highlight: [meshOrGroup] } },
      // optional for processes:
      durations: [4, 5],
      render(index, t) { /* draw the COMPLETE state of step `index` at progress t ∈ [0,1] */ },
      // optional ambient motion, only when the reader turns it on:
      idle(dt) {},
      dispose() { root.removeFromParent(); },
    };
  },
};
export default scene;
```

- Palette keys for `ctx.material(key)`: `head, tail, protein, protein2, carb, chol, na, k, water, glucose, neutral, text`. Never hard-code colours. Reuse keys by meaning: water → `water`, oxygen/neutral atoms → `neutral`, sugars → `carb` or `glucose`, and so on. For atoms in molecular models a sensible mapping is: O → `k` (red), H → `neutral`, C → `text` (dark), N → `protein`, P → `head`.
- `render(index, t)` must be **absolute**: it can't rely on earlier frames, because readers step backwards and seek. Use `ease`, `phase` and `lerp` from `src/lib/timeline.ts`.
- Use InstancedMesh for anything repeated, and set `mesh.count` to the number actually used (unused instances draw at the origin). Keep under ~150k triangles.
- Anchors go on visible surfaces facing the camera, spread out so labels don't pile up. Keep to about 14 labels per scene or fewer. The runtime nudges overlapping chips, and on phones shows numbered markers with a key.
- Frame the camera so the whole model fits a 4:3 stage. The runtime steps back automatically for square phone stages.
- Proportions may be schematic, but **topology must be right**: what's inside or outside, which face, connectivity, counts that matter (e.g. 2 vs 3 H-bonds, a double membrane, the number of subunits), and direction (5′→3′, antiparallel).

## 6. Writing a 2D animation

- **The `.astro` file** holds an SVG drawn in its **step-1 start state**, so the page makes sense without JS. Elements the driver moves carry a `data-el="…"` attribute, and moving groups get an initial `transform`.
  - Use colours via CSS variables (`var(--bio-*)`, `var(--text)`, `var(--surface)`) in a scoped `<style>`.
  - Text should be at least 12–13 px in a ~520 px-wide viewBox.
- **The `.ts` driver** exports `create(svg)`, returning `{ render(index, t), durations }`, and calls `render(0, 0)` at the end. As for scenes, `render` must be absolute.

## 7. Writing a simulation

- Put the maths in a pure model file `src/sims/models/<id>-<name>.ts`, and unit-test it in `tests/unit/<id>.test.ts` for the biological behaviour that must hold. Examples: rate peaks at the optimum; Hardy–Weinberg sums to 1; logistic growth tends to K.
- `src/sims/<id>-<name>.astro`:
  - The server renders the default state, including the SVG graph via `src/sims/chart.ts` (`linePath`, `sx`, `sy`, `range`).
  - A `<script>` hydrates it: query by data attributes, `input` listeners, and a debounced `aria-live` summary sentence.
  - Use native `<input type="range">` inside a `<label>` with an `<output>`.
  - Add a "Show data table" `<details>` where there's a graph.
  - Use dashes as well as colour to tell series apart.
- Make the layout responsive with a **container query** on the sim's root element (not a viewport media query).
- If the model is simplified, say "qualitative model" on screen.
- Respect reduced motion with `prefersReducedMotion()` from `src/lib/prefs.ts`, and never autoplay.

## 8. Accessibility checklist (axe runs on every page in both themes)

- Every button has a visible text name, or a name that contains its visible text.
- Interactive targets are at least 24 px.
- Text contrast is at least 4.5:1; only use the theme tokens.
- SVGs that carry meaning have `role="img"` and `<title>`/`<desc>`; decorative ones are `aria-hidden="true"`.
- Inputs have labels. Don't use positive `tabindex`.

## 9. Self-test

- **Quiz:** exactly 10 questions.
  - Each targets one specific `understanding`, with `level` matching it.
  - SL+AHL topics: at least 3 AHL questions, roughly in proportion. SL-only topics: all SL. AHL-only topics: all AHL.
  - Exactly one defensible answer; distractors based on real misconceptions; no "all/none of the above".
  - Spread the answer letters (no letter more than 3 times).
  - Include data or experiment-reasoning questions where the topic allows.
- **Flashcards:** 14–18 cards. AHL-only topics: every card AHL.

## 10. Accuracy workflow

1. Read the topic's `syllabus.json` entry. Then read the official-guide extract (scope, required examples) and the study-guide page images, both listed in your brief. They're for checking only: never copy their wording.
2. Write to textbook standard (Campbell/Alberts level, at IB depth). Use precise IB terms ("net movement", "partially permeable", "conformational change", "down/against the concentration gradient", "complementary base pairing", etc.).
3. Record every number, named example and direction in `facts.yaml`. Use `status: open` for anything a teacher should confirm.
4. Re-read the page as a strict IB examiner before finishing.

## 11. Checking your work

In your worktree:

```bash
npm install --prefer-offline --no-audit --no-fund   # once: a local node_modules (do NOT symlink the main one;
                                                    # Astro and Vitest caches inside it would leak between worktrees)
export PATH="$HOME/.local/node/bin:$PATH"
npx astro check            # 0 errors, 0 warnings
npm run build              # must succeed (runs the integrity checks)
npx vitest run             # all unit tests, including scenes.test.ts (labels ↔ anchors)
PORT=<your port> npx playwright test --project=desktop-chrome -g "<id-slug>"   # your page: crawl, 3D, interactives, axe
PORT=<your port> npx playwright test --project=mobile-safari -g "<id-slug>"
```

Playwright starts its own server (`scripts/serve.mjs`) on `PORT`, so use the port in your brief to avoid clashing with other builders. Fix every failure before you finish.
