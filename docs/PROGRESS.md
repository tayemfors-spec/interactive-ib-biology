# Progress log and checkpoint

Updated by Claude during the build. If a session is interrupted, resume from **Next steps**.

## Status (19 Oct 2026, overnight run started)

| Stage | Status |
|---|---|
| 0 Setup, 1 Syllabus, 2 Framework + B2.1 | Done (committed) |
| 3 Theme A (9 topics) | Done: merged, examiner-reviewed, fixed, all gates green (commit `afe7580`) |
| 4 Theme B (9 remaining topics) | Done: merged, reviewed, fixed, all gates green |
| 5 Theme C (9 topics) | All 9 built on branches; merge and review next |
| 6 Theme D | Wave 1 (D1.1–D2.3) building; wave 2 (D3.1–D4.3) to launch |
| 7 Polish / final integration | Not started |
| 8–9 Deploy / Search Console | Needs the user (GitHub account, sign-in). Not started; no deployment without the user |

## How each theme is built (repeatable procedure)
1. One builder agent per topic, in an isolated worktree, following `docs/AUTHORING.md`. Each commits `Theme X: <code> <title>` on its own branch.
2. Merge the branches into `main`. Check every branch only touched its own topic's files.
3. `rm -rf node_modules/.astro .astro && npm run verify`, which runs astro check, build, unit tests, links, Playwright on 3 browsers with axe, and Lighthouse on every page.
4. `node scripts/serve.mjs &` then `node scripts/shoot-visuals.mjs <slugs…>` to capture every visual.
5. Examiner review agents (3 topics each) read the content plus screenshots and report findings; fixer agents apply them.
6. Re-verify, add the review log and open claims to `REVIEW.md`, then commit `Stage N: Theme X complete`.

Reference material is in the scratchpad (not in the repo): guide extracts in `scratchpad/guide/<CODE>.txt` and study-guide page images in `scratchpad/allott/<CODE>/`. A copy of the official guide is in the git-ignored `reference/` folder.

## Notes
- Before any unit-test run after a merge, clear `node_modules/.vitest-cache` (the `test:unit` script now does this).
- Review screenshots are made with `PORT=4431 node scripts/serve.mjs &` and `PORT=4431 node scripts/shoot-visuals.mjs <slugs>`.

## Next steps
- Wait for the Theme B builders, then follow steps 2–6 above.
- Then Theme C, then Theme D, using the same procedure and the topic visual plans in `docs/PLAN.md` §2.
- Final integration: full verify, home/theme pages, every topic linked in the sidebar, and a REVIEW.md summary.
