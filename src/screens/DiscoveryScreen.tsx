import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { View, StyleSheet } from 'react-native';
import { useAppNavigation } from '@/hooks/useAppNavigation';
import { ScreenContainer } from '@/components/templates/ScreenContainer';
import { EmptyStateLayout } from '@/components/templates/EmptyStateLayout';
import { ModalSheetLayout } from '@/components/templates/ModalSheetLayout';
import { AppText } from '@/components/atoms/AppText';
import { AppButton } from '@/components/atoms/AppButton';
import { AppInput } from '@/components/atoms/AppInput';
import { StatusBadge } from '@/components/atoms/StatusBadge';
import { FilterFieldGroup } from '@/components/molecules/FilterFieldGroup';
import { GrantDiscoveryGrid } from '@/components/organisms/GrantDiscoveryGrid';
import { GrantDetailModalSheet } from '@/components/organisms/GrantDetailModalSheet';
import { useGrants } from '@/api/hooks/useGrants';
import { getDataSource } from '@/api/dataSource';
import { ENV } from '@/config/env';
import { MAX_INPUT_CHARS } from '@/config/constants';
import type { BountyInput } from '@/types/api';
import { useDashboardSummary } from '@/api/hooks/useDashboardSummary';
import { useDraftStore } from '@/store/useDraftStore';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { SPACING } from '@/config/theme';
import type { Grant } from '@/types/grant';

export default function DiscoveryScreen() {
  const navigation = useAppNavigation();
  const wide = useBreakpoint() !== 'mobile';
  const [query, setQuery] = useState('');
  const [regions, setRegions] = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedGrant, setSelectedGrant] = useState<Grant | null>(null);
  const [bountyTitle, setBountyTitle] = useState('');
  const bounty = useMutation({
    mutationFn: (input: BountyInput) => getDataSource().submitBounty(input),
  });
  const bountyNote = `Search: ${query}; Regions: ${regions.join(', ')}; Types: ${categories.join(', ')}`;
  const currentBounty =
    bounty.variables?.title === bountyTitle.trim() && bounty.variables.note === bountyNote;
  const grants = useGrants({ q: query, region: regions, category: categories });
  const summary = useDashboardSummary();
  const ensureDraft = useDraftStore((state) => state.ensureDraft);
  const toggle = (items: string[], value: string) =>
    items.includes(value) ? items.filter((item) => item !== value) : [...items, value];
  const openDraft = (grant: Grant) => {
    ensureDraft(grant.id);
    setSelectedGrant(null);
    navigation.navigateTo('drafting', grant.id);
  };
  return (
    <ScreenContainer>
      <View style={styles.content}>
        <AppText variant="h1">Grant Match-Making</AppText>
        {summary.data && (
          <StatusBadge
            label={'Project profile ' + summary.data.profileCompletionPct + '% Done'}
            variant={summary.data.profileCompletionPct < 70 ? 'pending' : 'verified'}
          />
        )}
        <View style={[styles.content, wide && styles.columns]}>
          <View style={[styles.content, wide && styles.filters]}>
            <View style={styles.heading}>
              <AppText variant="h3">Filters</AppText>
              <AppButton
                label="Reset"
                size="sm"
                variant="ghost"
                onPress={() => {
                  setQuery('');
                  setRegions([]);
                  setCategories([]);
                }}
              />
            </View>
            <FilterFieldGroup
              label="Region"
              options={['Global', 'East Europe', 'CIS']}
              selected={regions}
              onToggle={(value) => setRegions((items) => toggle(items, value))}
            />
            <FilterFieldGroup
              label="Opportunity type"
              options={['Infrastructure', 'Health', 'Technology', 'Workforce']}
              selected={categories}
              onToggle={(value) => setCategories((items) => toggle(items, value))}
            />
            {grants.data && (
              <StatusBadge label={grants.data.length + ' indexed matches'} variant="verified" />
            )}
          </View>
          <View style={[styles.content, styles.results]}>
            <AppInput
              accessibilityLabel="Search the grant index"
              placeholder="Search grants"
              value={query}
              onChangeText={setQuery}
              returnKeyType="search"
            />
            {grants.isPending || grants.isError ? (
              <EmptyStateLayout
                title={grants.isError ? 'Instrument fault' : 'Calibrating instrument…'}
                description={grants.error?.message ?? 'Loading your opportunities.'}
                ctaLabel={grants.isError ? 'Try again' : undefined}
                onCtaPress={() => {
                  void grants.refetch();
                }}
              />
            ) : grants.data.length === 0 ? (
              <View style={styles.content}>
                <EmptyStateLayout
                  title="No grants match your exact criteria"
                  description="Try broadening your parameters or submit a Grant Bounty to index a new opportunity."
                />
                <AppInput
                  accessibilityLabel="Bounty title"
                  label="Bounty title"
                  value={bountyTitle}
                  onChangeText={setBountyTitle}
                  maxLength={MAX_INPUT_CHARS}
                />
                <AppButton
                  label="Submit a bounty"
                  variant="outline"
                  isLoading={bounty.isPending}
                  disabled={!bountyTitle.trim()}
                  onPress={() => bounty.mutate({ title: bountyTitle.trim(), note: bountyNote })}
                />
                {currentBounty && bounty.isSuccess && (
                  <StatusBadge
                    label={
                      ENV.DATA_SOURCE === 'mock'
                        ? 'Preview bounty queued'
                        : 'Bounty queued — we will index it'
                    }
                    variant="verified"
                  />
                )}
                {currentBounty && bounty.isError && (
                  <AppText color="failure" accessibilityRole="alert">
                    {bounty.error.message}
                  </AppText>
                )}
              </View>
            ) : (
              <GrantDiscoveryGrid
                grants={grants.data}
                onSelect={setSelectedGrant}
                onApply={openDraft}
              />
            )}
          </View>
        </View>
      </View>
      <ModalSheetLayout
        visible={Boolean(selectedGrant)}
        onClose={() => setSelectedGrant(null)}
        accessibilityLabel={selectedGrant?.title ?? ''}
      >
        <GrantDetailModalSheet grant={selectedGrant} onApply={openDraft} />
      </ModalSheetLayout>
    </ScreenContainer>
  );
}
const styles = StyleSheet.create({
  content: { gap: SPACING.lg },
  columns: { flexDirection: 'row', alignItems: 'flex-start' },
  heading: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: SPACING.sm },
  filters: { width: '30%' },
  results: { flex: 1, minWidth: 0 },
});
