import { SourceSuggestions } from '@/components/organisms/SourceSuggestions';
import { useProfileReadiness } from '@/hooks/useProfileReadiness';
import { useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useAppNavigation } from '@/hooks/useAppNavigation';
import { useEscapeDismiss } from '@/hooks/useEscapeDismiss';
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
import { PressableBadge } from '@/components/molecules/PressableBadge';
import { FilterFieldGroup } from '@/components/molecules/FilterFieldGroup';
import { GrantDiscoveryGrid } from '@/components/organisms/GrantDiscoveryGrid';
import { GrantDetailModalSheet } from '@/components/organisms/GrantDetailModalSheet';
import { WorkspaceStudioBar } from '@/components/organisms/WorkspaceStudioBar';
import { useGrants } from '@/api/hooks/useGrants';
import { useDiscoveryFilterStore } from '@/store/useDiscoveryFilterStore';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';
import { filterGrants, type GrantFilters } from '@/utils/filters';
import { matchTier } from '@/utils/scoring';
import { RADIUS, SPACING } from '@/config/theme';
import type { Grant } from '@/types/grant';

const REGION_OPTIONS = ['Global', 'East Europe', 'CIS'];
const CATEGORY_OPTIONS = ['Infrastructure', 'Health', 'Technology', 'Workforce'];
const STAGE_OPTIONS = ['Idea / Early', 'Prototype / Pilot', 'Scaling'];
const PARTICIPATION_OPTIONS = ['Solo', 'Consortium', 'Either'];
const TEAM_SIZE_OPTIONS = ['1-3', '4-10', '11+'];

export default function DiscoveryScreen() {
  const navigation = useAppNavigation();
  const router = useRouter();
  const profileReadiness = useProfileReadiness();
  const { mobile } = useLayoutMetrics();
  const wide = !mobile;
  const theme = useTheme();
  const [filtersOpen, setFiltersOpen] = useState(false);
  useEscapeDismiss(!wide && filtersOpen, () => setFiltersOpen(false));

  const query = useDiscoveryFilterStore((state) => state.query);
  const regions = useDiscoveryFilterStore((state) => state.regions);
  const categories = useDiscoveryFilterStore((state) => state.categories);
  const stages = useDiscoveryFilterStore((state) => state.stages);
  const participations = useDiscoveryFilterStore((state) => state.participations);
  const teamSizes = useDiscoveryFilterStore((state) => state.teamSizes);
  const setQuery = useDiscoveryFilterStore((state) => state.setQuery);
  const toggleRegion = useDiscoveryFilterStore((state) => state.toggleRegion);
  const toggleCategory = useDiscoveryFilterStore((state) => state.toggleCategory);
  const toggleStage = useDiscoveryFilterStore((state) => state.toggleStage);
  const toggleParticipation = useDiscoveryFilterStore((state) => state.toggleParticipation);
  const toggleTeamSize = useDiscoveryFilterStore((state) => state.toggleTeamSize);
  const resetFilters = useDiscoveryFilterStore((state) => state.reset);

  const [selectedGrant, setSelectedGrant] = useState<Grant | null>(null);
  const grants = useGrants({ q: query, region: regions, category: categories });
  const visibleGrants = useMemo(
    () => filterGrants(grants.data ?? [], { stages, participations, teamSizes }),
    [grants.data, participations, stages, teamSizes]
  );
  const activeFilters = useMemo<GrantFilters>(
    () => ({ query, regions, categories, stages, participations, teamSizes }),
    [categories, participations, query, regions, stages, teamSizes]
  );
  const activeFilterCount =
    regions.length + categories.length + stages.length + participations.length + teamSizes.length;
  const hasActiveSearchOrFilters = activeFilterCount > 0 || query.trim().length > 0;

  const fullSelectedFacets = useMemo(
    () =>
      [
        { label: 'Region', options: REGION_OPTIONS, selected: regions },
        { label: 'Opportunity type', options: CATEGORY_OPTIONS, selected: categories },
        { label: 'Project stage', options: STAGE_OPTIONS, selected: stages },
        { label: 'Participation format', options: PARTICIPATION_OPTIONS, selected: participations },
        { label: 'Team size', options: TEAM_SIZE_OPTIONS, selected: teamSizes },
      ].filter((facet) => facet.options.every((option) => facet.selected.includes(option))),
    [categories, participations, regions, stages, teamSizes]
  );

  const activeChips = useMemo(
    () => [
      ...regions.map((value) => ({
        key: `region:${value}`,
        group: 'Region',
        value,
        onRemove: () => toggleRegion(value),
      })),
      ...categories.map((value) => ({
        key: `category:${value}`,
        group: 'Type',
        value,
        onRemove: () => toggleCategory(value),
      })),
      ...stages.map((value) => ({
        key: `stage:${value}`,
        group: 'Stage',
        value,
        onRemove: () => toggleStage(value),
      })),
      ...participations.map((value) => ({
        key: `participation:${value}`,
        group: 'Format',
        value,
        onRemove: () => toggleParticipation(value),
      })),
      ...teamSizes.map((value) => ({
        key: `teamSize:${value}`,
        group: 'Team',
        value,
        onRemove: () => toggleTeamSize(value),
      })),
    ],
    [
      categories,
      participations,
      regions,
      stages,
      teamSizes,
      toggleCategory,
      toggleParticipation,
      toggleRegion,
      toggleStage,
      toggleTeamSize,
    ]
  );

  const activeProjectId = useWorkspaceStore((state) => state.activeProjectId);
  const ensureWorkSlot = useWorkspaceStore((state) => state.ensureWorkSlot);

  const openDraftById = useCallback(
    (grantId: string, projectId = activeProjectId) => {
      ensureWorkSlot(projectId, grantId);
      setSelectedGrant(null);
      navigation.navigateTo('drafting', grantId);
    },
    [activeProjectId, ensureWorkSlot, navigation]
  );
  const openDraft = useCallback((grant: Grant) => openDraftById(grant.id), [openDraftById]);

  const filterSummaryText = (() => {
    const countLabel = `${visibleGrants.length} ${visibleGrants.length === 1 ? 'opportunity' : 'opportunities'}`;
    if (regions.length + categories.length === 0 && !query.trim() && grants.data) {
      return `Showing ${visibleGrants.length} of ${grants.data.length} opportunities · ${activeFilterCount} ${activeFilterCount === 1 ? 'filter' : 'filters'} active`;
    }
    const parts = [countLabel];
    if (activeFilterCount > 0) {
      parts.push(`${activeFilterCount} ${activeFilterCount === 1 ? 'filter' : 'filters'} active`);
    }
    if (query.trim()) {
      parts.push(`search "${query.trim()}"`);
    }
    return parts.join(' · ');
  })();

  return (
    <ScreenContainer>
      <View style={styles.content}>
        <View style={styles.pageHeading}>
          <AppText variant="h1" align="center" style={styles.title}>
            Find your next opportunity
          </AppText>
          {profileReadiness ? (
            <PressableBadge
              label={`Project Profile ${profileReadiness?.score ?? 0}% Done`}
              actionLabel="Open project profile"
              onPress={() => router.push('/project-profile')}
              style={styles.centerBadge}
              variant={matchTier(profileReadiness?.score ?? 0)}
            />
          ) : null}
        </View>
        <WorkspaceStudioBar />
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
              : `${visibleGrants.length} ${visibleGrants.length === 1 ? 'opportunity' : 'opportunities'}`
          }
          variant="caption"
          color="muted"
          leading={
            !wide ? (
              <IconButton
                label={`Filter grants${activeFilterCount ? ` (${activeFilterCount} active)` : ''}`}
                expanded={filtersOpen}
                active={filtersOpen || activeFilterCount > 0}
                onPress={() => setFiltersOpen(!filtersOpen)}
                icon={<Filter size={SPACING.lg} color={theme.textMuted} />}
              />
            ) : undefined
          }
        />
        <SourceSuggestions />
        {hasActiveSearchOrFilters ? (
          <View
            testID="discovery-filter-response"
            style={[
              styles.responseBar,
              { backgroundColor: theme.surface, borderColor: theme.border },
            ]}
          >
            <View style={styles.responseHeader}>
              <AppText variant="caption" color="main" style={styles.responseSummary}>
                {filterSummaryText}
              </AppText>
              <AppButton size="sm" variant="ghost" label="Clear filters" onPress={resetFilters} />
            </View>
            {fullSelectedFacets.map((facet) => (
              <AppText key={facet.label} variant="caption" color="pending">
                All {facet.options.length} {facet.label} options selected — any{' '}
                {facet.label.toLowerCase()} matches your other active filters.
              </AppText>
            ))}
            {activeChips.length > 0 ? (
              <View style={styles.chipRow}>
                {activeChips.map((chip) => (
                  <AppButton
                    key={chip.key}
                    size="sm"
                    variant="outline"
                    label={`${chip.group}: ${chip.value} ×`}
                    accessibilityLabel={`${chip.group}: ${chip.value} ×. Remove filter`}
                    onPress={chip.onRemove}
                  />
                ))}
              </View>
            ) : null}
          </View>
        ) : null}
        <View style={[styles.content, wide && styles.columns]}>
          {(wide || filtersOpen) && (
            <View style={[styles.content, wide && styles.filters]}>
              <View style={styles.heading}>
                <AppText variant="label" accessibilityRole="header">
                  Filters
                </AppText>
                <AppButton label="Reset" variant="ghost" onPress={resetFilters} />
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
              <FilterFieldGroup
                label="Project stage"
                options={STAGE_OPTIONS}
                selected={stages}
                onToggle={toggleStage}
              />
              <FilterFieldGroup
                label="Participation format"
                options={PARTICIPATION_OPTIONS}
                selected={participations}
                onToggle={toggleParticipation}
              />
              <FilterFieldGroup
                label="Team size"
                options={TEAM_SIZE_OPTIONS}
                selected={teamSizes}
                onToggle={toggleTeamSize}
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
            ) : visibleGrants.length === 0 ? (
              <View style={styles.content}>
                <EmptyStateLayout
                  title="No grants match your exact criteria"
                  description="Clear some filters or submit a missing opportunity via Bounty Hunt."
                  ctaLabel={hasActiveSearchOrFilters ? 'Reset filters' : undefined}
                  onCtaPress={hasActiveSearchOrFilters ? resetFilters : undefined}
                />
              </View>
            ) : (
              <GrantDiscoveryGrid
                grants={visibleGrants}
                onSelect={setSelectedGrant}
                onApply={openDraft}
                activeFilters={activeFilters}
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
        <GrantDetailModalSheet
          grant={selectedGrant}
          onApply={openDraft}
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
  title: { width: '100%' },
  pageHeading: { alignItems: 'center', gap: SPACING.sm },
  centerBadge: { alignSelf: 'center' },
  columns: { flexDirection: 'row', alignItems: 'flex-start' },
  heading: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: SPACING.sm },
  filters: { width: '30%' },
  results: { flex: 1, minWidth: 0 },
  responseBar: {
    borderWidth: 1,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    gap: SPACING.sm,
  },
  responseHeader: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.sm,
  },
  responseSummary: { flex: 1, minWidth: 0 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: SPACING.sm },
});
