import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { AppButton } from '@/components/atoms/AppButton';
import { AppInput } from '@/components/atoms/AppInput';
import { AppText } from '@/components/atoms/AppText';
import { ModalSheetLayout } from '@/components/templates/ModalSheetLayout';
import {
  hydrateSourceSuggestions,
  useSourceSuggestionStore,
} from '@/store/useSourceSuggestionStore';
import { validateSource } from '@/utils/sourceSuggestions';
import { useTheme } from '@/hooks/useTheme';
import { SPACING } from '@/config/theme';

export function SourceSuggestions() {
  const theme = useTheme();
  const { entries, hydrated, status, add } = useSourceSuggestionStore();
  const [open, setOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [note, setNote] = useState('');
  const [attempted, setAttempted] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    void hydrateSourceSuggestions();
  }, []);
  const errors = attempted ? validateSource(title, url, note) : { title: '', url: '', note: '' };
  const close = () => {
    setOpen(false);
    setAttempted(false);
    setError('');
  };
  return (
    <View style={styles.section}>
      <View style={styles.actions}>
        <AppButton
          label="Suggest a source"
          variant="outline"
          onPress={() => {
            setTitle('');
            setUrl('');
            setNote('');
            setOpen(true);
            setAttempted(false);
            setError('');
          }}
        />
        <AppButton
          label={`Your saved sources (${entries.length})`}
          variant="ghost"
          expanded={historyOpen}
          onPress={() => setHistoryOpen(!historyOpen)}
        />
      </View>
      {entries.length > 0 && (
        <AppText accessibilityLiveRegion="polite" color="muted">
          {status === 'saving'
            ? 'Saving source…'
            : status === 'device-saved'
              ? 'Source saved to your list. Moderation submission will activate once connected.'
              : 'Storage unavailable; copy your details before leaving.'}
        </AppText>
      )}
      {historyOpen && (
        <View style={styles.section}>
          <AppText variant="h2">Your saved sources</AppText>
          <AppText color="muted">Your personal source list awaiting moderation submission.</AppText>
          {!hydrated ? (
            <AppText>Loading saved sources…</AppText>
          ) : !entries.length ? (
            <AppText>No sources saved yet.</AppText>
          ) : (
            entries.map((entry) => (
              <View key={entry.id} style={[styles.entry, { borderTopColor: theme.border }]}>
                <AppText variant="h3">{entry.title}</AppText>
                <AppText selectable style={styles.url}>
                  {entry.url}
                </AppText>
                {entry.note ? <AppText>{entry.note}</AppText> : null}
                <AppText variant="caption" color="muted">
                  {new Date(entry.createdAt).toLocaleDateString()} · Not submitted
                </AppText>
              </View>
            ))
          )}
        </View>
      )}
      <ModalSheetLayout visible={open} onClose={close} accessibilityLabel="Suggest a source">
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.form}>
          <AppText variant="h2">Suggest a source</AppText>
          <AppText>Save official opportunity sources for catalog moderation.</AppText>
          <AppInput
            label="Source title (required)"
            value={title}
            onChangeText={setTitle}
            maxLength={160}
            error={errors.title}
          />
          <AppInput
            label="Official source URL (required)"
            value={url}
            onChangeText={setUrl}
            maxLength={2048}
            error={errors.url}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            placeholder="https://foundation.org/funding-call"
          />
          <AppInput
            label="Why is this useful? (optional)"
            value={note}
            onChangeText={setNote}
            maxLength={1000}
            error={errors.note}
            multiline
          />
          {error ? (
            <AppText accessibilityRole="alert" color="failureText">
              {error}
            </AppText>
          ) : null}
          <AppButton
            label="Save source"
            disabled={!hydrated || status === 'saving'}
            onPress={() => {
              setAttempted(true);
              if (Object.values(validateSource(title, url, note)).some(Boolean)) return;
              const result = add(title, url, note);
              if (result) {
                setError(result);
                return;
              }
              setHistoryOpen(true);
              close();
            }}
          />
          <AppButton label="Cancel" variant="ghost" onPress={close} />
          <AppText variant="caption" color="muted">
            A free-month bounty applies to newly verified sources once moderation connects.
          </AppText>
        </ScrollView>
      </ModalSheetLayout>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: SPACING.md },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  form: { padding: SPACING.lg, gap: SPACING.md },
  entry: { borderTopWidth: 1, paddingTop: SPACING.md, gap: SPACING.sm },
  url: { flexShrink: 1 },
});
