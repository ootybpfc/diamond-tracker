# t3 — Backend Audit: Request/Response & Env-Var Wiring (`api/extract-actions.ts`, `api/polish-content.ts`)

## Scope

Independently re-verify t1 Finding #6 (marked "clean bill of health, confirmation only") and audit env-var wiring for both Vercel serverless functions and their client counterpart `src/lib/ai.ts`.

## Verification Performed

1. **Request/response shape match** (re-confirmed t1 Finding #6):
   - `polishContent()` in [src/lib/ai.ts](../../../../src/lib/ai.ts) POSTs `{text, type}` → [api/polish-content.ts](../../../../api/polish-content.ts) destructures `{text, type}`, returns `{polished}` → client reads `data.polished`. Match.
   - `extractActions()` in [src/lib/ai.ts](../../../../src/lib/ai.ts) POSTs `{notes}` → [api/extract-actions.ts](../../../../api/extract-actions.ts) destructures `{notes}`, returns `{actions}` → client reads `data.actions`. Match.
   - Client-side timeout (12000ms) > server-side timeout (10000ms) in both functions — correct ordering so the server's own 504 fires before the client aborts. No change needed.
   - `GITHUB_TOKEN` read only via `process.env` (never `VITE_`-prefixed) — confirmed never bundled to the client. No change needed.
2. **Env-var/endpoint audit (new finding, not caught by t1's static code comparison):** verified the AI provider endpoint against current official docs.

## Findings

| # | Severity | Location | Issue | Fix Applied |
|---|---|---|---|---|
| 1 | **CRITICAL** | `api/extract-actions.ts`, `api/polish-content.ts` — hardcoded `GITHUB_MODELS_URL = 'https://models.inference.ai.azure.com/chat/completions'` | GitHub Models (the service backing this URL, authenticated via `GITHUB_TOKEN`) was **fully retired 2026-07-30** per [GitHub's own docs](https://docs.github.com/en/github-models) — confirmed live via web fetch during this audit. This is 9 days before the current date. Every call to `/api/polish-content` and `/api/extract-actions` will now fail (`502`/network error) at runtime — a passing build/typecheck would **not** catch this since it's a live external dependency, not a code defect visible via static analysis. This affects two core product features: Content polishing (`Content.tsx`) and Coach action-item extraction (`Coach.tsx`). | Made endpoint, model, and auth key **env-var driven** instead of hardcoded, so ops can point at a replacement provider (e.g. Azure AI Foundry) without another code change: `AI_ENDPOINT_URL` (endpoint, falls back to the retired default), `AI_MODEL_NAME` (model/deployment name, falls back to previous default), `AI_API_KEY` (new bearer-token var, `GITHUB_TOKEN` still works as fallback so no existing Vercel config breaks). Documented in README under a new "⚠️ AI Provider Migration Required" callout. **Escalating — see notify below**: choosing/provisioning the actual replacement provider and its credentials is a product/infra decision outside backend's ownership. |
| 2 | LOW | Both functions — upstream error responses | On non-2xx upstream response, only the HTTP status code was surfaced to the client (`GitHub Models API error: 502`), discarding the response body. Once ops points `AI_ENDPOINT_URL` at a new provider, this made auth/config mistakes hard to diagnose. | Both functions now include up to 200 chars of the upstream response body in the `502` error message. |

## Non-Findings (Verified Correct, No Change)

- Method guard (`POST` only → 405), missing-field validation (400), missing-token guard (500), abort/timeout handling (504), and defensive JSON parsing with markdown-fence stripping + line-split fallback in `extract-actions.ts` are all sound and unchanged.
- `vercel.json` `maxDuration: 15` comfortably covers the 10s in-function timeout with margin. No change needed.
- `@vercel/node` type import and handler signature (`(req: VercelRequest, res: VercelResponse)`) are correctly wired per Vercel's Node runtime contract.

## Test Results

- Command: N/A — `node`/`npm` are **not installed** in this workspace's terminal (confirmed via `node --version` → `CommandNotFoundException`), matching t1 Finding #1's already-escalated environment blocker. `npm run typecheck` / `npm run build` cannot be executed until Node is provisioned.
- Static verification: used the VS Code TypeScript language server (`get_errors`) against both edited files after the change — **0 errors, 0 warnings**.
- Manual trace of both request/response contracts (client ↔ handler) end-to-end — confirmed matching field names and types on both sides (see Verification Performed above).

## Upstream Artifacts Consumed
- `.github/modernize/rearchitecture/artifacts/t1-architect.md` — Finding #6 (request/response wiring "clean bill of health") was the starting point; independently re-verified rather than trusted blindly, which surfaced Finding #1 above (CRITICAL, not visible via static code analysis).
- `.github/modernize/rearchitecture/clarification.md` — confirmed `upgrade`/same-stack classification; no API contract change was in scope, so the request/response shapes themselves were left untouched.

## Evidence Mapping
- `t1-architect.md#Findings row 6` → this report's "Verification Performed" section (re-confirmed the same request/response match independently).
- Live web fetch of `https://docs.github.com/en/github-models` (2026-08-08) → Finding #1 (GitHub Models retirement date and scope).
- `get_errors` tool output on both edited files → Test Results (0 TS errors post-change).

## Notes for Downstream Tasks

- **t5 (smoke test)**: cannot execute `npm run typecheck`/`build` until Node.js/npm is provisioned in this environment (t1 Finding #1, restated here as it also blocks verifying this task's TS changes end-to-end).
- **t6 (tester)**: AI polish/extract flows (`Content.tsx`, `Coach.tsx`) will functionally fail end-to-end (502) until a real `AI_ENDPOINT_URL`/`AI_API_KEY` is provisioned — this is expected and not a regression introduced by this task; the offline cache/queue fallback in `src/lib/ai.ts` will mask this in the UI as "queued"/"cached" states, so a true online end-to-end AI call cannot be verified as passing until the provider is migrated.
- **coordinator**: decision needed on which AI provider replaces GitHub Models (Azure AI Foundry is suggested by GitHub's own retirement notice) and provisioning of its endpoint/key on Vercel — outside backend's ownership boundary (business/infra decision, not implementation).
