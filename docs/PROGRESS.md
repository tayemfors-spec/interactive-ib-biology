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

## Checkpoint — 2026-10-20 (usage limit reached)
**Done on main:** Themes A, B complete and reviewed. Theme C merged and verified (481 unit, 540 e2e, Lighthouse ≥98); C review fixes NOT yet merged. Merged D2.3, D2.2, D1.3 (commit b51a906) — not yet re-verified on main.
**Uncommitted on main (unverified):** `src/components/viz/Figure.astro` and `Anim.astro` phone horizontal-scroll for wide SVGs (Figure .art has tabindex/role=region). Verify with e2e + axe (mobile) before committing.
**Branches awaiting check/merge (worktree-agent-*):** C review fixers — C2.1/C2.2/C3.1 and C3.2/C4.1/C4.2; reviewer C1.1–C1.3 result pending (re-run if lost). Builders D1.1, D1.2, D2.1 (wave 1) and D3.1, D3.2, D3.3 (wave 2). For each: `git log -1 <branch>`; check `git diff --name-only main...<branch>` touches only its topic; merge; if a branch has no commit, rebuild that topic.
**Next steps:**
1. Merge C fixer branches, run C1.1–C1.3 fixes, `npm run verify`, add C review log to REVIEW.md, commit "Stage 5: Theme C complete".
2. Launch D4.1, D4.2, D4.3 builders (ports 4450–4452, same brief template).
3. Merge all Theme D, verify, 3 examiner reviews (align D2.3 osmosis "solvation" wording with B2.1), fixes, commit "Stage 6".
4. Final full verify, update REVIEW.md/PROGRESS.md, final report. Do NOT deploy (needs user).

## Checkpoint — 2026-10-20 (later)
- Stage 5 committed (d6c4762): Theme C complete, reviewed and fixed; full verify passed (627 unit, 639 e2e, 106 links, Lighthouse assertions).
- Shared fixes committed: phone sideways scroll for wide diagrams (18e0407); 3D label occlusion ignores hidden/transparent meshes (9936a10).
- All 12 Theme D topics merged; main builds (astro check 0/0, 755 unit tests before D4.2).
- Uncommitted: tests/e2e/interactives.spec.ts skips hidden sliders (to verify in the Stage 6 run).
- Running: 4 Theme D examiner reviews (D1, D2, D3, D4 groups). Screenshots in screenshots/<slug>/; server on port 4462.
- Next: fixers per group (D2 group must align D2.3 osmosis wording with B2.1), npm run verify, REVIEW.md Theme D claims + log, commit "Stage 6: Theme D complete", final report. No deploy without the user.

## Stage 6 — 2026-10-20: all 40 topics complete
- Theme D built (12 topics), examiner-reviewed (0 critical, 7 major, 40 minor) and fixed.
- Full verify on all 40 topics passed: astro check 0/0, 776 unit tests, 126 links, 732 e2e (desktop Chrome, Android Chrome, iPhone Safari; axe light + dark), Lighthouse on 46 pages (min: Perf 97, A11y 100, BP 100, SEO 100).
- Remaining: Stage 8 deploy to GitHub Pages and Stage 9 Search Console both need the user (account, sign-in, approving the first push). Optional clean-ups listed in the final report.
