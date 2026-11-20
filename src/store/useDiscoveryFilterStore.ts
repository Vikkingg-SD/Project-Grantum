import { create } from 'zustand';

const toggleItem = (items: string[], value: string) =>
  items.includes(value) ? items.filter((item) => item !== value) : [...items, value];

interface DiscoveryFilterState {
  query: string;
  regions: string[];
  categories: string[];
  stages: string[];
  participations: string[];
  teamSizes: string[];
  setQuery: (query: string) => void;
  toggleRegion: (value: string) => void;
  toggleCategory: (value: string) => void;
  toggleStage: (value: string) => void;
  toggleParticipation: (value: string) => void;
  toggleTeamSize: (value: string) => void;
  reset: () => void;
}

export const useDiscoveryFilterStore = create<DiscoveryFilterState>((set) => ({
  query: '',
  regions: [],
  categories: [],
  stages: [],
  participations: [],
  teamSizes: [],
  setQuery: (query) => set({ query }),
  toggleRegion: (value) => set((state) => ({ regions: toggleItem(state.regions, value) })),
  toggleCategory: (value) => set((state) => ({ categories: toggleItem(state.categories, value) })),
  toggleStage: (value) => set((state) => ({ stages: toggleItem(state.stages, value) })),
  toggleParticipation: (value) =>
    set((state) => ({ participations: toggleItem(state.participations, value) })),
  toggleTeamSize: (value) => set((state) => ({ teamSizes: toggleItem(state.teamSizes, value) })),
  reset: () =>
    set({
      query: '',
      regions: [],
      categories: [],
      stages: [],
      participations: [],
      teamSizes: [],
    }),
}));
