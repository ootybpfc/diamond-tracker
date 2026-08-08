import { useMemo, useState } from 'react';
import { Flame, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { AccountabilityDay, ChecklistTemplate } from '../types/database';
import { lastNDays, formatDate, today } from '../lib/utils';

type CellState = 'done' | 'missed' | 'nodata';

interface AccountabilityChartProps {
  accountabilityDays: AccountabilityDay[];
  checklistTemplate: ChecklistTemplate | null;
}

interface TaskRow {
  label: string;
  cells: { date: string; state: CellState }[];
  doneCount: number;
  trackedCount: number;
  streak: number;
}

const RANGES = [
  { key: 7, label: '7d' },
  { key: 30, label: '30d' },
] as const;

export function AccountabilityChart({ accountabilityDays, checklistTemplate }: AccountabilityChartProps) {
  const [range, setRange] = useState<number>(7);
  const todayStr = today();

  const { rows, todayDone, todayTotal, strongest, weakest } = useMemo(() => {
    const dates = lastNDays(range).map((d) => formatDate(d));
    const byDate = new Map(accountabilityDays.map((day) => [day.date, day]));

    // Template order drives the list so positions stay stable and memorable.
    // Any label that only exists in history (renamed or removed from the
    // template) is appended so past effort never silently disappears.
    const templateLabels = checklistTemplate?.items ?? [];
    const historicalLabels = new Set<string>();
    dates.forEach((date) => {
      byDate.get(date)?.items?.forEach((item) => historicalLabels.add(item.label));
    });
    const labels = [
      ...templateLabels,
      ...[...historicalLabels].filter((label) => !templateLabels.includes(label)).sort(),
    ];

    const builtRows: TaskRow[] = labels.map((label) => {
      const cells = dates.map((date) => {
        const day = byDate.get(date);
        if (!day) return { date, state: 'nodata' as CellState };
        const item = day.items?.find((entry) => entry.label === label);
        if (!item) return { date, state: 'nodata' as CellState };
        return { date, state: (item.checked ? 'done' : 'missed') as CellState };
      });

      const doneCount = cells.filter((c) => c.state === 'done').length;
      const trackedCount = cells.filter((c) => c.state !== 'nodata').length;

      // Walk backwards from today. Today not being ticked yet shouldn't look
      // like a broken streak, so it's skipped rather than counted as a miss.
      let streak = 0;
      for (let i = cells.length - 1; i >= 0; i--) {
        const cell = cells[i];
        if (cell.state === 'done') {
          streak++;
        } else if (cell.date === todayStr) {
          continue;
        } else {
          break;
        }
      }

      return { label, cells, doneCount, trackedCount, streak };
    });

    const todayRow = byDate.get(todayStr);
    const withRate = builtRows.filter((r) => r.trackedCount > 0);
    const sortedByRate = [...withRate].sort(
      (a, b) => b.doneCount / b.trackedCount - a.doneCount / a.trackedCount
    );

    return {
      rows: builtRows,
      todayDone: todayRow?.items?.filter((i) => i.checked).length ?? 0,
      todayTotal: templateLabels.length || todayRow?.items?.length || 0,
      strongest: sortedByRate.length > 1 ? sortedByRate[0] : null,
      weakest: sortedByRate.length > 1 ? sortedByRate[sortedByRate.length - 1] : null,
    };
  }, [accountabilityDays, checklistTemplate, range, todayStr]);

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-8 text-center">
        <div className="w-11 h-11 rounded-pill bg-surface-2 flex items-center justify-center">
          <Plus size={18} className="text-muted" />
        </div>
        <div>
          <p className="text-sm text-text font-medium">No tasks yet</p>
          <p className="text-xs text-muted mt-0.5">Add items to your Accountability list to track them here.</p>
        </div>
        <Link
          to="/daily"
          className="pill-btn bg-accent text-bg hover:bg-accent-hover"
        >
          Set up checklist
        </Link>
      </div>
    );
  }

  const todayPercent = todayTotal > 0 ? Math.round((todayDone / todayTotal) * 100) : 0;

  return (
    <div>
      {/* Today summary + range toggle */}
      <div className="flex items-center gap-3.5 mb-5">
        <ProgressRing percent={todayPercent} />
        <div className="flex-1 min-w-0">
          <p className="text-sm text-text font-medium">
            {todayDone} of {todayTotal} done today
          </p>
          <p className="text-xs text-muted mt-0.5 truncate">
            {strongest && strongest.doneCount > 0
              ? `Most consistent: ${strongest.label}`
              : 'Tick items on the Daily page to build streaks.'}
          </p>
        </div>
        <div className="flex rounded-pill border border-border overflow-hidden text-[11px] flex-shrink-0">
          {RANGES.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setRange(key)}
              aria-pressed={range === key}
              className={`px-3 py-1.5 font-mono transition ${
                range === key ? 'bg-accent text-bg' : 'bg-surface-2 text-muted'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Per-task consistency rows */}
      <div className="space-y-3.5">
        {rows.map((row) => {
          const rate = row.trackedCount > 0 ? row.doneCount / row.trackedCount : 0;
          const lagging = row.trackedCount >= 3 && rate < 0.5;
          return (
            <div key={row.label}>
              <div className="flex items-baseline gap-2 mb-1.5">
                <span className="text-[13px] text-text truncate flex-1 min-w-0">{row.label}</span>
                {row.streak > 1 && (
                  <span className="flex items-center gap-0.5 text-[10px] font-mono text-accent flex-shrink-0">
                    <Flame size={10} />
                    {row.streak}
                  </span>
                )}
                <span
                  className={`text-[10px] font-mono flex-shrink-0 ${lagging ? 'text-clay' : 'text-muted'}`}
                >
                  {row.doneCount}/{range}
                </span>
              </div>
              <div className="flex gap-[3px]">
                {row.cells.map((cell) => (
                  <div
                    key={cell.date}
                    title={`${cell.date} — ${
                      cell.state === 'done' ? 'done' : cell.state === 'missed' ? 'not done' : 'no entry'
                    }`}
                    className={`flex-1 min-w-0 ${range === 7 ? 'h-7 rounded-[3px]' : 'h-5 rounded-[1px]'} ${
                      cell.state === 'done'
                        ? 'bg-sage'
                        : cell.state === 'missed'
                        ? 'bg-surface-2 border border-border'
                        : 'bg-surface-2/50'
                    } ${cell.date === todayStr ? 'ring-1 ring-accent ring-offset-1 ring-offset-surface' : ''}`}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Axis. Per-cell labels only fit in the 7-day view; at 30 days the
          columns are ~9px wide, so a start/end caption is used instead. */}
      {range === 7 ? (
        <div className="flex gap-[3px] mt-2">
          {rows[0].cells.map((cell) => (
            <span key={cell.date} className="flex-1 min-w-0 text-center text-[9px] font-mono text-muted">
              {new Date(`${cell.date}T00:00:00`).toLocaleDateString(undefined, { weekday: 'narrow' })}
            </span>
          ))}
        </div>
      ) : (
        <div className="flex justify-between mt-2 text-[9px] font-mono text-muted">
          <span>
            {new Date(`${rows[0].cells[0].date}T00:00:00`).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
            })}
          </span>
          <span>Today</span>
        </div>
      )}

      {/* Nudge */}
      {weakest && weakest.trackedCount >= 3 && weakest.doneCount / weakest.trackedCount < 0.5 && (
        <p className="text-[11px] text-muted mt-4 pt-3 border-t border-border">
          <span className="text-clay">Needs attention:</span> {weakest.label} — {weakest.doneCount} of{' '}
          {weakest.trackedCount} tracked days.
        </p>
      )}
    </div>
  );
}

function ProgressRing({ percent }: { percent: number }) {
  const radius = 20;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;

  return (
    <div className="relative w-12 h-12 flex-shrink-0">
      <svg className="w-12 h-12 -rotate-90" viewBox="0 0 48 48">
        <circle cx="24" cy="24" r={radius} fill="none" stroke="currentColor" strokeWidth="4" className="text-surface-2" />
        <circle
          cx="24"
          cy="24"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={percent === 100 ? 'text-sage' : 'text-accent'}
          style={{ transition: 'stroke-dashoffset 0.4s ease-out' }}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[11px] font-mono font-semibold text-text">
        {percent}%
      </span>
    </div>
  );
}
