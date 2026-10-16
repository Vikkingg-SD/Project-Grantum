import type { Grant } from '@/types/grant';
import { splitRegion } from './formatting';

export interface GrantFilters {
  query?: string;
  regions?: string[];
  categories?: string[];
}

export function filterGrants(grants: Grant[], filters: GrantFilters): Grant[] {
  const q = filters.query?.toLowerCase().trim() ?? '';
  const regions = filters.regions ?? [];
  const categories = filters.categories ?? [];

  return grants.filter((grant) => {
    if (q) {
      const haystack = `${grant.title} ${grant.funder} ${grant.region}`.toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    if (regions.length > 0 && !regions.some((r) => grant.region.includes(r))) {
      return false;
    }
    if (categories.length > 0) {
      const { category } = splitRegion(grant.region);
      if (!categories.includes(category)) return false;
    }
    return true;
  });
}
