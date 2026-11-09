export function progressLabel(percent: number): string {
  if (percent >= 100) return 'Checklist complete';
  if (percent >= 75) return 'A few sections left';
  if (percent >= 50) return 'Making progress';
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

export function reportUrgency(value: string, now = Date.now()) {
  const date = Date.parse(value);
  if (!Number.isFinite(date))
    return { label: 'Report date unavailable', variant: 'neutral' as const };
  const days = Math.ceil((date - now) / 86400000);
  if (date < now)
    return { label: 'Report date passed · confirm submission', variant: 'failure' as const };
  if (days <= 7)
    return {
      label: `Report due ${days === 0 ? 'today' : `in ${days} days`}`,
      variant: 'failure' as const,
    };
  return { label: `Report due in ${days} days`, variant: 'pending' as const };
}
