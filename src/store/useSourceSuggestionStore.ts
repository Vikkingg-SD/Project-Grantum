import { create } from 'zustand';
import { getDataSource } from '@/api/dataSource';
import { createDevicePersistence, type PersistenceStatus } from './devicePersistence';
import { getDeviceStorage } from './deviceStorage';
import { generateId } from '@/utils/uuid';
import {
  isBountyComplete,
  isSourceHistory,
  normalizeSourceUrl,
  validateBountySubmission,
  validateSource,
  type BountyFormInput,
  type SourceSuggestion,
} from '@/utils/sourceSuggestions';

const persistence = createDevicePersistence(
  'grantum.source-suggestions.v1',
  getDeviceStorage(),
  isSourceHistory
);

const inFlightUrls = new Set<string>();
const inFlightSubmissions = new Set<string>();

interface ActionResult {
  error?: string;
  entry?: SourceSuggestion;
}

interface State {
  entries: SourceSuggestion[];
  hydrated: boolean;
  status: PersistenceStatus;
  submitting: boolean;
  add: (title: string, url: string, note: string) => string | undefined;
  saveDraft: (input: BountyFormInput, existingId?: string) => ActionResult;
  submitBounty: (input: BountyFormInput, existingId?: string) => Promise<ActionResult>;
  moderate: (
    id: string,
    decision: 'accepted' | 'changes-requested' | 'declined',
    moderationNote?: string
  ) => string | undefined;
}

function buildEntryFields(input: BountyFormInput, canonicalUrl: string) {
  return {
    title: input.title.trim(),
    url: canonicalUrl,
    region: input.region.trim(),
    prizePool: input.prizePool.trim(),
    mission: input.mission.trim(),
    note: input.note.trim(),
  };
}

export const useSourceSuggestionStore = create<State>((set, get) => ({
  entries: persistence.initial ?? [],
  hydrated: persistence.hydrated,
  status: persistence.status,
  submitting: false,
  add: (title, inputUrl, note) => {
    const result = get().saveDraft({
      title,
      url: inputUrl,
      region: '',
      prizePool: '',
      mission: '',
      note,
    });
    return result.error;
  },
  saveDraft: (input, existingId) => {
    if (!get().hydrated) return { error: 'Your saved sources are still loading.' };
    const errors = validateSource(input.title, input.url, input.note);
    if (Object.values(errors).some(Boolean)) return { error: 'Check the source details.' };
    if (input.region.trim().length > 160) {
      return { error: 'Keep Location / region within 160 characters.' };
    }
    if (input.prizePool.trim().length > 160) {
      return { error: 'Keep Prize pool within 160 characters.' };
    }
    if (input.mission.trim().length > 500) {
      return { error: 'Keep Mission within 500 characters.' };
    }
    const url = normalizeSourceUrl(input.url);
    if (!url) return { error: 'Confirm the official HTTPS source URL before saving.' };

    const entries = get().entries;
    const duplicate = entries.find((item) => item.url === url && item.id !== existingId);
    if (duplicate) {
      return { error: 'This source URL is already in your saved sources.' };
    }

    const existing = existingId ? entries.find((item) => item.id === existingId) : undefined;
    if (
      existing &&
      (existing.moderationStatus === 'pending-review' ||
        existing.moderationStatus === 'accepted' ||
        existing.moderationStatus === 'submitting')
    ) {
      return { error: 'Submitted sources cannot be reverted to drafts.' };
    }
    if (!existing && entries.length >= 200) {
      return { error: 'You have reached the 200-source limit.' };
    }

    const now = new Date().toISOString();
    const fields = buildEntryFields(input, url);
    let savedEntry: SourceSuggestion;
    let nextEntries: SourceSuggestion[];

    if (existing) {
      const keepChangeNotes = existing.moderationStatus === 'changes-requested';
      savedEntry = {
        ...existing,
        ...fields,
        moderationStatus: keepChangeNotes ? 'changes-requested' : 'draft',
        moderationNote: keepChangeNotes ? existing.moderationNote : undefined,
        bountyEligible: false,
        updatedAt: now,
      };
      nextEntries = entries.map((item) => (item.id === existing.id ? savedEntry : item));
    } else {
      savedEntry = {
        id: generateId('src'),
        ...fields,
        submissionId: generateId('bnt'),
        moderationStatus: 'draft',
        bountyEligible: false,
        rewardGranted: false,
        createdAt: now,
        updatedAt: now,
      };
      nextEntries = [savedEntry, ...entries];
    }

    const status = persistence.save(nextEntries, (next) => set({ status: next }));
    set({ entries: nextEntries, status });
    return { entry: savedEntry };
  },
  submitBounty: async (input, existingId) => {
    if (!get().hydrated) return { error: 'Your saved sources are still loading.' };
    const errors = validateBountySubmission(input);
    if (Object.values(errors).some(Boolean)) {
      return { error: 'Complete all required Bounty Hunt fields and confirm the official URL.' };
    }
    const url = normalizeSourceUrl(input.url);
    if (!url) return { error: 'Confirm the official HTTPS source URL before submitting.' };

    const entries = get().entries;
    const existing = existingId
      ? entries.find((item) => item.id === existingId)
      : entries.find((item) => item.url === url);

    const conflicting = entries.find((item) => item.url === url && item.id !== existing?.id);
    if (conflicting) {
      return { error: 'This source URL is already in your saved sources.' };
    }
    if (
      existing?.moderationStatus === 'pending-review' ||
      existing?.moderationStatus === 'accepted'
    ) {
      return {
        error: 'This source has already been submitted for Bounty Hunt review.',
        entry: existing,
      };
    }

    const submissionId = existing?.submissionId ?? generateId('bnt');
    if (
      existing?.moderationStatus === 'submitting' ||
      inFlightUrls.has(url) ||
      inFlightSubmissions.has(submissionId)
    ) {
      return {
        error: 'Submission is already in progress for this source.',
        entry: existing,
      };
    }
    if (!existing && entries.length >= 200) {
      return { error: 'You have reached the 200-source limit.' };
    }

    inFlightUrls.add(url);
    inFlightSubmissions.add(submissionId);
    const now = new Date().toISOString();
    const fields = buildEntryFields(input, url);
    const pendingEntry: SourceSuggestion = existing
      ? {
          ...existing,
          ...fields,
          submissionId,
          moderationStatus: 'submitting',
          moderationNote: undefined,
          bountyEligible: true,
          updatedAt: now,
        }
      : {
          id: generateId('src'),
          ...fields,
          submissionId,
          moderationStatus: 'submitting',
          bountyEligible: true,
          rewardGranted: false,
          createdAt: now,
          updatedAt: now,
        };

    const optimisticEntries = existing
      ? entries.map((item) => (item.id === existing.id ? pendingEntry : item))
      : [pendingEntry, ...entries];
    const savingStatus = persistence.save(optimisticEntries, (next) => set({ status: next }));
    set({ entries: optimisticEntries, status: savingStatus, submitting: true });

    try {
      const response = await getDataSource().submitBounty({
        submissionId,
        title: fields.title,
        url: fields.url,
        region: fields.region,
        prizePool: fields.prizePool,
        mission: fields.mission,
        note: fields.note,
      });
      if (!response?.queued) {
        throw new Error('Moderation queue did not confirm receipt of this submission.');
      }
      const submittedAt = new Date().toISOString();
      const receiptSuffix = submissionId
        .replace(/[^a-zA-Z0-9]/g, '')
        .slice(-8)
        .toUpperCase();
      const confirmedEntry: SourceSuggestion = {
        ...pendingEntry,
        moderationStatus: 'pending-review',
        moderationNote: undefined,
        receiptId: pendingEntry.receiptId ?? `BNT-${receiptSuffix}`,
        submittedAt,
        updatedAt: submittedAt,
      };
      const updatedEntries = get().entries.map((item) =>
        item.id === pendingEntry.id ? confirmedEntry : item
      );
      const nextStatus = persistence.save(updatedEntries, (next) => set({ status: next }));
      set({
        entries: updatedEntries,
        status: nextStatus,
        submitting: inFlightSubmissions.size > 1,
      });
      return { entry: confirmedEntry };
    } catch (error) {
      const message =
        error instanceof Error && error.message.trim()
          ? error.message.trim()
          : 'Moderation submission failed. Your details are preserved; retry when connected.';
      const failedAt = new Date().toISOString();
      const failedEntry: SourceSuggestion = {
        ...pendingEntry,
        moderationStatus: 'submission-failed',
        moderationNote: message,
        updatedAt: failedAt,
      };
      const updatedEntries = get().entries.map((item) =>
        item.id === pendingEntry.id ? failedEntry : item
      );
      const nextStatus = persistence.save(updatedEntries, (next) => set({ status: next }));
      set({
        entries: updatedEntries,
        status: nextStatus,
        submitting: inFlightSubmissions.size > 1,
      });
      return { error: message, entry: failedEntry };
    } finally {
      inFlightUrls.delete(url);
      inFlightSubmissions.delete(submissionId);
      set({ submitting: inFlightSubmissions.size > 0 });
    }
  },
  moderate: (id, decision, moderationNote) => {
    const entries = get().entries;
    const target = entries.find((item) => item.id === id);
    if (!target) return 'Source entry could not be found.';
    const trimmedNote = moderationNote?.trim() || undefined;
    if (decision === 'accepted' && target.rewardGranted) {
      return 'Tier 1 reward has already been recorded for this source.';
    }
    if (
      target.moderationStatus !== 'pending-review' &&
      target.moderationStatus !== 'changes-requested'
    ) {
      return 'Only submitted sources awaiting review can be moderated.';
    }
    if (decision === 'accepted' && !isBountyComplete(target)) {
      return 'Only complete 6-field submissions can be accepted for Tier 1 reward.';
    }
    const now = new Date().toISOString();
    const updated = entries.map((item) => {
      if (item.id !== id) return item;
      return {
        ...item,
        moderationStatus: decision,
        moderationNote: trimmedNote,
        rewardGranted: decision === 'accepted',
        updatedAt: now,
      };
    });
    const status = persistence.save(updated, (next) => set({ status: next }));
    set({ entries: updated, status });
    return undefined;
  },
}));

export async function hydrateSourceSuggestions() {
  await persistence.hydrate((entries) => {
    const normalized = entries.map((entry) =>
      entry.moderationStatus === 'submitting'
        ? {
            ...entry,
            moderationStatus: 'submission-failed' as const,
            moderationNote: 'Submission was interrupted before confirmation. Retry submission.',
          }
        : entry
    );
    useSourceSuggestionStore.setState({ entries: normalized });
  });
  useSourceSuggestionStore.setState({ hydrated: true, status: persistence.status });
}
