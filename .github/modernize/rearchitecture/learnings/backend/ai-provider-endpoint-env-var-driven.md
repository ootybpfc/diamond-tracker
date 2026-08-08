# AI Provider Endpoint Must Be Env-Var Driven, Not Hardcoded

Serverless AI-calling functions should read endpoint/model/key from env vars with safe fallbacks, never hardcode a third-party inference URL — third-party AI services can be retired without warning.

## What Happened

In `diamond-tracker/t3`, both `api/extract-actions.ts` and `api/polish-content.ts` hardcoded `GITHUB_MODELS_URL = 'https://models.inference.ai.azure.com/chat/completions'` and `MODEL = 'meta-llama-3.1-8b-instruct'` as source-level constants. GitHub Models (the service behind that URL) was fully retired 2026-07-30 — confirmed via a live fetch of `docs.github.com/en/github-models` during this audit. The architect's prior static-analysis pass (t1) had marked this wiring as "clean bill of health" because the *shapes* matched; it had no way to detect that the *external service itself* was gone, since that requires live/web verification, not code reading.

## Takeaway

- When auditing "env-var wiring" for any external AI/API integration, don't stop at confirming request/response shape parity — verify the actual endpoint/service is still live (web fetch of official docs), especially for anything AI-related given how fast that space changes.
- Make third-party inference endpoint, model name, and auth key configurable via env vars with the *previous* hardcoded value as the fallback default. This is a zero-risk, backward-compatible change (nothing breaks if the env vars aren't set) and means the next provider migration is a config change, not a code change.
- Keep the *existing* documented env var name (`GITHUB_TOKEN` here) working as a fallback when introducing a more generic replacement (`AI_API_KEY`) — avoids forcing a redeploy/config update just to keep the status quo working.

## Example

```ts
const aiUrl = process.env.AI_ENDPOINT_URL || DEFAULT_AI_URL;
const model = process.env.AI_MODEL_NAME || DEFAULT_MODEL;
const token = process.env.GITHUB_TOKEN || process.env.AI_API_KEY;
```

## History
- 2026-08-08 (diamond-tracker/t3): initial
- 2026-08-08 (diamond-tracker/t3.1): provider migrated GitHub Models → Google Gemini `generateContent`. The "keep the old var as a fallback" advice above does NOT always apply — `GITHUB_TOKEN` was deliberately dropped as an auth fallback here (not carried forward alongside `GEMINI_API_KEY`) because a GitHub PAT cannot authenticate against a different vendor's API; carrying it forward would silently imply compatibility that doesn't exist. Rule of thumb: keep old env var names as fallbacks only when they'd still work if set (same auth scheme/provider); drop them when the underlying auth scheme changes entirely, and say so explicitly in docs.
