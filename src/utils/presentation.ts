export function progressLabel(percent: number): string {
  if (percent >= 100) return 'Checklist complete';
  if (percent >= 75) return 'One step from a complete checklist';
  if (percent >= 50) return "You're doing great";
  if (percent > 30) return 'Almost there';
  if (percent > 0) return 'Building your application';
  return 'Ready to begin';
}

export function formatEventDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleString('en', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
}

function calendarDate(value: string): Date {
  const parts = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!parts) return new Date(value);
  const [year, month, day] = parts.slice(1).map(Number);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day
    ? date
    : new Date(NaN);
}

export function formatCalendarDate(value: string, long = false): string {
  const date = calendarDate(value);
  return Number.isFinite(date.getTime())
    ? date.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: long ? 'long' : 'short',
        year: 'numeric',
      })
    : 'Date unavailable';
}

export function reportUrgency(value: string, now = Date.now()) {
  const date = calendarDate(value);
  if (!Number.isFinite(date.getTime()))
    return { label: 'Report date unavailable', variant: 'neutral' as const };
  // Date-only funder deadlines are calendar dates, not midnight UTC instants.
  const today = new Date(now);
  const day = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  const days = Math.round(
    (day - Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())) / 86400000
  );
  if (days < 0)
    return { label: 'Report date passed · confirm submission', variant: 'failure' as const };
  if (days <= 7)
    return {
      label: `Report due ${days === 0 ? 'today' : `in ${days} days`}`,
      variant: 'failure' as const,
    };
  if (days <= 30) return { label: `Report due in ${days} days`, variant: 'pending' as const };
  return { label: `Report due in ${days} days · time to prepare`, variant: 'verified' as const };
}
