import React, { useCallback, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { View, StyleSheet } from 'react-native';
import { useAppNavigation } from '@/hooks/useAppNavigation';
import { ScreenContainer } from '@/components/templates/ScreenContainer';
import { EmptyStateLayout } from '@/components/templates/EmptyStateLayout';
import { ModalSheetLayout } from '@/components/templates/ModalSheetLayout';
import { AppText } from '@/components/atoms/AppText';
import { AppButton } from '@/components/atoms/AppButton';
import { AppInput } from '@/components/atoms/AppInput';
import Filter from 'lucide-react-native/icons/funnel';
import { IconButton } from '@/components/atoms/IconButton';
import { CenteredHeading } from '@/components/molecules/CenteredHeading';
import { useTheme } from '@/hooks/useTheme';
import { useLayoutMetrics } from '@/hooks/useLayoutMetrics';
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
import { SPACING } from '@/config/theme';
import type { Grant } from '@/types/grant';

const REGION_OPTIONS = ['Global', 'East Europe', 'CIS'];
const CATEGORY_OPTIONS = ['Infrastructure', 'Health', 'Technology', 'Workforce'];
const toggle = (items: string[], value: string) =>
  items.includes(value) ? items.filter((item) => item !== value) : [...items, value];

export default function DiscoveryScreen() {
  const navigation = useAppNavigation();
  const { mobile, effectiveWidth } = useLayoutMetrics();
  const wide = !mobile;
  const theme = useTheme();
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
  const toggleRegion = useCallback(
    (value: string) => setRegions((items) => toggle(items, value)),
    []
  );
  const toggleCategory = useCallback(
    (value: string) => setCategories((items) => toggle(items, value)),
    []
  );
  const openDraft = useCallback(
    (grant: Grant) => {
      ensureDraft(grant.id);
      setSelectedGrant(null);
      navigation.navigateTo('drafting', grant.id);
    },
    [ensureDraft, navigation]
  );
  return (
    <ScreenContainer>
      <View style={styles.content}>
        <View style={styles.pageHeading}>
          <AppText
            variant={mobile ? 'h3' : 'h1'}
            align="center"
            style={[styles.title, effectiveWidth < 360 && styles.compactTitle]}
          >
            Find your next opportunity
          </AppText>
          {summary.data && (
            <StatusBadge
              label={`Profile ${summary.data.profileCompletionPct}% done`}
              style={styles.centerBadge}
              variant="neutral"
            />
          )}
        </View>
        <AppInput
          accessibilityLabel="Search the grant index"
          placeholder="Search grants"
          value={query}
          onChangeText={setQuery}
          returnKeyType="search"
        />
        <CenteredHeading
          title={
            grants.isFetching
              ? 'Updating opportunities...'
              : `${grants.data?.length ?? 0} ${ENV.DATA_SOURCE === 'mock' ? 'sample ' : ''}opportunities`
          }
          variant="caption"
          color="muted"
          leading={
            !wide ? (
              <IconButton
                label={`Filter grants${regions.length + categories.length ? ` (${regions.length + categories.length} active)` : ''}`}
                expanded={filtersOpen}
                active={filtersOpen || regions.length + categories.length > 0}
                onPress={() => setFiltersOpen(!filtersOpen)}
                icon={<Filter size={SPACING.lg} color={theme.textMuted} />}
              />
            ) : undefined
          }
        />
        <View style={[styles.content, wide && styles.columns]}>
          {(wide || filtersOpen) && (
            <View style={[styles.content, wide && styles.filters]}>
              <View style={styles.heading}>
                <AppText variant="label" accessibilityRole="header">
                  Filters
                </AppText>
                <AppButton
                  label="Reset"
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
                options={REGION_OPTIONS}
                selected={regions}
                onToggle={toggleRegion}
              />
              <FilterFieldGroup
                label="Opportunity type"
                options={CATEGORY_OPTIONS}
                selected={categories}
                onToggle={toggleCategory}
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
  title: { width: '100%' },
  compactTitle: { fontSize: 17, lineHeight: 24 },
  pageHeading: { alignItems: 'center', gap: SPACING.sm },
  centerBadge: { alignSelf: 'center' },
  columns: { flexDirection: 'row', alignItems: 'flex-start' },
  heading: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: SPACING.sm },
  filters: { width: '30%' },
  results: { flex: 1, minWidth: 0 },
});
