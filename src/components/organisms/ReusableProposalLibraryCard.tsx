import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppButton } from '../atoms/AppButton';
import { AppInput } from '../atoms/AppInput';
import { AppText } from '../atoms/AppText';
import { StatusBadge } from '../atoms/StatusBadge';
import { useTheme } from '@/hooks/useTheme';
import { RADIUS, SPACING } from '@/config/theme';
import { hydrateProposalLibrary, useProposalLibraryStore } from '@/store/useProposalLibraryStore';
import { requiresOverwriteConfirmation, searchReusableSections } from '@/utils/proposalLibrary';
import type { DraftSection } from '@/utils/drafting';

export interface ReusableProposalLibraryCardProps {
  sections: DraftSection[];
  canEdit: boolean;
  onInsert: (sectionId: string, text: string, evidence: string) => void;
}

export function ReusableProposalLibraryCard({
  sections,
  canEdit,
  onInsert,
}: ReusableProposalLibraryCardProps) {
  const theme = useTheme();
  const entries = useProposalLibraryStore((state) => state.entries);
  const hasSaved = useProposalLibraryStore((state) => state.hasSaved);
  const status = useProposalLibraryStore((state) => state.status);
  const [query, setQuery] = useState('');
  const [selectedSectionId, setSelectedSectionId] = useState(sections[0]?.id ?? '');
  const [confirmEntryId, setConfirmEntryId] = useState<string | null>(null);

  useEffect(() => {
    void hydrateProposalLibrary();
  }, []);

  const activeSection = sections.find((s) => s.id === selectedSectionId) ?? sections[0];
  const filteredEntries = useMemo(() => searchReusableSections(entries, query), [entries, query]);

  if (!activeSection) return null;

  return (
    <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <View style={styles.headerRow}>
        <AppText variant="h3">Reusable proposal sections library</AppText>
        <StatusBadge label={`${entries.length} sections`} variant="neutral" />
      </View>
      <AppText variant="caption" color="muted">
        {!hasSaved
          ? 'Starter examples loaded. Save any section above to store your own library on this device.'
          : status === 'saving'
            ? 'Saving library on this device…'
            : status === 'session-only'
              ? 'Library updates kept for this session only; device storage is unavailable.'
              : 'Library sections saved on this device with project provenance.'}
      </AppText>
      <AppInput
        label="Search reusable sections"
        placeholder="Filter by title, keyword, tag, or source project..."
        value={query}
        onChangeText={setQuery}
      />
      <AppText variant="caption" color="muted">
        Insert into section:
      </AppText>
      <View style={styles.rowWrap}>
        {sections.map((section) => (
          <AppButton
            key={section.id}
            size="sm"
            variant="outline"
            label={`Target: ${section.title}`}
            selected={activeSection.id === section.id}
            onPress={() => {
              setSelectedSectionId(section.id);
              setConfirmEntryId(null);
            }}
          />
        ))}
      </View>
      {filteredEntries.length === 0 ? (
        <AppText color="muted">No reusable sections match this query.</AppText>
      ) : (
        filteredEntries.map((entry) => {
          const confirming = confirmEntryId === entry.id;
          return (
            <View key={entry.id} style={[styles.item, { borderColor: theme.border }]}>
              <View style={styles.headerRow}>
                <AppText variant="body">{entry.title}</AppText>
                <StatusBadge label={entry.projectName} variant="neutral" />
              </View>
              <AppText variant="caption" color="muted">
                Source: {entry.projectName} · Grant #{entry.grantId}
                {entry.tags.length > 0 ? ` · Tags: ${entry.tags.join(', ')}` : ''}
              </AppText>
              <AppText variant="caption" numberOfLines={3}>
                {entry.text}
              </AppText>
              {!confirming ? (
                <AppButton
                  size="sm"
                  variant="outline"
                  label={`Insert ${entry.title}`}
                  accessibilityLabel={`Insert ${entry.title} into ${activeSection.title}`}
                  disabled={!canEdit}
                  onPress={() => {
                    if (requiresOverwriteConfirmation(activeSection.text)) {
                      setConfirmEntryId(entry.id);
                      return;
                    }
                    onInsert(activeSection.id, entry.text, entry.evidence);
                    setConfirmEntryId(null);
                  }}
                />
              ) : (
                <View
                  style={[
                    styles.confirmBox,
                    { backgroundColor: theme.subtle, borderColor: theme.border },
                  ]}
                >
                  <AppText variant="caption" color="pending">
                    Target section &quot;{activeSection.title}&quot; already has text. Replace
                    current section text?
                  </AppText>
                  <View style={styles.rowWrap}>
                    <AppButton
                      size="sm"
                      variant="primary"
                      label="Confirm replace section text"
                      disabled={!canEdit}
                      onPress={() => {
                        onInsert(activeSection.id, entry.text, entry.evidence);
                        setConfirmEntryId(null);
                      }}
                    />
                    <AppButton
                      size="sm"
                      variant="ghost"
                      label="Cancel overwrite"
                      onPress={() => setConfirmEntryId(null)}
                    />
                  </View>
                </View>
              )}
            </View>
          );
        })
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    gap: SPACING.sm,
  },
  headerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.sm,
  },
  rowWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
  },
  item: {
    padding: SPACING.sm,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    gap: SPACING.xs,
  },
  confirmBox: {
    padding: SPACING.sm,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    gap: SPACING.xs,
  },
});
