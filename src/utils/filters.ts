import type { Grant } from '@/types/grant';
import { splitRegion } from './formatting';

export interface GrantFilters {
  query?: string;
  regions?: string[];
  categories?: string[];
  stages?: string[];
  participations?: string[];
  teamSizes?: string[];
}

export interface GrantFacetTag {
  facet: 'stage' | 'participation' | 'teamSize';
  value: string;
  label: string;
  specified: boolean;
}

export function matchesParticipationFilter(
  grantParticipation: Grant['participation'],
  selected: readonly string[]
): boolean {
  if (selected.length === 0) return true;
  if (!grantParticipation) return false;
  if (selected.includes(grantParticipation)) return true;
  if (
    grantParticipation === 'Either' &&
    (selected.includes('Solo') || selected.includes('Consortium'))
  ) {
    return true;
  }
  return false;
}

export function extractGrantTags(grant: Grant): GrantFacetTag[] {
  const stage = grant.stage?.trim();
  const participation = grant.participation?.trim();
  const teamSize = grant.teamSize?.trim();
  return [
    {
      facet: 'stage',
      value: stage || 'Unspecified',
      label: `Stage: ${stage || 'Unspecified'}`,
      specified: Boolean(stage),
    },
    {
      facet: 'participation',
      value: participation || 'Unspecified',
      label: `Format: ${participation || 'Unspecified'}`,
      specified: Boolean(participation),
    },
    {
      facet: 'teamSize',
      value: teamSize || 'Unspecified',
      label: `Team: ${teamSize || 'Unspecified'}`,
      specified: Boolean(teamSize),
    },
  ];
}

export function isGrantTagHighlighted(tag: GrantFacetTag, filters?: GrantFilters): boolean {
  if (!filters || !tag.specified) return false;
  if (tag.facet === 'stage') {
    return Boolean(filters.stages?.includes(tag.value));
  }
  if (tag.facet === 'participation') {
    const selected = filters.participations ?? [];
    if (selected.length === 0) return false;
    return matchesParticipationFilter(tag.value as Grant['participation'], selected);
  }
  return Boolean(filters.teamSizes?.includes(tag.value));
}

export function filterGrants(grants: Grant[], filters: GrantFilters): Grant[] {
  const q = filters.query?.toLowerCase().trim() ?? '';
  const regions = filters.regions ?? [];
  const categories = filters.categories ?? [];
  const stages = filters.stages ?? [];
  const participations = filters.participations ?? [];
  const teamSizes = filters.teamSizes ?? [];

  return grants.filter((grant) => {
    if (q) {
      const haystack = [
        grant.title,
        grant.funder,
        grant.region,
        grant.stage ?? '',
        grant.participation ?? '',
        grant.teamSize ?? '',
      ]
        .join(' ')
        .toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    if (regions.length > 0 && !regions.some((r) => grant.region.includes(r))) {
      return false;
    }
    if (categories.length > 0) {
      const { category } = splitRegion(grant.region);
      if (!categories.includes(category)) return false;
    }
    if (stages.length > 0 && (!grant.stage || !stages.includes(grant.stage))) {
      return false;
    }
    if (!matchesParticipationFilter(grant.participation, participations)) {
      return false;
    }
    if (teamSizes.length > 0 && (!grant.teamSize || !teamSizes.includes(grant.teamSize))) {
      return false;
    }
    return true;
  });
}
