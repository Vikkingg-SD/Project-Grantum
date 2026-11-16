import { create } from 'zustand';
import { createDevicePersistence, type PersistenceStatus } from './devicePersistence';
import { getDeviceStorage } from './deviceStorage';
import {
  DEFAULT_REUSABLE_SECTIONS,
  isReusableSectionList,
  saveReusableSection,
  type ReusableSectionEntry,
} from '@/utils/proposalLibrary';

const persistence = createDevicePersistence(
  'grantum.proposal-library.v1',
  getDeviceStorage(),
  isReusableSectionList
);

interface ProposalLibraryState {
  entries: ReusableSectionEntry[];
  hasSaved: boolean;
  hydrated: boolean;
  status: PersistenceStatus;
  saveSection: (input: {
    title: string;
    text: string;
    evidence?: string;
    projectId: string;
    projectName: string;
    grantId: string;
    tags?: string[];
  }) => void;
  removeSection: (id: string) => void;
}

export const useProposalLibraryStore = create<ProposalLibraryState>((set, get) => ({
  entries: persistence.initial ?? DEFAULT_REUSABLE_SECTIONS,
  hasSaved: Boolean(persistence.initial),
  hydrated: persistence.hydrated,
  status: persistence.status,
  saveSection: (input) => {
    const entries = saveReusableSection(get().entries, input);
    const status = persistence.save(entries, (next) => set({ status: next }));
    set({ entries, hasSaved: true, status });
  },
  removeSection: (id) => {
    const entries = get().entries.filter((entry) => entry.id !== id);
    const status = persistence.save(entries, (next) => set({ status: next }));
    set({ entries, hasSaved: true, status });
  },
}));

export async function hydrateProposalLibrary() {
  await persistence.hydrate((entries) =>
    useProposalLibraryStore.setState({ entries, hasSaved: true })
  );
  useProposalLibraryStore.setState({ hydrated: true, status: persistence.status });
}
