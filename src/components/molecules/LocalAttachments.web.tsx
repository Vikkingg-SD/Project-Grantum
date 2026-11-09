import React, { useRef, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { AppButton } from '../atoms/AppButton';
import { AppText } from '../atoms/AppText';
import { useDraftStore, EMPTY_DRAFT } from '@/store/useDraftStore';
import { ATTACHMENT_ACCEPT, attachmentError } from '@/utils/attachments';
import { generateId } from '@/utils/uuid';
import { SPACING } from '@/config/theme';

export function LocalAttachments({ grantId }: { grantId: string }) {
  const input = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
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
      />
      {open && (
        <View style={styles.group}>
          <AppText variant="caption" color="muted">
            Keep up to 5 file references for this session. Only names and sizes are kept; files are
            not uploaded, read, or included in exports.
          </AppText>
          <View style={styles.row}>
            {Object.entries(ATTACHMENT_ACCEPT).map(([label, accept]) => (
              <AppButton
                key={label}
                label={`Choose ${label.toLowerCase()}`}
                size="sm"
                disabled={files.length >= 5}
                onPress={() => {
                  if (input.current) {
                    input.current.accept = accept;
                    input.current.click();
                  }
                }}
              />
            ))}
          </View>
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
      <input
        ref={input}
        type="file"
        aria-label="Choose local file reference"
        style={{ display: 'none' }}
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = '';
          if (!file) return;
          const invalid = attachmentError(file);
          if (invalid || files.length >= 5) {
            setError(invalid ?? 'Remove a reference before adding another.');
            return;
          }
          setFiles(grantId, [
            ...files,
            { id: generateId('file'), name: file.name, type: file.type, size: file.size },
          ]);
          setError('');
        }}
      />
    </View>
  );
}
const styles = StyleSheet.create({
  group: { gap: SPACING.sm },
  row: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: SPACING.sm },
  name: { flex: 1, minWidth: 0 },
});
