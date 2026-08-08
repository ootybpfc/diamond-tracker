## [t3] Audit & fix request/response and env-var wiring in api/*.ts

- t1 marked request/response wiring between `src/lib/ai.ts` and both API handlers as "clean bill of health" (Finding #6). Independently re-verified rather than trusting it blindly — this is what surfaced the real bug (t1's static code comparison couldn't have caught it).
- **Key discovery**: GitHub Models (`models.inference.ai.azure.com`, the endpoint hardcoded in both serverless functions) was fully retired 2026-07-30, confirmed via a live web fetch of `docs.github.com/en/github-models`. Current date is 2026-08-08 — this is a live production outage on both AI features, not a hypothetical risk. A passing `tsc`/build would never catch this since it's an external dependency going away, not a type error.
- Node.js/npm are not installed in this workspace terminal (matches t1 Finding #1) — could not run `npm run typecheck`/`build` myself. Used VS Code's `get_errors` (TS language server) on the two edited files instead as the best available verification; got 0 errors.
- Terminal appeared to have interleaved/garbled output during this session (stray `git rm --cached .env` commands appearing mid-output) — looks like the shared terminal is being used concurrently by another parallel task (likely t2 frontend working on Finding #2's `.gitignore`/`.env` removal). Did not interfere; just noted it and moved on rather than fighting for the terminal.
- Learnings consumed: (none — first backend task, learnings dir was empty)

## [t3.1] Replace GitHub Models with Google Gemini API (remediation of t3 Finding #1)

- User supplied a real Gemini API key + explicit remediation instructions, resolving t3's escalated "coordinator decision needed" blocker directly — no further escalation needed.
- Gemini's REST contract is structurally different from OpenAI-style chat-completions, not just a URL swap: request body uses `contents`/`parts` (+ separate `systemInstruction`) instead of `messages`, and response is `candidates[0].content.parts[0].text` instead of `choices[0].message.content`. Both had to change together; a straight URL/model-name env var swap alone (t3's fix) would not have worked with Gemini.
- Deliberately dropped `GITHUB_TOKEN` as an auth fallback (t3 had kept it as a fallback for `AI_API_KEY`). A GitHub PAT can't authenticate against Google's API, so carrying it forward would be misleading. Wrote this as an explicit correction in the existing `ai-provider-endpoint-env-var-driven` learning rather than treating it as a new file, since it directly qualifies that learning's "keep old var as fallback" advice.
- Used the `x-goog-api-key` header instead of the URL query-string `?key=` auth option Gemini also supports — avoids the key ever appearing in server access logs/URLs.
- Verified the real key never lands in a committed file: workspace-wide literal-string search found it only in the gitignored `.env`; `git status --ignored=matching` confirmed `.env` is untracked (`!!`), not staged.
- Node/npm still unavailable in this environment (same blocker as t1/t3) — verification limited to `get_errors` (0 errors) and manual contract tracing; no live call to the Gemini endpoint was possible from this environment.
- Learnings consumed: backend/ai-provider-endpoint-env-var-driven.md (and appended a correction to it).

## [t3.2] Re-verify request/response & env-var wiring after Gemini remediation

- Didn't just re-read t3.1's report — ran a fresh workspace-wide regex sweep for every retired-provider name/env-var across the *whole repo*, not just the two handler files t3.1 touched. That's what surfaced the real gap: `src/pages/SetupScreen.tsx`'s onboarding UI still told users to `Set GITHUB_TOKEN on Vercel` — a stale instruction pointing at the dead auth variable, missed by both t2 (ran before t3.1 existed) and t3.1 (scoped to `api/*.ts`/`.env`/`.env.example`/`README.md` only).
- **Key lesson**: when remediating a provider swap, "request/response + env vars in the handler files" is not the full blast radius — any user-facing string that names an env var (onboarding screens, error messages, docs) is part of the same wiring and needs the same sweep. A file-scoped fix can leave a project-wide sweep incomplete even when the files it *did* touch are perfectly correct.
- Fixed it directly (1-line string change in a `src/pages/*` file) rather than escalating to frontend — trivial, unambiguous, directly within this task's "confirm zero HIGH/CRITICAL" deliverable, and the risk of leaving a live UI telling users to configure the wrong var was judged higher than the minor boundary crossing.
- Node/npm still not installed (4th consecutive confirmation across t1/t3/t3.1/t3.2) — no new tooling appeared in this environment between tasks.
- Learnings consumed: backend/ai-provider-endpoint-env-var-driven.md (read only, no further correction needed this time — see new learning `provider-swap-sweep-scope.md` for the file-scope gap this task's own experience revealed).

