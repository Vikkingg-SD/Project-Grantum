import React from 'react';
import { StyleSheet, View } from 'react-native';
import Paperclip from 'lucide-react-native/icons/paperclip';
import { AppButton } from '@/components/atoms/AppButton';
import { AppText } from '@/components/atoms/AppText';
import { SPACING } from '@/config/theme';
import { useTheme } from '@/hooks/useTheme';
import { MAX_PROJECT_DOCS } from '@/utils/workspace';

export interface ProjectDocumentListProps {
  docs: readonly string[];
  disabled?: boolean;
  busy?: boolean;
  error?: string;
  fileSizes?: Readonly<Record<string, number>>;
  onPressAttach: () => void;
  onRemoveDoc: (docName: string) => void;
}

export function ProjectDocumentList({
  docs,
  disabled = false,
  busy = false,
  error = '',
  fileSizes,
  onPressAttach,
  onRemoveDoc,
}: ProjectDocumentListProps) {
  const theme = useTheme();
  const limitReached = docs.length >= MAX_PROJECT_DOCS;

  return (
    <View
      testID="project-reference-documents"
      style={[styles.container, { borderTopColor: theme.border }]}
    >
      <View style={styles.headerRow}>
        <AppText variant="label">Reference documents</AppText>
        <AppButton
          size="sm"
          variant="outline"
          label={busy ? 'Attaching…' : 'Attach file'}
          accessibilityLabel={busy ? 'Attaching…' : 'Attach file to Reference documents'}
          disabled={disabled || busy || limitReached}
          icon={<Paperclip size={18} color={theme.primaryText} />}
          onPress={onPressAttach}
        />
      </View>

      <AppText variant="caption" color="muted">
        Attach any files relevant to this project
      </AppText>

      {Boolean(error) ? (
        <AppText variant="caption" color="failureText" accessibilityRole="alert">
          {error}
        </AppText>
      ) : null}

      {limitReached ? (
        <AppText variant="caption" color="muted">
          Maximum of {MAX_PROJECT_DOCS} reference files reached. Remove a file to attach another.
        </AppText>
      ) : null}

      {docs.length === 0 ? (
        <AppText variant="caption" color="muted">
          No files attached yet.
        </AppText>
      ) : (
        <View style={styles.list}>
          {docs.map((docName) => {
            const bytes = fileSizes?.[docName];
            const sizeLabel =
              bytes && bytes > 0 ? ` · ${Math.max(1, Math.ceil(bytes / 1024))} KB` : '';
            return (
              <View key={docName} style={[styles.row, { borderTopColor: theme.border }]}>
                <View style={styles.fileMeta}>
                  <Paperclip size={16} color={theme.textMuted} />
                  <AppText variant="caption" style={styles.fileName}>
                    {docName}
                    {sizeLabel}
                  </AppText>
                </View>
                <AppButton
                  size="sm"
                  variant="ghost"
                  label="Remove"
                  accessibilityLabel={`Remove ${docName}`}
                  disabled={disabled}
                  style={styles.removeBtn}
                  onPress={() => onRemoveDoc(docName)}
                />
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderTopWidth: 1,
    paddingTop: SPACING.md,
    gap: SPACING.xs,
  },
  headerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.sm,
  },
  list: {
    gap: SPACING.xs,
    paddingTop: SPACING.xs,
  },
  row: {
    borderTopWidth: 1,
    paddingTop: SPACING.xs,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.sm,
  },
  fileMeta: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  fileName: {
    flex: 1,
    minWidth: 0,
  },
  removeBtn: {
    flexShrink: 0,
  },
});
