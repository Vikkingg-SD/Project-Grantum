import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenContainer } from '@/components/templates/ScreenContainer';
import { EmptyStateLayout } from '@/components/templates/EmptyStateLayout';
import { ModalSheetLayout } from '@/components/templates/ModalSheetLayout';
import { AppText } from '@/components/atoms/AppText';
import { HeroContinueCard } from '@/components/molecules/HeroContinueCard';
import { PipelineFunnelBar } from '@/components/organisms/PipelineFunnelBar';
import { GrantDiscoveryGrid } from '@/components/organisms/GrantDiscoveryGrid';
import { GrantDetailModalSheet } from '@/components/organisms/GrantDetailModalSheet';
import { useGrants } from '@/api/hooks/useGrants';
import { useDashboardSummary } from '@/api/hooks/useDashboardSummary';
import { useUIStore } from '@/store/useUIStore';
import { useDraftStore } from '@/store/useDraftStore';
import { SPACING } from '@/config/theme';
import type { Grant } from '@/types/grant';

export default function DashboardScreen() {
  const router = useRouter();
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
  return (
    <ScreenContainer>
      <View style={styles.content}>
        <View>
          <AppText variant="display">{'Good morning, ' + summary.data.greetingName + '.'}</AppText>
          <AppText variant="caption" color="muted">
            Grantum Autonomous Capital Allocation Terminal
          </AppText>
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
        <AppText variant="h2">Recommended Opportunities</AppText>
        {grants.data?.length ? (
          <GrantDiscoveryGrid
            grants={grants.data}
            onSelect={setSelectedGrant}
            onApply={(grant) => openDraft(grant.id)}
          />
        ) : (
          <EmptyStateLayout
            title="No opportunities found"
            description="There are no matching opportunities available."
          />
        )}
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
const styles = StyleSheet.create({ content: { gap: SPACING.lg } });
