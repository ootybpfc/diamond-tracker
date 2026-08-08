# Provider-Swap Remediation Must Sweep the Whole Repo, Not Just the Files It Edits

When a third-party provider is swapped out, search the whole repo for the old name/env-var — not just the handler files being changed — because onboarding UI, docs, and error strings also "wire" the env var.

## What Happened

In `diamond-tracker/t3.1`, the GitHub Models → Gemini remediation correctly rewrote `api/extract-actions.ts`, `api/polish-content.ts`, `.env`, `.env.example`, and `README.md` — all internally consistent and verified with `get_errors`. But `src/pages/SetupScreen.tsx` (the app's first-run onboarding screen) still read `"Set GITHUB_TOKEN on Vercel for serverless AI functions"`. It was missed because: (a) t2 (frontend, owner of `src/pages/`) ran its audit *before* t3.1's remediation existed, so it had nothing to catch; (b) t3.1 scoped its edit list to the files it knew carried the provider config, not a repo-wide search for the *string* `GITHUB_TOKEN`. `t3.2` caught it only because it ran a workspace-wide regex sweep for the retired name across every file, not just the ones already known to be involved.

## Takeaway

- When remediating a provider/env-var swap, run one workspace-wide text search for the *old* name (`GITHUB_TOKEN`, `GITHUB_MODELS_URL`, the old model id, etc.) as a completion check — not just a code-shape/contract check on the files you intentionally touched.
- User-facing strings (onboarding screens, setup wizards, error banners) that name a specific env var are part of the wiring surface, even though they aren't "code" in the request/response sense — a stale one actively misleads users into configuring the wrong thing.
- Do this sweep *after* the edit, as a final gate, so it also catches anything a parallel task (that ran before your remediation existed) had no chance to update.

## Example

```
# after any provider/env-var rename, before declaring the remediation complete:
grep -rn "OLD_PROVIDER_NAME\|OLD_ENV_VAR\|old-model-id" --include="*.ts" --include="*.tsx" --include="*.md" .
```

## History
- 2026-08-08 (diamond-tracker/t3.2): initial — found via workspace-wide sweep during re-verification of t3.1's remediation.
