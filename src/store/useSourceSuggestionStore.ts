import { create } from 'zustand';
import { createDevicePersistence, type PersistenceStatus } from './devicePersistence';
import { getDeviceStorage } from './deviceStorage';
import {
  isSourceHistory,
  normalizeSourceUrl,
  validateSource,
  type SourceSuggestion,
} from '@/utils/sourceSuggestions';

const persistence = createDevicePersistence(
  'grantum.source-suggestions.v1',
  getDeviceStorage(),
  isSourceHistory
);

interface State {
  entries: SourceSuggestion[];
  hydrated: boolean;
  status: PersistenceStatus;
  add: (title: string, url: string, note: string) => string | undefined;
}

export const useSourceSuggestionStore = create<State>((set, get) => ({
  entries: persistence.initial ?? [],
  hydrated: persistence.hydrated,
  status: persistence.status,
  add: (title, inputUrl, note) => {
    if (!get().hydrated) return 'Your saved sources are still loading.';
    const errors = validateSource(title, inputUrl, note);
    if (Object.values(errors).some(Boolean)) return 'Check the source details.';
    const url = normalizeSourceUrl(inputUrl)!;
    if (get().entries.some((entry) => entry.url === url))
      return 'This source URL is already in your saved sources.';
    if (get().entries.length >= 200) return 'This device has reached the 200-source limit.';
    const createdAt = new Date().toISOString();
    const entries = [
      {
        id: `${createdAt}-${get().entries.length}`,
        title: title.trim(),
        url,
        note: note.trim(),
        createdAt,
      },
      ...get().entries,
    ];
    const status = persistence.save(entries, (next) => set({ status: next }));
    set({ entries, status });
    return undefined;
  },
}));

export async function hydrateSourceSuggestions() {
  await persistence.hydrate((entries) => useSourceSuggestionStore.setState({ entries }));
  useSourceSuggestionStore.setState({ hydrated: true, status: persistence.status });
}
