import { Association, ContentEntry, DtmLog, AccountabilityDay, ChecklistTemplate } from '../types/database';
import { lastNDays, formatDate, formatMonth } from '../lib/utils';

interface BarChartProps {
  associations: Association[];
  contentEntries: ContentEntry[];
  dtmLogs: DtmLog[];
  accountabilityDays: AccountabilityDay[];
  checklistTemplate: ChecklistTemplate | null;
  period?: 'week' | 'month';
}

const BASE_CATEGORIES = [
  { key: 'association', label: 'Assoc', color: 'bg-accent' },
  { key: 'reading', label: 'Read', color: 'bg-sage' },
  { key: 'podcast', label: 'Pod', color: 'bg-clay' },
  { key: 'dtm', label: 'DTM', color: 'bg-accent/60' },
] as const;

export function BarChart({ associations, contentEntries, dtmLogs, accountabilityDays, checklistTemplate, period = 'week' }: BarChartProps) {
  const recentMonthKeys = (() => {
    const months = new Set<string>();

    associations.forEach((a) => months.add(formatMonth(new Date(a.date))));
    contentEntries.forEach((c) => months.add(formatMonth(new Date(c.date))));
    dtmLogs.forEach((d) => months.add(formatMonth(new Date(d.sent_at))));
    accountabilityDays.forEach((a) => months.add(formatMonth(new Date(a.date))));

    if (months.size === 0) {
      const now = new Date();
      for (let i = 3; i >= 0; i--) {
        const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
        months.add(formatMonth(monthDate));
      }
    }

    return [...months].sort().slice(-4);
  })();

  const periods = period === 'month'
    ? recentMonthKeys
    : lastNDays(7).map((d) => formatDate(d));

  const accountabilityLabels = checklistTemplate?.items?.length
    ? checklistTemplate.items
    : Array.from(new Set(accountabilityDays.flatMap((day) => day.items.map((item) => item.label))));

  const colorPalette = ['bg-sage/80', 'bg-sage/60', 'bg-accent/30', 'bg-clay/60', 'bg-surface-3', 'bg-accent/40'];

  const accountabilityCategories = accountabilityLabels.map((label, index) => ({
    key: `accountability-${label}`,
    label,
    color: colorPalette[index % colorPalette.length],
  }));

  const dayData = periods.map((periodKey) => {
    const counts: Record<string, number> = {
      association: associations.filter((a) => {
        return period === 'month'
          ? a.date.startsWith(periodKey)
          : a.date === periodKey;
      }).length,
      reading: contentEntries.filter((c) => {
        return period === 'month'
          ? c.date.startsWith(periodKey) && c.type === 'reading'
          : c.date === periodKey && c.type === 'reading';
      }).length,
      podcast: contentEntries.filter((c) => {
        return period === 'month'
          ? c.date.startsWith(periodKey) && c.type === 'podcast'
          : c.date === periodKey && c.type === 'podcast';
      }).length,
      dtm: dtmLogs.filter((d) => {
        const dateStr = formatDate(new Date(d.sent_at));
        return period === 'month'
          ? dateStr.startsWith(periodKey)
          : dateStr === periodKey;
      }).length,
    };

    accountabilityCategories.forEach(({ key, label }) => {
      counts[key] = accountabilityDays.reduce((sum, a) => {
        const matchesPeriod = period === 'month' ? a.date.startsWith(periodKey) : a.date === periodKey;
        if (!matchesPeriod) return sum;
        return sum + a.items.filter((item) => item.label === label).length;
      }, 0);
    });

    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    return { periodKey, counts, total };
  });

  const maxTotal = Math.max(...dayData.map((d) => d.total), 1);
  const hasAccountabilityData = accountabilityCategories.length > 0 && dayData.some(({ counts }) =>
    accountabilityCategories.some(({ key }) => counts[key] > 0)
  );
  const categories = [...BASE_CATEGORIES, ...(hasAccountabilityData ? accountabilityCategories : [])];
  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div>
      <div className="flex items-end justify-between gap-2 h-32 mb-2">
        {dayData.map(({ periodKey, counts, total }) => {
          const heightPercent = (total / maxTotal) * 100;
          return (
            <div key={periodKey} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full flex-1 flex flex-col-reverse gap-0.5 min-h-0">
                {total > 0 && (
                  <div
                    className="w-full rounded-t-md overflow-hidden flex flex-col-reverse"
                    style={{ height: `${Math.max(heightPercent, 6)}%` }}
                  >
                    {categories.map(({ key, color }) =>
                      counts[key] > 0 ? (
                        <div
                          key={key}
                          className={color}
                          style={{
                            flexGrow: counts[key],
                          }}
                        />
                      ) : null
                    )}
                  </div>
                )}
              </div>
              <span className="text-[10px] font-mono text-muted">
                {period === 'month' ? periodKey.slice(5) : periodKey.slice(8)}
              </span>
            </div>
          );
        })}
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2">
        {categories.map(({ key, label, color }) => (
          <div key={key} className="flex items-center gap-1.5">
            <div className={`w-2.5 h-2.5 rounded-sm ${color}`} />
            <span className="text-[10px] font-mono text-muted">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
