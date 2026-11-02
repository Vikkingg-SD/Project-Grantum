import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Bell, Filter } from 'lucide-react-native';
import { useRouter } from 'expo-router';
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
import { useUIStore } from '@/store/useUIStore';
import { useDraftStore } from '@/store/useDraftStore';
import { useTheme } from '@/hooks/useTheme';
import { SPACING } from '@/config/theme';
import { DASHBOARD_COPY } from '@/config/copy';
import type { Grant } from '@/types/grant';

export default function DashboardScreen() {
  const router = useRouter();
  const theme = useTheme();
  const [query, setQuery] = useState('');
  const grants = useGrants();
  const summary = useDashboardSummary();
  const setActiveGrantId = useUIStore((state) => state.setActiveGrantId);
  const ensureDraft = useDraftStore((state) => state.ensureDraft);
  const [selectedGrant, setSelectedGrant] = useState<Grant | null>(null);
  const openDraft = (grantId: string) => {
    setActiveGrantId(grantId);
    ensureDraft(grantId);
    setSelectedGrant(null);
    router.push('/(tabs)/drafting');
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
          <IconButton
            label={DASHBOARD_COPY.notifications}
            disabled
            onPress={() => undefined}
            icon={<Bell size={SPACING.lg} color={theme.textMuted} />}
          />
          <AppText variant="display" style={styles.flexible}>
            {'Good morning, ' + summary.data.greetingName + '.'}
          </AppText>
          <AppButton
            label={DASHBOARD_COPY.newApplication}
            variant="primary"
            onPress={() => {
              const grantId = active?.grantId ?? grants.data?.[0]?.id;
              if (grantId) openDraft(grantId);
              else router.push('/(tabs)/discovery');
            }}
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
            onStartNew={() => router.push('/(tabs)/discovery')}
          />
        )}
        <PipelineFunnelBar stages={summary.data.pipeline} />
        <View style={styles.row}>
          <IconButton
            label={DASHBOARD_COPY.filter}
            disabled
            onPress={() => undefined}
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
          <StatusBadge label={DASHBOARD_COPY.liveMatching} variant="brand" />
          <StatusBadge
            label={'Project profile ' + summary.data.profileCompletionPct + '% done'}
            variant="pending"
          />
          <AppButton
            label={DASHBOARD_COPY.showAll}
            variant="ghost"
            onPress={() => router.push('/(tabs)/discovery')}
          />
        </View>
        <GrantDiscoveryGrid
          grants={filtered}
          onSelect={setSelectedGrant}
          onApply={(grant) => openDraft(grant.id)}
        />
      </View>
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
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: SPACING.sm },
  flexible: { flexShrink: 1, minWidth: 0 },
});
