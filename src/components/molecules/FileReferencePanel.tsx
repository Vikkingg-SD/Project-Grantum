import { ModalSheetLayout } from '../templates/ModalSheetLayout';
import { IconButton } from '../atoms/IconButton';
import React, { useState } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import Paperclip from 'lucide-react-native/icons/paperclip';
import { AppButton } from '../atoms/AppButton';
import { AppText } from '../atoms/AppText';
import { useDraftStore, EMPTY_DRAFT } from '@/store/useDraftStore';
import { ATTACHMENT_ACCEPT } from '@/utils/attachments';
import { useTheme } from '@/hooks/useTheme';
import { SPACING } from '@/config/theme';

export function FileReferencePanel({
  grantId,
  onChoose,
  busy = false,
  error,
}: {
  grantId: string;
  onChoose: (category: keyof typeof ATTACHMENT_ACCEPT) => void;
  busy?: boolean;
  error: string;
}) {
  const [open, setOpen] = useState(false);
  const theme = useTheme();
  const files = useDraftStore((s) => (s.drafts[grantId] ?? EMPTY_DRAFT).attachments);
  const setFiles = useDraftStore((s) => s.setAttachments);
  return (
    <View style={styles.group}>
      <IconButton
        label="File references"
        onPress={() => setOpen(!open)}
        icon={<Paperclip size={20} color={theme.textMuted} />}
      />
      <ModalSheetLayout
        visible={open}
        onClose={() => setOpen(false)}
        accessibilityLabel="File references"
      >
        <ScrollView
          horizontal={false}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.sheetContent}
        >
          <AppText variant="h2" align="center">
            File references
          </AppText>
          <AppText variant="caption" color="muted" align="center">
            Keep up to 5 file references for this session. Only names, types, and sizes are kept;
            files are not uploaded, read, or included in exports.
          </AppText>
          <View style={styles.centeredRow}>
            {(Object.keys(ATTACHMENT_ACCEPT) as (keyof typeof ATTACHMENT_ACCEPT)[]).map(
              (category) => (
                <AppButton
                  key={category}
                  label={`Choose ${category.toLowerCase()}`}
                  size="sm"
                  disabled={busy || files.length >= 5}
                  onPress={() => onChoose(category)}
                />
              )
            )}
          </View>
          {busy && (
            <AppText align="center" accessibilityLiveRegion="polite">
              Waiting for file selection…
            </AppText>
          )}
          {files.length >= 5 && (
            <AppText variant="caption" color="muted" align="center">
              Remove a reference to add another.
            </AppText>
          )}
          {files.map((file) => (
            <View key={file.id} style={[styles.fileItem, { borderColor: theme.border }]}>
              <AppText style={styles.name}>
                {file.name} · {Math.ceil(file.size / 1024)} KB
              </AppText>
              <AppButton
                label={`Remove ${file.name}`}
                size="sm"
                variant="ghost"
                style={styles.removeButton}
                onPress={() =>
                  setFiles(
                    grantId,
                    files.filter((item) => item.id !== file.id)
                  )
                }
              />
            </View>
          ))}
          {Boolean(error) && (
            <AppText color="failure" align="center" accessibilityRole="alert">
              {error}
            </AppText>
          )}
        </ScrollView>
      </ModalSheetLayout>
    </View>
  );
}
const styles = StyleSheet.create({
  group: { gap: SPACING.sm },
  sheetContent: { width: '100%', padding: SPACING.lg, gap: SPACING.md },
  centeredRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  fileItem: {
    width: '100%',
    gap: SPACING.xs,
    padding: SPACING.sm,
    borderWidth: 1,
    borderRadius: SPACING.sm,
  },
  name: { width: '100%', minWidth: 0 },
  removeButton: { alignSelf: 'flex-start', maxWidth: '100%' },
});
