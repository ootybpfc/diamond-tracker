# Dashboard DTM Source

Use accountability day counts as the canonical DTM source for dashboard visuals.

## What Happened
In `diamond-tracker` task `t1`, the dashboard stat cards already counted DTM from `accountabilityDays.dtm_count`, but the heatmap and activity mix chart still aggregated legacy `dtmLogs`. That made the same page show conflicting DTM totals depending on which widget the user looked at.

## Takeaway
When rendering dashboard-level DTM summaries, charts, or heatmaps, derive counts from `accountabilityDays.dtm_count`. Treat `dtmLogs` as legacy detail data only unless the feature explicitly needs person-level message history.

## History
- 2026-08-08 (diamond-tracker/t1): initial
