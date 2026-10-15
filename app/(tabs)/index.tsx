import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenContainer } from '@/components/templates/ScreenContainer';
import { AppText } from '@/components/atoms/AppText';
import { HeroContinueCard } from '@/components/molecules/HeroContinueCard';
import { PipelineFunnelBar } from '@/components/organisms/PipelineFunnelBar';
import { GrantDiscoveryGrid } from '@/components/organisms/GrantDiscoveryGrid';
import { GrantDetailModalSheet } from '@/components/organisms/GrantDetailModalSheet';
import { useGrants } from '@/api/hooks/useGrants';
import { useUIStore } from '@/store/useUIStore';
import { useDraftStore } from '@/store/useDraftStore';
import { Grant } from '@/types/grant';

export default function DashboardScreen() {
  const router = useRouter();
  const { data: grants = [] } = useGrants();
  const { setActiveGrantId } = useUIStore();
  const { resetDraftForGrant } = useDraftStore();
  const [selectedGrant, setSelectedGrant] = useState<Grant | null>(null);

  const activeGrant = grants[0] ?? {
    id: '1',
    title: 'Climate Resilience Infrastructure',
    funder: 'Northstar Foundation',
  };

  const handleApply = (grant: Grant) => {
    setActiveGrantId(grant.id);
    resetDraftForGrant(grant.id, grant.title, grant.funder);
    setSelectedGrant(null);
    router.push('/(tabs)/drafting');
  };

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <AppText variant="display">Good morning, Alex.</AppText>
        <AppText variant="caption" color="muted">
          Grantum Autonomous Capital Allocation Terminal
        </AppText>
      </View>

      <HeroContinueCard
        projectTitle={activeGrant.title}
        completionPct={42}
        onResume={() => router.push('/(tabs)/drafting')}
      />

      <PipelineFunnelBar
        stages={[
          { label: 'Discovery', count: 24 },
          { label: 'Pre-screen', count: 8 },
          { label: 'Draft', count: 3 },
          { label: 'Audit', count: 2 },
          { label: 'Ready', count: 1 },
          { label: 'Awarded', count: 1 },
        ]}
      />

      <View style={styles.section}>
        <AppText variant="h2" style={styles.sectionTitle}>
          Recommended Opportunities
        </AppText>
        <GrantDiscoveryGrid
          grants={grants}
          onSelect={(grant) => setSelectedGrant(grant)}
          onApply={handleApply}
        />
      </View>

      <GrantDetailModalSheet
        grant={selectedGrant}
        visible={Boolean(selectedGrant)}
        onClose={() => setSelectedGrant(null)}
        onApply={handleApply}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    marginBottom: 16,
  },
  section: {
    marginTop: 20,
  },
  sectionTitle: {
    marginBottom: 12,
  },
});
