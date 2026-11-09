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
  const [filtersOpen, setFiltersOpen] = useState(false);
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
        <AppText variant="h1">Find your next opportunity</AppText>
        <AppText color="muted">
          {ENV.DATA_SOURCE === 'mock'
            ? 'Explore sample grants and try the application workspace.'
            : 'Search grants by mission, funder, and region.'}
        </AppText>
        <AppInput
          accessibilityLabel="Search the grant index"
          placeholder="Search grants"
          value={query}
          onChangeText={setQuery}
          returnKeyType="search"
        />
        <View style={styles.heading}>
          <AppText variant="caption" color="muted" accessibilityLiveRegion="polite">
            {grants.isFetching
              ? 'Updating opportunities...'
              : `${grants.data?.length ?? 0} opportunities`}
          </AppText>
          {!wide && (
            <AppButton
              label={`Filters${regions.length + categories.length ? ` (${regions.length + categories.length})` : ''}`}
              size="sm"
              variant="outline"
              expanded={filtersOpen}
              onPress={() => setFiltersOpen(!filtersOpen)}
            />
          )}
          {summary.data && (
            <StatusBadge
              label={`Profile ${summary.data.profileCompletionPct}% complete`}
              variant="neutral"
            />
          )}
        </View>
        <View style={[styles.content, wide && styles.columns]}>
          {(wide || filtersOpen) && (
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
            </View>
          )}
          <View style={[styles.content, styles.results]}>
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
                  description="Try fewer filters, or suggest an opportunity for the catalog."
                />
                <AppInput
                  accessibilityLabel="Opportunity suggestion"
                  label="Opportunity suggestion"
                  value={bountyTitle}
                  onChangeText={setBountyTitle}
                  maxLength={MAX_INPUT_CHARS}
                />
                <AppButton
                  label="Submit suggestion"
                  variant="outline"
                  isLoading={bounty.isPending}
                  disabled={!bountyTitle.trim()}
                  onPress={() => bounty.mutate({ title: bountyTitle.trim(), note: bountyNote })}
                />
                {currentBounty && bounty.isSuccess && (
                  <StatusBadge
                    label={
                      ENV.DATA_SOURCE === 'mock'
                        ? 'Suggestion recorded for this preview'
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
