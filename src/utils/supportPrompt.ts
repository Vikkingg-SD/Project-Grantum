export const SUPPORT_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;

export function isSupportPromptVisible(
  dismissedAtIso: string | null | undefined,
  nowMs = Date.now()
): boolean {
  if (!dismissedAtIso || !dismissedAtIso.trim()) return true;
  const dismissedMs = Date.parse(dismissedAtIso);
  if (!Number.isFinite(dismissedMs)) return true;
  return nowMs - dismissedMs >= SUPPORT_COOLDOWN_MS;
}

export function formatCooldownRemaining(
  dismissedAtIso: string | null | undefined,
  nowMs = Date.now()
): string {
  if (!dismissedAtIso) return '';
  const dismissedMs = Date.parse(dismissedAtIso);
  if (!Number.isFinite(dismissedMs)) return '';
  const elapsedMs = Math.max(0, nowMs - dismissedMs);
  const remainingMs = SUPPORT_COOLDOWN_MS - elapsedMs;
  if (remainingMs <= 0) return 'Support reminder ready to show again.';
  const daysLeft = Math.max(1, Math.min(7, Math.ceil(remainingMs / (24 * 60 * 60 * 1000))));
  return `Support note snoozed (${daysLeft} day${daysLeft === 1 ? '' : 's'} left in 7-day cooldown).`;
}
