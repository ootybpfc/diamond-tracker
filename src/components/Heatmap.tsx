import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Association, ContentEntry, DtmLog, Person } from '../types/database';
import { daysInMonth, firstDayOfMonth, formatDate, isFuture, isToday } from '../lib/utils';
import { Modal } from './ui/Modal';

interface HeatmapProps {
  associations: Association[];
  contentEntries: ContentEntry[];
  dtmLogs: DtmLog[];
  people?: Person[];
}

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export function Heatmap({ associations, contentEntries, dtmLogs, people = [] }: HeatmapProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysCount = daysInMonth(year, month);
  const firstDay = firstDayOfMonth(year, month);
  const monthLabel = currentDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

  // Build activity map: date -> { types: Set, count }
  const activityMap = useMemo(() => {
    const map = new Map<string, { types: Set<string>; count: number }>();

    for (const a of associations) {
      const existing = map.get(a.date) || { types: new Set(), count: 0 };
      existing.types.add('association');
      existing.count++;
      map.set(a.date, existing);
    }

    for (const c of contentEntries) {
      const existing = map.get(c.date) || { types: new Set(), count: 0 };
      existing.types.add(c.type);
      existing.count++;
      map.set(c.date, existing);
    }

    for (const d of dtmLogs) {
      const date = formatDate(new Date(d.sent_at));
      const existing = map.get(date) || { types: new Set(), count: 0 };
      existing.types.add('dtm');
      existing.count++;
      map.set(date, existing);
    }

    return map;
  }, [associations, contentEntries, dtmLogs]);

  const canGoNext = useMemo(() => {
    const next = new Date(year, month + 1, 1);
    return !isFuture(next);
  }, [year, month]);

  const intensityColor = (count: number, types: Set<string>) => {
    if (count === 0) return 'bg-surface-2';
    const typeCount = types.size;
    if (typeCount >= 3) return 'bg-accent';
    if (typeCount === 2) return 'bg-accent/70';
    return 'bg-accent/40';
  };

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysCount; d++) cells.push(d);
  // Pad to fill the last week
  while (cells.length % 7 !== 0) cells.push(null);

  const selectedDayActivities = selectedDay
    ? {
        associations: associations.filter((a) => a.date === selectedDay),
        content: contentEntries.filter((c) => c.date === selectedDay),
        dtm: dtmLogs.filter((d) => formatDate(new Date(d.sent_at)) === selectedDay),
      }
    : { associations: [], content: [], dtm: [] };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={() => setCurrentDate(new Date(year, month - 1, 1))}
          className="p-1.5 rounded-pill text-muted hover:text-text hover:bg-surface-2 transition-colors"
        >
          <ChevronLeft size={18} />
        </button>
        <span className="font-display font-semibold text-sm text-text">{monthLabel}</span>
        <button
          onClick={() => canGoNext && setCurrentDate(new Date(year, month + 1, 1))}
          disabled={!canGoNext}
          className="p-1.5 rounded-pill text-muted hover:text-text hover:bg-surface-2 transition-colors disabled:opacity-30 disabled:pointer-events-none"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1.5 mb-1.5">
        {WEEKDAYS.map((d, i) => (
          <div key={i} className="text-center text-[10px] font-mono text-muted uppercase">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1.5">
        {cells.map((day, i) => {
          if (day === null) return <div key={i} />;
          const dateStr = formatDate(new Date(year, month, day));
          const activity = activityMap.get(dateStr);
          const hasActivity = Boolean(activity && activity.count > 0);
          const isTodayCell = isToday(dateStr);

          return (
            <button
              key={i}
              onClick={() => setSelectedDay(dateStr)}
              className={`aspect-square rounded-lg text-xs font-mono font-medium transition-all duration-100 relative
                ${hasActivity ? intensityColor(activity!.count, activity!.types) : 'bg-surface-2'}
                ${hasActivity ? 'text-bg' : 'text-muted'}
                ${isTodayCell ? 'ring-1 ring-accent' : ''}
                hover:scale-105`}
            >
              {day}
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-3 mt-3 text-[10px] font-mono text-muted">
        <span>Less</span>
        <div className="flex gap-1">
          <div className="w-3 h-3 rounded bg-surface-2" />
          <div className="w-3 h-3 rounded bg-accent/40" />
          <div className="w-3 h-3 rounded bg-accent/70" />
          <div className="w-3 h-3 rounded bg-accent" />
        </div>
        <span>More</span>
      </div>

      <Modal open={selectedDay !== null} onClose={() => setSelectedDay(null)} title={selectedDay || ''}>
        {selectedDayActivities && selectedDayActivities.associations.length === 0 &&
         selectedDayActivities.content.length === 0 && selectedDayActivities.dtm.length === 0 ? (
          <p className="text-muted text-sm py-4 text-center">No activities logged on this day.</p>
        ) : (
          <div className="space-y-3">
            {selectedDayActivities!.associations.length > 0 && (
              <div>
                <h4 className="text-xs font-mono text-muted uppercase mb-1.5">Associations</h4>
                {selectedDayActivities!.associations.map((a) => (
                  <p key={a.id} className="text-sm text-text py-1">{a.note}</p>
                ))}
              </div>
            )}
            {selectedDayActivities!.content.length > 0 && (
              <div>
                <h4 className="text-xs font-mono text-muted uppercase mb-1.5">Content</h4>
                {selectedDayActivities!.content.map((c) => (
                  <div key={c.id} className="py-1">
                    <span className="text-xs font-mono text-accent capitalize">{c.type}</span>
                    <p className="text-sm text-text">{c.raw_text}</p>
                    {c.polished_text && <p className="text-xs text-muted mt-1">{c.polished_text}</p>}
                  </div>
                ))}
              </div>
            )}
            {selectedDayActivities!.dtm.length > 0 && (
              <div>
                <h4 className="text-xs font-mono text-muted uppercase mb-1.5">DTM Messages</h4>
                {selectedDayActivities!.dtm.map((d) => {
                  const person = people.find((p) => p.id === d.person_id);
                  return (
                    <p key={d.id} className="text-sm text-text py-1">
                      {person ? person.name : 'Unknown contact'}
                    </p>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
