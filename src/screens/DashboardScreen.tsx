import { useProfileReadiness } from '@/hooks/useProfileReadiness';
import { useFocusEffect, useRouter } from 'expo-router';
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
import { ProductRoadmapTrack } from '@/components/organisms/ProductRoadmapTrack';
import { FeedbackAboutModal } from '@/components/organisms/FeedbackAboutModal';
import { SupportGrantumModal } from '@/components/organisms/SupportGrantumModal';
import { useGrants } from '@/api/hooks/useGrants';
import { useDashboardSummary } from '@/api/hooks/useDashboardSummary';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';
import { useTheme } from '@/hooks/useTheme';
import { SPACING } from '@/config/theme';
import { useLayoutMetrics } from '@/hooks/useLayoutMetrics';
import { ENV } from '@/config/env';
import { DASHBOARD_COPY } from '@/config/copy';
import { shouldShowSupportPopup } from '@/utils/supportPrompt';
import type { Grant } from '@/types/grant';

export default function DashboardScreen() {
  const navigation = useAppNavigation();
  const router = useRouter();
  const profileReadiness = useProfileReadiness();
  const theme = useTheme();
  const { mobile, effectiveWidth } = useLayoutMetrics();
  const [query, setQuery] = useState('');
  const [activityOpen, setActivityOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [focusNowMs, setFocusNowMs] = useState(() => Date.now());
  const grants = useGrants();
  const summary = useDashboardSummary();
  const activeProjectId = useWorkspaceStore((state) => state.activeProjectId);
  const ensureWorkSlot = useWorkspaceStore((state) => state.ensureWorkSlot);
  const hydrated = useWorkspaceStore((state) => state.hydrated);
  const supportPromptDismissedAt = useWorkspaceStore((state) => state.supportPromptDismissedAt);
  const supportPromptSeenInSession = useWorkspaceStore((state) => state.supportPromptSeenInSession);
  const markSupportPromptSeenInSession = useWorkspaceStore(
    (state) => state.markSupportPromptSeenInSession
  );
  const dismissSupportPrompt = useWorkspaceStore((state) => state.dismissSupportPrompt);
  const [selectedGrant, setSelectedGrant] = useState<Grant | null>(null);
  useFocusEffect(
    useCallback(() => {
      setFocusNowMs(Date.now());
    }, [])
  );
  const ready =
    hydrated && !summary.isPending && !grants.isPending && !summary.isError && !grants.isError;
  const supportOpen =
    ready &&
    Boolean(summary.data) &&
    !activityOpen &&
    !feedbackOpen &&
    !selectedGrant &&
    shouldShowSupportPopup({
      dismissedAtIso: supportPromptDismissedAt,
      seenInSession: supportPromptSeenInSession,
      nowMs: focusNowMs,
    });

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
  const greetingText = 'Welcome back, ' + summary.data.greetingName + '.';
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

  const bellButton = (
    <IconButton
      label={DASHBOARD_COPY.notifications}
      onPress={() => setActivityOpen(true)}
      icon={<Bell size={SPACING.lg} color={theme.textMuted} />}
    />
  );

  return (
    <ScreenContainer>
      <View style={styles.content}>
        {mobile ? (
          <View style={styles.mobileHeaderStack}>
            <CenteredHeading title="Your workspace" variant="h1" leading={bellButton} />
            <ProductRoadmapTrack compact />
          </View>
        ) : (
          <View testID="dashboard-hero-band" style={styles.heroBand}>
            <View style={styles.greetingColumn}>
              {bellButton}
              <AppText
                variant={effectiveWidth >= 1024 ? 'display' : 'h1'}
                style={styles.greetingHeading}
              >
                {greetingText}
              </AppText>
            </View>
            <View style={styles.roadmapColumn}>
              <ProductRoadmapTrack />
            </View>
          </View>
        )}
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
        <View testID="dashboard-footer" style={[styles.footer, { borderTopColor: theme.border }]}>
          <AppButton
            size="sm"
            variant="ghost"
            label="Feedback | About us"
            onPress={() => setFeedbackOpen(true)}
          />
        </View>
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
      <FeedbackAboutModal visible={feedbackOpen} onClose={() => setFeedbackOpen(false)} />
      <SupportGrantumModal
        visible={supportOpen}
        onClose={() => markSupportPromptSeenInSession()}
        onRemindLater={() => {
          dismissSupportPrompt(new Date().toISOString());
        }}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { gap: SPACING.lg },
  mobileHeaderStack: { gap: SPACING.md },
  heroBand: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.xl,
  },
  greetingColumn: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  greetingHeading: {
    flex: 1,
    minWidth: 0,
  },
  roadmapColumn: {
    flex: 1.25,
    minWidth: 320,
    maxWidth: 600,
  },
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
  footer: {
    alignItems: 'center',
    justifyContent: 'center',
    borderTopWidth: 1,
    paddingTop: SPACING.md,
    marginTop: SPACING.sm,
  },
});
