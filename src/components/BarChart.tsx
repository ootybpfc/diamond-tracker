import { Association, ContentEntry, DtmLog } from '../types/database';
import { lastNDays, formatDate } from '../lib/utils';

interface BarChartProps {
  associations: Association[];
  contentEntries: ContentEntry[];
  dtmLogs: DtmLog[];
}

const CATEGORIES = [
  { key: 'association', label: 'Assoc', color: 'bg-accent' },
  { key: 'reading', label: 'Read', color: 'bg-sage' },
  { key: 'podcast', label: 'Pod', color: 'bg-clay' },
  { key: 'dtm', label: 'DTM', color: 'bg-accent/60' },
] as const;

export function BarChart({ associations, contentEntries, dtmLogs }: BarChartProps) {
  const days = lastNDays(7);

  const dayData = days.map((date) => {
    const dateStr = formatDate(date);
    const counts = {
      association: associations.filter((a) => a.date === dateStr).length,
      reading: contentEntries.filter((c) => c.date === dateStr && c.type === 'reading').length,
      podcast: contentEntries.filter((c) => c.date === dateStr && c.type === 'podcast').length,
      dtm: dtmLogs.filter((d) => formatDate(new Date(d.sent_at)) === dateStr).length,
    };
    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    return { date, dateStr, counts, total };
  });

  const maxTotal = Math.max(...dayData.map((d) => d.total), 1);
  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div>
      <div className="flex items-end justify-between gap-2 h-32 mb-2">
        {dayData.map(({ date, dateStr, counts, total }) => {
          const heightPercent = (total / maxTotal) * 100;
          return (
            <div key={dateStr} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full flex-1 flex flex-col-reverse gap-0.5 min-h-0">
                {total > 0 && (
                  <div
                    className="w-full rounded-t-md overflow-hidden flex flex-col-reverse"
                    style={{ height: `${Math.max(heightPercent, 6)}%` }}
                  >
                    {CATEGORIES.map(({ key, color }) =>
                      counts[key as keyof typeof counts] > 0 ? (
                        <div
                          key={key}
                          className={color}
                          style={{
                            flexGrow: counts[key as keyof typeof counts],
                          }}
                        />
                      ) : null
                    )}
                  </div>
                )}
              </div>
              <span className="text-[10px] font-mono text-muted">
                {dayLabels[date.getDay()].slice(0, 1)}
              </span>
            </div>
          );
        })}
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2">
        {CATEGORIES.map(({ key, label, color }) => (
          <div key={key} className="flex items-center gap-1.5">
            <div className={`w-2.5 h-2.5 rounded-sm ${color}`} />
            <span className="text-[10px] font-mono text-muted">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
