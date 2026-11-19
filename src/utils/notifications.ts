export type NotificationDestination = 'my-works' | 'project-profile' | 'project-team' | 'discovery';

export interface WorkspaceNotificationEvent {
  id: string;
  key: 'sync' | 'readiness' | 'roles' | 'deadlines';
  title: string;
  body: string;
  action: string;
  destination: NotificationDestination;
}

export interface DeriveWorkspaceNotificationsInput {
  activeProjectId: string;
  outOfSyncCount: number;
  profileReadinessScore: number;
  grantCount: number;
}

export function formatNotificationBadge(count: number): string | null {
  if (!Number.isFinite(count) || count <= 0) return null;
  const whole = Math.floor(count);
  if (whole <= 0) return null;
  return whole > 99 ? '99+' : String(whole);
}

export function deriveWorkspaceNotifications(
  input: DeriveWorkspaceNotificationsInput
): WorkspaceNotificationEvent[] {
  const projectId = input.activeProjectId.trim() || 'project-1';
  const outOfSyncCount = Math.max(0, Math.floor(input.outOfSyncCount));
  const readiness = Math.max(0, Math.min(100, Math.round(input.profileReadinessScore)));
  const grantCount = Math.max(0, Math.floor(input.grantCount));

  return [
    {
      id: `notif:workspace:sync:${outOfSyncCount}`,
      key: 'sync',
      title: 'Profile sync',
      body:
        outOfSyncCount > 0
          ? `${outOfSyncCount} application work ${outOfSyncCount === 1 ? 'slot has' : 'slots have'} a newer Project Profile revision ready to pull.`
          : 'My Works shows when a newer Project Profile revision can be pulled into a work slot.',
      action: 'Open My Works',
      destination: 'my-works',
    },
    {
      id: `notif:${projectId}:readiness:${readiness}`,
      key: 'readiness',
      title: 'Readiness and match',
      body: `Profile ${readiness}% done. Open it to see what sits behind each match.`,
      action: 'Open Project Profile',
      destination: 'project-profile',
    },
    {
      id: `notif:${projectId}:roles`,
      key: 'roles',
      title: 'Co-work roles',
      body: 'Review who can edit, review or view each work slot.',
      action: 'Open project team',
      destination: 'project-team',
    },
    {
      id: `notif:catalog:deadlines:${grantCount}`,
      key: 'deadlines',
      title: 'Deadlines',
      body: `${grantCount} ${grantCount === 1 ? 'opportunity' : 'opportunities'} tracked in the catalog.`,
      action: 'View deadlines',
      destination: 'discovery',
    },
  ];
}

export function isNotificationUnread(eventId: string, readIds: readonly string[]): boolean {
  return !readIds.includes(eventId);
}

export function countUnreadNotifications(
  events: readonly Pick<WorkspaceNotificationEvent, 'id'>[],
  readIds: readonly string[]
): number {
  const readSet = new Set(readIds);
  return events.filter((event) => !readSet.has(event.id)).length;
}

export function acknowledgeNotificationId(readIds: readonly string[], eventId: string): string[] {
  const clean = eventId.trim();
  if (!clean) return [...readIds];
  if (readIds.includes(clean)) return [...readIds];
  return [clean, ...readIds].slice(0, 200);
}

export function isNotificationReadIdList(value: unknown): value is string[] {
  return (
    Array.isArray(value) &&
    value.length <= 200 &&
    value.every((item) => typeof item === 'string' && item.trim().length > 0 && item.length <= 160)
  );
}
