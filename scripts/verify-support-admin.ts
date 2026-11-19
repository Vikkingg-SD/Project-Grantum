import { useWorkspaceStore } from '../src/store/useWorkspaceStore';
import {
  SUPPORT_COOLDOWN_DAYS,
  SUPPORT_COOLDOWN_MS,
  formatCooldownRemaining,
  isSupportPromptVisible,
  shouldShowSupportPopup,
} from '../src/utils/supportPrompt';
import {
  CURRENT_ROADMAP_STAGE_ID,
  PRODUCT_ROADMAP_STAGES,
  ROADMAP_PULSE_DURATION_MS,
  getCoveredProgressRatio,
  getDefaultRoadmapStageId,
} from '../src/utils/productRoadmap';
import {
  acknowledgeNotificationId,
  countUnreadNotifications,
  deriveWorkspaceNotifications,
  formatNotificationBadge,
  isNotificationReadIdList,
} from '../src/utils/notifications';

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
  const justBeforeThreeDays = baseMs + SUPPORT_COOLDOWN_MS - 1;
  const threeDaysLater = baseMs + SUPPORT_COOLDOWN_MS;
  check(
    'Given support prompt dismissed When within 3-day (72h) cooldown Then prompt stays hidden and reveals at 72h',
    SUPPORT_COOLDOWN_DAYS === 3 &&
      SUPPORT_COOLDOWN_MS === 3 * 24 * 60 * 60 * 1000 &&
      !isSupportPromptVisible(dismissedIso, twoDaysLater) &&
      !isSupportPromptVisible(dismissedIso, justBeforeThreeDays) &&
      formatCooldownRemaining(dismissedIso, twoDaysLater).includes('1 day left in 3-day') &&
      isSupportPromptVisible(dismissedIso, threeDaysLater)
  );

  check(
    'Given fresh dashboard entry vs repeat render in session When checking popup visibility Then popup triggers once per fresh session when not snoozed',
    shouldShowSupportPopup({ dismissedAtIso: null, seenInSession: false, nowMs: baseMs }) &&
      !shouldShowSupportPopup({ dismissedAtIso: null, seenInSession: true, nowMs: baseMs }) &&
      !shouldShowSupportPopup({
        dismissedAtIso: dismissedIso,
        seenInSession: false,
        nowMs: twoDaysLater,
      }) &&
      shouldShowSupportPopup({
        dismissedAtIso: dismissedIso,
        seenInSession: false,
        nowMs: threeDaysLater,
      })
  );

  const store = useWorkspaceStore.getState();
  store.dismissSupportPrompt(dismissedIso);
  check(
    'Given workspace store When dismissing and restoring support prompt Then state transitions deterministically',
    useWorkspaceStore.getState().supportPromptDismissedAt === dismissedIso &&
      useWorkspaceStore.getState().supportPromptSeenInSession === true
  );
  store.restoreSupportPrompt();
  check(
    'Given dismissed support prompt When restored Then supportPromptDismissedAt clears and session resets',
    useWorkspaceStore.getState().supportPromptDismissedAt === null &&
      useWorkspaceStore.getState().supportPromptSeenInSession === false
  );

  store.setLaunchTourEnabled(false);
  check(
    'Given personal settings When turning onboarding slides off and on Then launchTourCompleted persists both directions',
    useWorkspaceStore.getState().launchTourCompleted === true
  );
  store.setLaunchTourEnabled(true);
  check(
    'Given onboarding disabled When re-enabled Then launchTourCompleted resets to false',
    useWorkspaceStore.getState().launchTourCompleted === false
  );

  const betaStage = PRODUCT_ROADMAP_STAGES.find((stage) => stage.id === CURRENT_ROADMAP_STAGE_ID);
  check(
    'Given product roadmap stages When deriving active progress Then beta is selected with 5s pulse and valid covered ratio',
    getDefaultRoadmapStageId() === 'beta' &&
      betaStage?.headline === 'Beta is conducted, release coming soon' &&
      ROADMAP_PULSE_DURATION_MS === 5000 &&
      getCoveredProgressRatio() === 0.5
  );

  const queue = useWorkspaceStore.getState().adminQueue;
  check(
    'Given staff admin queue When inspecting items Then sourceUrl, lastCheckedAt, and failureContext are present',
    queue.length >= 3 &&
      queue.every((item) => Boolean(item.sourceUrl && item.lastCheckedAt && item.failureContext))
  );

  check(
    'Given notification counts 0, 1, 99, 100 When formatting badge Then 0 hides badge and 100 saturates to 99+',
    formatNotificationBadge(-2) === null &&
      formatNotificationBadge(0) === null &&
      formatNotificationBadge(1) === '1' &&
      formatNotificationBadge(99) === '99' &&
      formatNotificationBadge(100) === '99+' &&
      formatNotificationBadge(240) === '99+'
  );

  const notifEvents = deriveWorkspaceNotifications({
    activeProjectId: 'project-1',
    outOfSyncCount: 1,
    profileReadinessScore: 92,
    grantCount: 3,
  });
  let readIds: string[] = [];
  check(
    'Given 4 workspace notifications When unread Then count is 4 and acknowledging each idempotently reaches 0',
    notifEvents.length === 4 && countUnreadNotifications(notifEvents, readIds) === 4
  );
  readIds = acknowledgeNotificationId(readIds, notifEvents[0].id);
  readIds = acknowledgeNotificationId(readIds, notifEvents[0].id);
  check(
    'Given duplicate acknowledgement When processed Then unread count decrements exactly once',
    readIds.length === 1 && countUnreadNotifications(notifEvents, readIds) === 3
  );
  for (const evt of notifEvents) readIds = acknowledgeNotificationId(readIds, evt.id);
  check(
    'Given all notifications clicked through When counted Then unread count reaches 0 and badge hides',
    countUnreadNotifications(notifEvents, readIds) === 0 &&
      formatNotificationBadge(countUnreadNotifications(notifEvents, readIds)) === null &&
      isNotificationReadIdList(readIds)
  );

  store.acknowledgeNotification(notifEvents[0].id);
  store.acknowledgeNotification(notifEvents[0].id);
  check(
    'Given workspace store When acknowledging a notification event Then readNotificationIds stores it idempotently',
    useWorkspaceStore.getState().readNotificationIds.filter((id) => id === notifEvents[0].id)
      .length === 1
  );

  // Regression: global sync notification ID must stay stable when switching active project.
  const notifProject2 = deriveWorkspaceNotifications({
    activeProjectId: 'project-2',
    outOfSyncCount: 1,
    profileReadinessScore: 100,
    grantCount: 3,
  });
  check(
    'Given global sync notification When switching active project Then sync event ID stays workspace-scoped',
    notifEvents[0].id === 'notif:workspace:sync:1' && notifProject2[0].id === notifEvents[0].id
  );

  // Regression: acknowledging a 201st notification must still record and roll the 200-item history window.
  for (let i = 0; i < 205; i++) {
    useWorkspaceStore.getState().acknowledgeNotification(`notif:history:${i}`);
  }
  const latestReadIds = useWorkspaceStore.getState().readNotificationIds;
  check(
    'Given 200 acknowledged notifications When acknowledging the 205th Then the new ID is recorded and list stays capped at 200',
    latestReadIds.length === 200 &&
      latestReadIds[0] === 'notif:history:204' &&
      isNotificationReadIdList(latestReadIds)
  );
}

main();
