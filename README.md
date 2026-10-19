# Interactive IB Biology

A free, static revision site for IB Diploma Biology (first assessment 2025). Every topic page has interactive 3D models, step-by-step animations and simulations, explanations with SL and AHL content clearly marked, exam tips, and a self-test that saves progress in the browser.

Built with [Astro](https://astro.build) (static HTML), [three.js](https://threejs.org) (3D, loaded only when a reader opens a model) and [Pagefind](https://pagefind.app) (search). No backend, no accounts, no tracking.

## Working on it

Requires Node 24 (see `.nvmrc`).

```bash
npm install
npm run dev          # live-reloading dev server (search only works on a build)
npm run build        # static site into dist/, plus the search index
npm run serve        # serve dist/ at http://127.0.0.1:4321 (set BASE=/repo-name/ to test a sub-path)
npm run verify       # every quality gate (see below); must pass before each commit
```

## Where things live

| Path | What it is |
|---|---|
| `syllabus.json` | All 40 topics with paraphrased understandings, SL/AHL tags, named examples and visual priority. Drives navigation and build checks. |
| `src/content/topics/<id>/` | One folder per topic: `index.mdx` (page text), `quiz.yaml`, `flashcards.yaml`, `visuals.yaml` (3D labels, animation captions), `facts.yaml` (checkable claims, for review) |
| `src/scenes/` | Three.js scene modules (geometry and label anchors only; all text is in `visuals.yaml`) |
| `src/anims/`, `src/sims/`, `src/diagrams/` | 2D animations, slider simulations (pure models in `src/sims/models/`) and exam-style diagrams |
| `src/lib/integrity.ts` | Build-time checks: every understanding covered, SL/AHL marking correct, all files present |
| `REVIEW.md` | Everything a teacher should double-check |
| `docs/PLAN.md` | The agreed build plan |
| `reference/` | Git-ignored copies of reference PDFs (copyrighted; never committed) |

## Quality gates (`npm run verify`)

1. `astro check` + `astro build` with no errors or warnings (content schemas and integrity checks run here).
2. Vitest unit tests: simulation models, timeline, syllabus structure, and every 3D scene's label anchors.
3. Link check of the built site.
4. Playwright in Chrome (desktop and Pixel 7 emulation): every page loads with no console errors; every 3D scene renders and every label resolves; every animation step and slider works; quiz progress persists; the site works with storage blocked; reduced motion; SL filter; search; axe accessibility scans (WCAG 2.2 AA) in light and dark mode.
5. Lighthouse CI on every page (mobile): Performance, Accessibility, Best Practices and SEO all ≥ 90.

## Content rules

- All text is written in our own words. Never copy the IB guide, textbooks or past-paper questions.
- British/IB spelling. Key terms in **bold**. AHL content only inside `level="AHL"` sections.
- Any uncertain claim goes in the topic's `facts.yaml` and, if a teacher should check it, in `REVIEW.md`.

International Baccalaureate® and IB® are registered trademarks of the International Baccalaureate Organization. This site is not affiliated with or endorsed by the IBO.
