# Repo Hygiene: noEmit Root Cause and Tracked .env

Fixing stale committed build artifacts requires fixing `tsconfig.node.json`'s `noEmit`, not just adding a `.gitignore`.

## What Happened
In `diamond-tracker` task `t2`, `vite.config.js`/`vite.config.d.ts`/`*.tsbuildinfo` were committed to the repo. The root cause was `tsconfig.node.json` (which compiles `vite.config.ts` for the `tsc -b` project-reference build) missing `noEmit`/`outDir`, unlike the main `tsconfig.json`. A `.gitignore` alone would have stopped new commits but not stopped the files from being regenerated next to the source on every `npm run build`. Separately, `.env` (containing a public Supabase anon key + a placeholder `GITHUB_TOKEN`) was tracked in git history; it was untracked via `git rm --cached` (file kept on disk) after confirming no live secret was present.

## Takeaway
When a repo has stale generated files sitting next to TS source under a `tsc -b` project-reference setup, check every referenced `tsconfig.*.json` for `noEmit`/`outDir` — don't just gitignore the symptom. When untracking a `.env` from git, always read its contents first to determine whether a live secret needs rotation before/instead of just removing it from the index.

## History
- 2026-08-08 (diamond-tracker/t2): initial
