import { create } from 'zustand';

interface UIState {
  isFilterSheetOpen: boolean;
  selectedFormat: string;
  setFilterSheetOpen: (open: boolean) => void;
  setSelectedFormat: (format: string) => void;
}

export const useUIStore = create<UIState>((set) => ({
  isFilterSheetOpen: false,
  selectedFormat: 'word',
  setFilterSheetOpen: (open) => set({ isFilterSheetOpen: open }),
  setSelectedFormat: (format) => set({ selectedFormat: format }),
}));
