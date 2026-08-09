/** Simple hash for cache keys (djb2) */
export function hashString(str: string): string {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) + str.charCodeAt(i);
  }
  return (hash >>> 0).toString(36);
}

/** Format a Date to YYYY-MM-DD (local timezone) */
export function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Format a Date to YYYY-MM */
export function formatMonth(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

/** Today's date string */
export function today(): string {
  return formatDate(new Date());
}

/** Current month string */
export function currentMonth(): string {
  return formatMonth(new Date());
}

/** Get the Monday of the week containing the given date */
export function startOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday as start
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Get an array of the last N days (including today) as Date objects */
export function lastNDays(n: number): Date[] {
  const days: Date[] = [];
  const today = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    days.push(d);
  }
  return days;
}

/** Days in a given month (0-indexed month) */
export function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

/** First day of month (0=Sunday) */
export function firstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

/** Is the given date in the future? */
export function isFuture(date: Date): boolean {
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  return date > today;
}

/** Is the given date today? */
export function isToday(dateStr: string): boolean {
  return dateStr === today();
}

/** Short relative time (e.g., "2h ago", "3d ago") */
export function relativeTime(isoStr: string): string {
  const date = new Date(isoStr);
  const now = Date.now();
  const diff = now - date.getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

/** Initials from a name */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Clamp a value between min and max */
export function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

/**
 * Append a new transcript to whatever is already in the field.
 * Voice notes previously overwrote existing text, silently destroying
 * anything the user had already typed or dictated.
 */
export function appendTranscript(existing: string, addition: string): string {
  const base = existing.trimEnd();
  const next = addition.trim();
  if (!next) return existing;
  if (!base) return next;
  return `${base}\n\n${next}`;
}
