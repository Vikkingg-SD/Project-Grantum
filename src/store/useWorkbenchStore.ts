import { create } from 'zustand';
import { emptyWorkbench, type DraftWorkbench } from '@/utils/drafting';
interface WorkbenchStore {
  work: Record<string, DraftWorkbench>;
  update: (key: string, change: (work: DraftWorkbench) => DraftWorkbench) => void;
}
// Legacy grant routes remain session-scoped until stage 2 application routing lands.
export const useWorkbenchStore = create<WorkbenchStore>((set) => ({
  work: {},
  update: (key, change) =>
    set((state) => ({
      work: { ...state.work, [key]: change(state.work[key] ?? emptyWorkbench()) },
    })),
}));
export const EMPTY_WORKBENCH = emptyWorkbench();
