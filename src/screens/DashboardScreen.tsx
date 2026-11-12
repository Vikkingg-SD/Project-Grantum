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
import { StatusBadge } from '@/components/atoms/StatusBadge';
import { CenteredHeading } from '@/components/molecules/CenteredHeading';
import { HeroContinueCard } from '@/components/molecules/HeroContinueCard';
import { PipelineFunnelBar } from '@/components/organisms/PipelineFunnelBar';
import { GrantDiscoveryGrid } from '@/components/organisms/GrantDiscoveryGrid';
import { GrantDetailModalSheet } from '@/components/organisms/GrantDetailModalSheet';
import { WorkspaceStudioBar } from '@/components/organisms/WorkspaceStudioModals';
import { useGrants } from '@/api/hooks/useGrants';
import { useDashboardSummary } from '@/api/hooks/useDashboardSummary';
import { useDraftStore } from '@/store/useDraftStore';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';
import { useTheme } from '@/hooks/useTheme';
import { SPACING } from '@/config/theme';
import { useLayoutMetrics } from '@/hooks/useLayoutMetrics';
import { ENV } from '@/config/env';
import { DASHBOARD_COPY } from '@/config/copy';
import type { Grant } from '@/types/grant';

export default function DashboardScreen() {
  const navigation = useAppNavigation();
  const theme = useTheme();
  const { mobile } = useLayoutMetrics();
  const [query, setQuery] = useState('');
  const [activityOpen, setActivityOpen] = useState(false);
  const [externalModal, setExternalModal] = useState<'profile' | 'works' | 'admin' | null>(null);
  const grants = useGrants();
  const summary = useDashboardSummary();
  const ensureDraft = useDraftStore((state) => state.ensureDraft);
  const activeProjectId = useWorkspaceStore((state) => state.activeProjectId);
  const ensureWorkSlot = useWorkspaceStore((state) => state.ensureWorkSlot);
  const [selectedGrant, setSelectedGrant] = useState<Grant | null>(null);
  const openDraft = useCallback(
    (grantId: string, projectId = activeProjectId) => {
      ensureDraft(grantId);
      ensureWorkSlot(projectId, grantId);
      setSelectedGrant(null);
      navigation.navigateTo('drafting', grantId);
    },
    [activeProjectId, ensureDraft, ensureWorkSlot, navigation]
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
        <WorkspaceStudioBar
          grants={grants.data ?? []}
          onOpenGrantDraft={(grantId, projectId) => openDraft(grantId, projectId)}
          externalModal={externalModal}
          onCloseExternalModal={() => setExternalModal(null)}
        />
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
          <StatusBadge
            label={'Profile ' + summary.data.profileCompletionPct + '% done'}
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
            setExternalModal('profile');
          }}
        />
      </ModalSheetLayout>
    </ScreenContainer>
  );
}
const styles = StyleSheet.create({
  content: { gap: SPACING.lg },
  modalBody: { padding: SPACING.lg, gap: SPACING.lg },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.sm,
  },
  profile: { alignSelf: 'center', flexShrink: 1 },
});
