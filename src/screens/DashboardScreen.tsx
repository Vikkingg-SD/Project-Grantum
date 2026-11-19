import { useProfileReadiness } from '@/hooks/useProfileReadiness';
import { usePathname, useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import Bell from 'lucide-react-native/icons/bell';
import Filter from 'lucide-react-native/icons/funnel';
import { useAppNavigation } from '@/hooks/useAppNavigation';
import { ScreenContainer } from '@/components/templates/ScreenContainer';
import { EmptyStateLayout } from '@/components/templates/EmptyStateLayout';
import { ModalSheetLayout } from '@/components/templates/ModalSheetLayout';
import { AppText } from '@/components/atoms/AppText';
import { AppButton } from '@/components/atoms/AppButton';
import { AppInput } from '@/components/atoms/AppInput';
import { IconButton } from '@/components/atoms/IconButton';
import { PressableBadge } from '@/components/molecules/PressableBadge';
import { CenteredHeading } from '@/components/molecules/CenteredHeading';
import { HeroContinueCard } from '@/components/molecules/HeroContinueCard';
import { PipelineFunnelBar } from '@/components/organisms/PipelineFunnelBar';
import { GrantDiscoveryGrid } from '@/components/organisms/GrantDiscoveryGrid';
import { GrantDetailModalSheet } from '@/components/organisms/GrantDetailModalSheet';
import { WorkspaceStudioBar } from '@/components/organisms/WorkspaceStudioBar';
import { useGrants } from '@/api/hooks/useGrants';
import { useDashboardSummary } from '@/api/hooks/useDashboardSummary';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';
import { useTheme } from '@/hooks/useTheme';
import { RADIUS, SPACING } from '@/config/theme';
import { useLayoutMetrics } from '@/hooks/useLayoutMetrics';
import { ENV } from '@/config/env';
import { DASHBOARD_COPY } from '@/config/copy';
import { formatCooldownRemaining, isSupportPromptVisible } from '@/utils/supportPrompt';
import type { Grant } from '@/types/grant';

export default function DashboardScreen() {
  const navigation = useAppNavigation();
  const router = useRouter();
  const pathname = usePathname();
  const profileReadiness = useProfileReadiness();
  const theme = useTheme();
  const { mobile } = useLayoutMetrics();
  const [query, setQuery] = useState('');
  const [activityOpen, setActivityOpen] = useState(false);
  const grants = useGrants();
  const summary = useDashboardSummary();
  const activeProjectId = useWorkspaceStore((state) => state.activeProjectId);
  const ensureWorkSlot = useWorkspaceStore((state) => state.ensureWorkSlot);
  const supportPromptDismissedAt = useWorkspaceStore((state) => state.supportPromptDismissedAt);
  const dismissSupportPrompt = useWorkspaceStore((state) => state.dismissSupportPrompt);
  const restoreSupportPrompt = useWorkspaceStore((state) => state.restoreSupportPrompt);
  const [cooldownNowMs, setCooldownNowMs] = useState(() => Date.now());
  const [selectedGrant, setSelectedGrant] = useState<Grant | null>(null);
  const openDraft = useCallback(
    (grantId: string, projectId = activeProjectId) => {
      ensureWorkSlot(projectId, grantId);
      setSelectedGrant(null);
      navigation.navigateTo('drafting', grantId);
    },
    [activeProjectId, ensureWorkSlot, navigation]
  );
  const applyGrant = useCallback((grant: Grant) => openDraft(grant.id), [openDraft]);
  const filtered = useMemo(() => {
    const normalized = query.toLowerCase();
    return (grants.data ?? []).filter((grant) =>
      `${grant.title} ${grant.funder}`.toLowerCase().includes(normalized)
    );
  }, [grants.data, query]);
  if (summary.isPending || grants.isPending || summary.isError || grants.isError || !summary.data) {
    const error = summary.error ?? grants.error;
    return (
      <ScreenContainer>
        <EmptyStateLayout
          title={error ? 'Instrument fault' : 'Calibrating instrument…'}
          description={error?.message ?? 'Loading your opportunities.'}
          ctaLabel={error ? 'Try again' : undefined}
          onCtaPress={() => {
            void summary.refetch();
            void grants.refetch();
          }}
        />
      </ScreenContainer>
    );
  }
  const active = summary.data.activeDraft;
  const inboxItems = [
    {
      key: 'sync',
      title: 'Profile sync',
      body: 'My Works shows when a newer Project Profile revision can be pulled into a work slot.',
      action: 'Open My Works',
      run: () => router.push('/my-works'),
    },
    {
      key: 'readiness',
      title: 'Readiness and match',
      body: `Profile ${profileReadiness?.score ?? 0}% done. Open it to see what sits behind each match.`,
      action: 'Open Project Profile',
      run: () => router.push('/project-profile'),
    },
    {
      key: 'roles',
      title: 'Co-work roles',
      body: 'Review who can edit, review or view each work slot.',
      action: 'Open project team',
      run: () => router.push('/project-profile'),
    },
    {
      key: 'deadlines',
      title: 'Deadlines',
      body: `${grants.data?.length ?? 0} opportunities tracked in the catalog.`,
      action: 'View deadlines',
      run: () => navigation.navigateTo('discovery'),
    },
  ];
  return (
    <ScreenContainer>
      <View style={styles.content}>
        <CenteredHeading
          title={mobile ? 'Your workspace' : 'Welcome back, ' + summary.data.greetingName + '.'}
          variant={mobile ? 'h1' : 'display'}
          leading={
            <IconButton
              label={DASHBOARD_COPY.notifications}
              onPress={() => setActivityOpen(true)}
              icon={<Bell size={SPACING.lg} color={theme.textMuted} />}
            />
          }
        />
        {active ? (
          <HeroContinueCard
            projectTitle={active.title}
            completionPct={active.completionPct}
            onResume={() => openDraft(active.grantId)}
          />
        ) : (
          <HeroContinueCard
            variant="no-session"
            onStartNew={() => navigation.navigateTo('discovery')}
          />
        )}
        <AppText variant="caption" color="muted" align="center">
          {ENV.DATA_SOURCE === 'mock'
            ? 'Sample portfolio · Pipeline overview'
            : 'Portfolio overview'}
        </AppText>
        <PipelineFunnelBar stages={summary.data.pipeline} />
        <WorkspaceStudioBar />
        <CenteredHeading
          title={DASHBOARD_COPY.recommended}
          variant="h2"
          leading={
            <IconButton
              label={DASHBOARD_COPY.filter}
              onPress={() => navigation.navigateTo('discovery')}
              icon={<Filter size={SPACING.lg} color={theme.textMuted} />}
            />
          }
        />
        <AppInput
          accessibilityLabel={DASHBOARD_COPY.search}
          placeholder={DASHBOARD_COPY.search}
          value={query}
          onChangeText={setQuery}
          returnKeyType="search"
        />
        <View style={styles.summaryRow}>
          <PressableBadge
            label={'Profile ' + (profileReadiness?.score ?? 0) + '% done'}
            actionLabel="Open project profile"
            onPress={() => router.push('/project-profile')}
            style={styles.profile}
            variant="pending"
          />
          <AppButton
            label={DASHBOARD_COPY.showAll}
            variant="ghost"
            onPress={() => navigation.navigateTo('discovery')}
          />
        </View>
        <GrantDiscoveryGrid grants={filtered} onSelect={setSelectedGrant} onApply={applyGrant} />
        {isSupportPromptVisible(supportPromptDismissedAt, cooldownNowMs) ? (
          <View
            style={[
              styles.supportCard,
              { backgroundColor: theme.surface, borderColor: theme.border },
            ]}
          >
            <AppText variant="h3">Support &amp; shape Grantum</AppText>
            <AppText variant="caption" color="muted">
              Tell us what slows your applications down, inspect our roadmap, or review proposed
              plans. No subscription is required to browse sample grants.
            </AppText>
            <AppText variant="caption" selectable>
              suggestions_grantum@gmail.com
            </AppText>
            <View style={styles.supportActions}>
              <AppButton
                size="sm"
                variant="outline"
                label="Roadmap and feedback"
                onPress={() => router.push('/roadmap')}
              />
              <AppButton
                size="sm"
                variant="outline"
                label="Subscriptions & plans"
                onPress={() => router.push({ pathname: '/plans', params: { returnTo: pathname } })}
              />
              <AppButton
                size="sm"
                variant="ghost"
                label="Remind me in 7 days"
                onPress={() => {
                  const now = Date.now();
                  setCooldownNowMs(now);
                  dismissSupportPrompt(new Date(now).toISOString());
                }}
              />
            </View>
          </View>
        ) : (
          <View style={styles.supportSnoozed}>
            <AppText variant="caption" color="muted" align="center">
              {formatCooldownRemaining(supportPromptDismissedAt, cooldownNowMs)}
            </AppText>
            <View style={styles.supportActions}>
              <AppButton
                size="sm"
                label="Roadmap and feedback"
                variant="ghost"
                onPress={() => router.push('/roadmap')}
              />
              <AppButton
                size="sm"
                label="Subscriptions & plans"
                variant="ghost"
                onPress={() => router.push({ pathname: '/plans', params: { returnTo: pathname } })}
              />
              <AppButton
                size="sm"
                label="Show support note"
                variant="ghost"
                onPress={restoreSupportPrompt}
              />
            </View>
          </View>
        )}
      </View>
      <ModalSheetLayout
        visible={activityOpen}
        onClose={() => setActivityOpen(false)}
        accessibilityLabel="Workspace activity"
      >
        <View style={styles.modalBody}>
          <AppText variant="h2" align="center">
            Workspace activity
          </AppText>
          <AppText align="center">
            {active ? `Active application: ${active.title}` : 'No active application yet.'}
          </AppText>
          <View style={styles.inbox}>
            {inboxItems.map((item, index) => (
              <View
                key={item.key}
                style={[
                  styles.inboxRow,
                  index > 0 && { borderTopWidth: 1, borderTopColor: theme.border },
                ]}
              >
                <View style={styles.inboxText}>
                  <AppText variant="label">{item.title}</AppText>
                  <AppText variant="caption" color="muted">
                    {item.body}
                  </AppText>
                </View>
                <AppButton
                  size="sm"
                  variant="outline"
                  label={item.action}
                  onPress={() => {
                    setActivityOpen(false);
                    item.run();
                  }}
                />
              </View>
            ))}
          </View>
          <AppText color="muted" align="center">
            {ENV.DATA_SOURCE === 'mock'
              ? 'You are viewing sample data. Live notifications are not connected.'
              : 'Live notifications are not available in this workspace.'}
          </AppText>
          <AppButton label="Close activity" onPress={() => setActivityOpen(false)} />
        </View>
      </ModalSheetLayout>
      <ModalSheetLayout
        visible={Boolean(selectedGrant)}
        onClose={() => setSelectedGrant(null)}
        accessibilityLabel={selectedGrant?.title ?? ''}
      >
        <GrantDetailModalSheet
          grant={selectedGrant}
          onApply={applyGrant}
          onOpenProfile={() => {
            setSelectedGrant(null);
            router.push('/project-profile');
          }}
        />
      </ModalSheetLayout>
    </ScreenContainer>
  );
}
const styles = StyleSheet.create({
  content: { gap: SPACING.lg },
  modalBody: { padding: SPACING.lg, gap: SPACING.lg },
  inbox: { alignSelf: 'stretch' },
  inboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.md,
    paddingVertical: SPACING.md,
  },
  inboxText: { flex: 1, minWidth: 0, gap: SPACING.xs },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.sm,
  },
  profile: { alignSelf: 'center', flexShrink: 1 },
  supportCard: {
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    gap: SPACING.sm,
  },
  supportSnoozed: {
    alignItems: 'center',
    gap: SPACING.xs,
  },
  supportActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: SPACING.sm,
  },
});
