import { useWorkspaceStore } from '../src/store/useWorkspaceStore';
import {
  SUPPORT_COOLDOWN_MS,
  formatCooldownRemaining,
  isSupportPromptVisible,
} from '../src/utils/supportPrompt';

const check = (name: string, condition: boolean) => {
  if (!condition) throw new Error(`FAIL: ${name}`);
  console.info(`PASS ${name}`);
};

function main() {
  const baseMs = Date.parse('2026-11-16T20:00:00.000Z');
  check(
    'Given null or invalid dismissal timestamp When checking support prompt visibility Then prompt is visible',
    isSupportPromptVisible(null, baseMs) &&
      isSupportPromptVisible('', baseMs) &&
      isSupportPromptVisible('not-a-date', baseMs)
  );

  const dismissedIso = '2026-11-16T20:00:00.000Z';
  const twoDaysLater = baseMs + 2 * 24 * 60 * 60 * 1000;
  const sevenDaysLater = baseMs + SUPPORT_COOLDOWN_MS;
  check(
    'Given support prompt dismissed When within 7-day cooldown Then prompt stays hidden and reveals after 7 days',
    !isSupportPromptVisible(dismissedIso, twoDaysLater) &&
      formatCooldownRemaining(dismissedIso, twoDaysLater).includes('5 days left') &&
      isSupportPromptVisible(dismissedIso, sevenDaysLater)
  );

  const store = useWorkspaceStore.getState();
  store.dismissSupportPrompt(dismissedIso);
  check(
    'Given workspace store When dismissing and restoring support prompt Then state transitions deterministically',
    useWorkspaceStore.getState().supportPromptDismissedAt === dismissedIso
  );
  store.restoreSupportPrompt();
  check(
    'Given dismissed support prompt When restored Then supportPromptDismissedAt clears to null',
    useWorkspaceStore.getState().supportPromptDismissedAt === null
  );

  const queue = useWorkspaceStore.getState().adminQueue;
  check(
    'Given sample admin queue When inspecting items Then sourceUrl, lastCheckedAt, and failureContext are present',
    queue.length >= 3 &&
      queue.every((item) => Boolean(item.sourceUrl && item.lastCheckedAt && item.failureContext))
  );
}

main();
