# Date-String Re-Parsing Timezone Bug

Re-parsing a stored `YYYY-MM-DD` date string with `new Date(str)` and then reading local getters causes off-by-one-day/month drift in negative-UTC-offset timezones.

## What Happened

In `diamond-tracker`/t1 (architect audit), `BarChart.tsx` called `formatMonth(new Date(a.date))` where `a.date` is a stored `'YYYY-MM-DD'` string. `new Date('YYYY-MM-DD')` (no time component) is parsed as **UTC midnight**. `formatMonth`/`formatDate` then read `.getFullYear()/.getMonth()/.getDate()`, which are **local-timezone** getters. For any user west of UTC, this shifts the effective calendar date back by one day, which can bucket an entry into the wrong month (or day) near month/day boundaries.

The rest of the codebase (`Heatmap.tsx`, `Dashboard.tsx`) avoids this by either comparing date strings directly (`a.date === dateStr`) or only ever calling `new Date()` for "today" (which has no parsing ambiguity).

## Takeaway

Never do `new Date(storedDateString)` → local getter round-trips on a date-only (`YYYY-MM-DD`) string. Either:
- Compare/derive from the string directly (`str.slice(0, 7)` for month, plain string equality for day), or
- If a `Date` object is required, construct it explicitly with `new Date(year, monthIndex, day)` from parsed components instead of the ISO string constructor.

When auditing or writing new code that buckets by day/month/week from a stored date-only field, grep for `new Date(<field>.date)` patterns and verify they don't feed into local-timezone getters.

## History
- 2026-08-08 (diamond-tracker/t1): initial
