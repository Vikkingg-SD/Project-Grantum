import type { Grant } from '@/types/grant';

export function seedExportDoc(grant: Grant): string {
  return `Executive summary\n\n${grant.title} seeks ${grant.amount} — ${grant.summary}`;
}
