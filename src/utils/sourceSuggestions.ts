export interface SourceSuggestion {
  id: string;
  title: string;
  url: string;
  note: string;
  createdAt: string;
}

export function normalizeSourceUrl(value: string): string | undefined {
  try {
    if (value.length > 2048 || /\s/.test(value.trim())) return undefined;
    const url = new URL(value.trim());
    if (url.protocol !== 'https:' || !url.hostname.includes('.') || url.username || url.password)
      return undefined;
    url.hash = '';
    return url.href;
  } catch {
    return undefined;
  }
}

export function validateSource(title: string, url: string, note: string) {
  return {
    title: !title.trim() || title.trim().length > 160 ? 'Enter a title of 1–160 characters.' : '',
    url: normalizeSourceUrl(url) ? '' : 'Enter a full HTTPS source URL without sign-in details.',
    note: note.length > 1000 ? 'Keep the description within 1,000 characters.' : '',
  };
}

export function isSourceHistory(value: unknown): value is SourceSuggestion[] {
  return (
    Array.isArray(value) &&
    value.length <= 200 &&
    value.every(
      (item) =>
        item &&
        typeof item.id === 'string' &&
        typeof item.title === 'string' &&
        typeof item.url === 'string' &&
        typeof item.note === 'string' &&
        typeof item.createdAt === 'string' &&
        Number.isFinite(Date.parse(item.createdAt)) &&
        !Object.values(validateSource(item.title, item.url, item.note)).some(Boolean)
    )
  );
}
