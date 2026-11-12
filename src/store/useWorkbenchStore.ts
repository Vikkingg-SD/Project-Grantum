import { create } from 'zustand';
import { emptyWorkbench, type DraftWorkbench } from '@/utils/drafting';

const WORKBENCH_STORAGE_KEY = 'grantum.workbench.v1';

function loadWorkbenches(): Record<string, DraftWorkbench> {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return {};
    const raw = window.localStorage.getItem(WORKBENCH_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, DraftWorkbench>;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function saveWorkbenches(work: Record<string, DraftWorkbench>) {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(WORKBENCH_STORAGE_KEY, JSON.stringify(work));
    }
  } catch {
    // Ignore storage quota errors in session-only environments
  }
}

interface WorkbenchStore {
  work: Record<string, DraftWorkbench>;
  update: (key: string, change: (work: DraftWorkbench) => DraftWorkbench) => void;
}

export const useWorkbenchStore = create<WorkbenchStore>((set) => ({
  work: loadWorkbenches(),
  update: (key, change) =>
    set((state) => {
      const next = {
        ...state.work,
        [key]: change(state.work[key] ?? emptyWorkbench()),
      };
      saveWorkbenches(next);
      return { work: next };
    }),
}));

export const EMPTY_WORKBENCH = emptyWorkbench();
