import { useMemo } from 'react';
import { ArrowDown, ArrowRight, ArrowUp } from 'lucide-react';
import { AccountabilityDay } from '../types/database';
import { lastNDays, formatDate, today } from '../lib/utils';

interface DtmMomentumProps {
  accountabilityDays: AccountabilityDay[];
  /** Reach-outs logged per person from the Network page. */
  networkDtmCount: number;
}

/**
 * DTM is a *count*, not a checkbox, so stacking it alongside boolean checklist
 * items made both unreadable — a day with 20 DTMs dwarfed six ticked habits.
 * It gets its own card with its own scale.
 */
export function DtmMomentum({ accountabilityDays, networkDtmCount }: DtmMomentumProps) {
  const todayStr = today();

  const { bars, thisWeek, lastWeek, dailyAvg, best } = useMemo(() => {
    const byDate = new Map(accountabilityDays.map((d) => [d.date, d]));
    const days = lastNDays(14).map((d) => formatDate(d));
    const counts = days.map((date) => ({ date, count: byDate.get(date)?.dtm_count ?? 0 }));

    const recent = counts.slice(7);
    const prior = counts.slice(0, 7);
    const sum = (arr: typeof counts) => arr.reduce((acc, c) => acc + c.count, 0);
    const thisWeekTotal = sum(recent);

    return {
      bars: recent,
      thisWeek: thisWeekTotal,
      lastWeek: sum(prior),
      dailyAvg: Math.round((thisWeekTotal / 7) * 10) / 10,
      best: Math.max(...recent.map((c) => c.count), 1),
    };
  }, [accountabilityDays]);

  const delta = thisWeek - lastWeek;
  const trend = delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat';
  const TrendIcon = trend === 'up' ? ArrowUp : trend === 'down' ? ArrowDown : ArrowRight;
  const trendColor = trend === 'up' ? 'text-sage' : trend === 'down' ? 'text-clay' : 'text-muted';

  return (
    <div>
      <div className="flex items-end justify-between gap-3 mb-4">
        <div>
          <div className="flex items-baseline gap-2">
            <span className="font-mono font-semibold text-2xl text-accent">{thisWeek}</span>
            <span className={`flex items-center gap-0.5 text-[11px] font-mono ${trendColor}`}>
              <TrendIcon size={11} />
              {delta === 0 ? 'same' : `${delta > 0 ? '+' : ''}${delta}`}
            </span>
          </div>
          <p className="text-xs text-muted mt-0.5">last 7 days · {dailyAvg}/day avg</p>
        </div>
        {networkDtmCount > 0 && (
          <div className="text-right">
            <span className="font-mono text-sm text-text">{networkDtmCount}</span>
            <p className="text-[10px] text-muted">tagged to contacts</p>
          </div>
        )}
      </div>

      {/* items-stretch (not items-end) so each column fills the 4rem track —
          otherwise the bars collapse to zero height. */}
      <div className="flex items-stretch gap-1.5 h-20">
        {bars.map(({ date, count }) => (
          <div key={date} className="flex-1 flex flex-col items-center gap-1.5 min-w-0">
            <div className="w-full flex-1 flex items-end min-h-0">
              <div
                title={`${date} — ${count} DTM`}
                className={`w-full rounded-t-[3px] transition-all ${
                  count > 0 ? 'bg-accent' : 'bg-surface-2'
                } ${date === todayStr ? 'ring-1 ring-accent/50' : ''}`}
                style={{ height: count > 0 ? `${Math.max((count / best) * 100, 10)}%` : '3px' }}
              />
            </div>
            <span className="text-[10px] font-mono text-text leading-none">{count > 0 ? count : ''}</span>
            <span className="text-[9px] font-mono text-muted leading-none">
              {new Date(`${date}T00:00:00`).toLocaleDateString(undefined, { weekday: 'narrow' })}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
