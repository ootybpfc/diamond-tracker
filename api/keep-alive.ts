// Vercel Serverless Function: /api/keep-alive
//
// Supabase pauses Free Plan projects that go a week without meaningful user
// database activity, and a paused project takes the whole app down until it is
// manually restored. This endpoint issues one tiny write against the database
// so that never happens.
//
// Triggered daily by the cron entry in vercel.json. Daily rather than every few
// days for two reasons: Supabase describes the requirement as "a few user
// requests to the database each day over the previous week", and the Vercel
// Hobby plan only permits one cron invocation per day anyway — so a longer
// interval would be both riskier and no cheaper.
//
// Safe to call by hand: GET https://<site>/api/keep-alive

import type { VercelRequest, VercelResponse } from '@vercel/node';

// Reads the existing project env vars. The VITE_-prefixed names are what this
// project already has configured; the unprefixed names are checked first so
// the function keeps working if they are ever added under the conventional
// server-side names. Nothing here needs to be changed or rotated.
function resolveSupabase(): { url?: string; key?: string } {
  return {
    url: process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
    key: process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY,
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Optional hardening. Vercel sends `Authorization: Bearer $CRON_SECRET` on
  // cron invocations when that env var is set. If it is not set, the check is
  // skipped — the endpoint only bumps a counter, so leaving it open is not a
  // real exposure, but honouring the secret when present costs nothing.
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && req.headers.authorization !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { url, key } = resolveSupabase();
  if (!url || !key) {
    // Worth being explicit: a silent failure here means the project pauses in a
    // week and the cause is a missing env var, which is miserable to diagnose
    // after the fact.
    return res.status(500).json({
      ok: false,
      error:
        'Supabase env vars not available to this function. Expected SUPABASE_URL / VITE_SUPABASE_URL and the matching anon key.',
    });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    // Calls the keep_alive() function rather than selecting from a table: anon
    // is revoked on every application table, so a plain select would be
    // rejected. The function is SECURITY DEFINER, updates a single-row counter,
    // and returns the new value.
    const apiRes = await fetch(`${url}/rest/v1/rpc/keep_alive`, {
      method: 'POST',
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: '{}',
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!apiRes.ok) {
      const detail = await apiRes.text().catch(() => '');
      return res.status(502).json({
        ok: false,
        status: apiRes.status,
        error: `Supabase rejected the heartbeat: ${detail.slice(0, 300)}`,
      });
    }

    const rows = (await apiRes.json()) as Array<{ last_ping: string; ping_count: number }>;
    const row = Array.isArray(rows) ? rows[0] : undefined;

    return res.status(200).json({
      ok: true,
      last_ping: row?.last_ping ?? null,
      ping_count: row?.ping_count ?? null,
    });
  } catch (err) {
    clearTimeout(timeout);
    const aborted = err instanceof Error && err.name === 'AbortError';
    return res.status(504).json({
      ok: false,
      error: aborted ? 'Heartbeat timed out after 8s' : `Heartbeat failed: ${String(err)}`,
    });
  }
}
