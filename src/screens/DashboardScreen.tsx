import React, { useState } from 'react';
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
import { HeroContinueCard } from '@/components/molecules/HeroContinueCard';
import { PipelineFunnelBar } from '@/components/organisms/PipelineFunnelBar';
import { GrantDiscoveryGrid } from '@/components/organisms/GrantDiscoveryGrid';
import { GrantDetailModalSheet } from '@/components/organisms/GrantDetailModalSheet';
import { useGrants } from '@/api/hooks/useGrants';
import { useDashboardSummary } from '@/api/hooks/useDashboardSummary';
import { useDraftStore } from '@/store/useDraftStore';
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
  const grants = useGrants();
  const summary = useDashboardSummary();
  const ensureDraft = useDraftStore((state) => state.ensureDraft);
  const [selectedGrant, setSelectedGrant] = useState<Grant | null>(null);
  const openDraft = (grantId: string) => {
    ensureDraft(grantId);
    setSelectedGrant(null);
    navigation.navigateTo('drafting', grantId);
  };
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
  const filtered = (grants.data ?? []).filter((grant) =>
    `${grant.title} ${grant.funder}`.toLowerCase().includes(query.toLowerCase())
  );
  return (
    <ScreenContainer>
      <View style={styles.content}>
        <View style={styles.row}>
          <View style={[styles.greeting, mobile ? styles.fullWidth : styles.grow]}>
            <IconButton
              label={DASHBOARD_COPY.notifications}
              onPress={() => setActivityOpen(true)}
              icon={<Bell size={SPACING.lg} color={theme.textMuted} />}
            />
            <AppText variant={mobile ? 'h2' : 'display'} style={styles.flexible}>
              {mobile ? 'Your workspace' : 'Welcome back, ' + summary.data.greetingName + '.'}
            </AppText>
          </View>
          <AppButton
            label={DASHBOARD_COPY.newApplication}
            variant="primary"
            onPress={() => navigation.navigateTo('discovery')}
          />
        </View>
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
        <AppText variant="caption" color="muted">
          {ENV.DATA_SOURCE === 'mock'
            ? 'Sample portfolio · Pipeline overview'
            : 'Portfolio overview'}
        </AppText>
        <PipelineFunnelBar stages={summary.data.pipeline} />
        <View style={styles.row}>
          <IconButton
            label={DASHBOARD_COPY.filter}
            onPress={() => navigation.navigateTo('discovery')}
            icon={<Filter size={SPACING.lg} color={theme.textMuted} />}
          />
          <AppText variant="h2" style={styles.flexible}>
            {DASHBOARD_COPY.recommended}
          </AppText>
        </View>
        <AppInput
          accessibilityLabel={DASHBOARD_COPY.search}
          placeholder={DASHBOARD_COPY.search}
          value={query}
          onChangeText={setQuery}
          returnKeyType="search"
        />
        <View style={styles.row}>
          <StatusBadge
            label={ENV.DATA_SOURCE === 'mock' ? 'Sample opportunities' : 'Your opportunities'}
            variant="brand"
          />
          <StatusBadge
            label={'Project profile ' + summary.data.profileCompletionPct + '% done'}
            variant="pending"
          />
          <AppButton
            label={DASHBOARD_COPY.showAll}
            variant="ghost"
            onPress={() => navigation.navigateTo('discovery')}
          />
        </View>
        <GrantDiscoveryGrid
          grants={filtered}
          onSelect={setSelectedGrant}
          onApply={(grant) => openDraft(grant.id)}
        />
      </View>
      <ModalSheetLayout
        visible={activityOpen}
        onClose={() => setActivityOpen(false)}
        accessibilityLabel="Workspace activity"
      >
        <View style={styles.content}>
          <AppText variant="h2">Workspace activity</AppText>
          <AppText>
            {active ? `Active application: ${active.title}` : 'No active application yet.'}
          </AppText>
          <AppText color="muted">
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
        <GrantDetailModalSheet grant={selectedGrant} onApply={(grant) => openDraft(grant.id)} />
      </ModalSheetLayout>
    </ScreenContainer>
  );
}
const styles = StyleSheet.create({
  content: { gap: SPACING.lg },
  greeting: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, minWidth: 0 },
  fullWidth: { width: '100%' },
  grow: { flex: 1 },
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: SPACING.sm },
  flexible: { flexGrow: 1, flexShrink: 1, minWidth: 0 },
});
