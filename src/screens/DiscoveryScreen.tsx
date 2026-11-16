import { SourceSuggestions } from '@/components/organisms/SourceSuggestions';
import { useProfileReadiness } from '@/hooks/useProfileReadiness';
import { useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
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
import { PressableBadge } from '@/components/molecules/PressableBadge';
import { FilterFieldGroup } from '@/components/molecules/FilterFieldGroup';
import { GrantDiscoveryGrid } from '@/components/organisms/GrantDiscoveryGrid';
import { GrantDetailModalSheet } from '@/components/organisms/GrantDetailModalSheet';
import { WorkspaceStudioBar } from '@/components/organisms/WorkspaceStudioBar';
import { useGrants } from '@/api/hooks/useGrants';
import { ENV } from '@/config/env';
import { useDraftStore } from '@/store/useDraftStore';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';
import { filterGrants } from '@/utils/filters';
import { SPACING } from '@/config/theme';
import type { Grant } from '@/types/grant';

const REGION_OPTIONS = ['Global', 'East Europe', 'CIS'];
const CATEGORY_OPTIONS = ['Infrastructure', 'Health', 'Technology', 'Workforce'];
const STAGE_OPTIONS = ['Idea / Early', 'Prototype / Pilot', 'Scaling'];
const PARTICIPATION_OPTIONS = ['Solo', 'Consortium', 'Either'];
const TEAM_SIZE_OPTIONS = ['1-3', '4-10', '11+'];
const toggle = (items: string[], value: string) =>
  items.includes(value) ? items.filter((item) => item !== value) : [...items, value];

export default function DiscoveryScreen() {
  const navigation = useAppNavigation();
  const router = useRouter();
  const profileReadiness = useProfileReadiness();
  const { mobile } = useLayoutMetrics();
  const wide = !mobile;
  const theme = useTheme();
  const [query, setQuery] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [regions, setRegions] = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [stages, setStages] = useState<string[]>([]);
  const [participations, setParticipations] = useState<string[]>([]);
  const [teamSizes, setTeamSizes] = useState<string[]>([]);
  const [selectedGrant, setSelectedGrant] = useState<Grant | null>(null);
  const grants = useGrants({ q: query, region: regions, category: categories });
  const visibleGrants = useMemo(
    () => filterGrants(grants.data ?? [], { stages, participations, teamSizes }),
    [grants.data, participations, stages, teamSizes]
  );
  const activeFilterCount =
    regions.length + categories.length + stages.length + participations.length + teamSizes.length;
  const ensureDraft = useDraftStore((state) => state.ensureDraft);
  const activeProjectId = useWorkspaceStore((state) => state.activeProjectId);
  const ensureWorkSlot = useWorkspaceStore((state) => state.ensureWorkSlot);
  const toggleRegion = useCallback(
    (value: string) => setRegions((items) => toggle(items, value)),
    []
  );
  const toggleCategory = useCallback(
    (value: string) => setCategories((items) => toggle(items, value)),
    []
  );
  const toggleStage = useCallback(
    (value: string) => setStages((items) => toggle(items, value)),
    []
  );
  const toggleParticipation = useCallback(
    (value: string) => setParticipations((items) => toggle(items, value)),
    []
  );
  const toggleTeamSize = useCallback(
    (value: string) => setTeamSizes((items) => toggle(items, value)),
    []
  );
  const openDraftById = useCallback(
    (grantId: string, projectId = activeProjectId) => {
      ensureDraft(grantId);
      ensureWorkSlot(projectId, grantId);
      setSelectedGrant(null);
      navigation.navigateTo('drafting', grantId);
    },
    [activeProjectId, ensureDraft, ensureWorkSlot, navigation]
  );
  const openDraft = useCallback((grant: Grant) => openDraftById(grant.id), [openDraftById]);
  return (
    <ScreenContainer>
      <View style={styles.content}>
        <View style={styles.pageHeading}>
          <AppText variant="h1" align="center" style={styles.title}>
            Find your next opportunity
          </AppText>
          {profileReadiness && (
            <PressableBadge
              label={`Project Profile ${profileReadiness?.score ?? 0}% Done`}
              actionLabel="Open project profile"
              onPress={() => router.push('/project-profile')}
              style={styles.centerBadge}
              variant="pending"
            />
          )}
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
              : `${visibleGrants.length} ${ENV.DATA_SOURCE === 'mock' ? 'sample ' : ''}opportunities`
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
                    setStages([]);
                    setParticipations([]);
                    setTeamSizes([]);
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
                  description="Try fewer filters, or save an official source for later."
                />
              </View>
            ) : (
              <GrantDiscoveryGrid
                grants={visibleGrants}
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
});
