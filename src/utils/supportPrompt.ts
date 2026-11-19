export const SUPPORT_COOLDOWN_DAYS = 3;
export const SUPPORT_COOLDOWN_MS = SUPPORT_COOLDOWN_DAYS * 24 * 60 * 60 * 1000;

export function isSupportPromptVisible(
  dismissedAtIso: string | null | undefined,
  nowMs = Date.now()
): boolean {
  if (!dismissedAtIso || !dismissedAtIso.trim()) return true;
  const dismissedMs = Date.parse(dismissedAtIso);
  if (!Number.isFinite(dismissedMs)) return true;
  return nowMs - dismissedMs >= SUPPORT_COOLDOWN_MS;
}

export function shouldShowSupportPopup({
  dismissedAtIso,
  seenInSession,
  nowMs = Date.now(),
}: {
  dismissedAtIso: string | null | undefined;
  seenInSession: boolean;
  nowMs?: number;
}): boolean {
  if (seenInSession) return false;
  return isSupportPromptVisible(dismissedAtIso, nowMs);
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
  const daysLeft = Math.max(
    1,
    Math.min(SUPPORT_COOLDOWN_DAYS, Math.ceil(remainingMs / (24 * 60 * 60 * 1000)))
  );
  return `Support reminder snoozed (${daysLeft} day${daysLeft === 1 ? '' : 's'} left in ${SUPPORT_COOLDOWN_DAYS}-day cooldown).`;
}
