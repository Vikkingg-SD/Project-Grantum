import { create } from 'zustand';

interface UIState {
  activeGrantId: string;
  isFilterSheetOpen: boolean;
  selectedFormat: string;
  setActiveGrantId: (id: string) => void;
  setFilterSheetOpen: (open: boolean) => void;
  setSelectedFormat: (format: string) => void;
}

export const useUIStore = create<UIState>((set) => ({
  activeGrantId: '1',
  isFilterSheetOpen: false,
  selectedFormat: 'word',
  setActiveGrantId: (id) => set({ activeGrantId: id }),
  setFilterSheetOpen: (open) => set({ isFilterSheetOpen: open }),
  setSelectedFormat: (format) => set({ selectedFormat: format }),
}));
