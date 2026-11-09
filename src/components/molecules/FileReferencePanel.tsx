import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
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
      <AppButton
        label={`File references${files.length ? ` (${files.length})` : ''}`}
        size="sm"
        variant="outline"
        expanded={open}
        onPress={() => setOpen(!open)}
        icon={<Paperclip size={20} color={theme.textMuted} />}
      />
      {open && (
        <View style={styles.group}>
          <AppText variant="caption" color="muted">
            Keep up to 5 file references for this session. Only names, types, and sizes are kept;
            files are not uploaded, read, or included in exports.
          </AppText>
          <View style={styles.row}>
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
          {busy && <AppText accessibilityLiveRegion="polite">Waiting for file selection…</AppText>}
          {files.length >= 5 && (
            <AppText variant="caption" color="muted">
              Remove a reference to add another.
            </AppText>
          )}
          {files.map((file) => (
            <View key={file.id} style={styles.row}>
              <AppText style={styles.name}>
                {file.name} · {Math.ceil(file.size / 1024)} KB
              </AppText>
              <AppButton
                label={`Remove ${file.name}`}
                size="sm"
                variant="ghost"
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
            <AppText color="failure" accessibilityRole="alert">
              {error}
            </AppText>
          )}
        </View>
      )}
    </View>
  );
}
const styles = StyleSheet.create({
  group: { gap: SPACING.sm },
  row: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: SPACING.sm },
  name: { flex: 1, minWidth: 0 },
});
