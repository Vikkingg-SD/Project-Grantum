import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { ScreenContainer } from '@/components/templates/ScreenContainer';
import { EmptyStateLayout } from '@/components/templates/EmptyStateLayout';
import { AppText } from '@/components/atoms/AppText';
import { AppButton } from '@/components/atoms/AppButton';
import { AppInput } from '@/components/atoms/AppInput';
import { StatusBadge } from '@/components/atoms/StatusBadge';
import { ChatMessageBubble } from '@/components/molecules/ChatMessageBubble';
import { ChatInputRow } from '@/components/molecules/ChatInputRow';
import { useProposalDraft, useMutateProposalSections } from '@/api/hooks/useProposalDraft';
import { useDraftStore, EMPTY_DRAFT } from '@/store/useDraftStore';
import { useActiveGrantId } from '@/hooks/useActiveGrantId';
import { useTheme } from '@/hooks/useTheme';
import { RADIUS, SPACING } from '@/config/theme';
import { DRAFTING_COPY } from '@/config/copy';
import { useGrantDetail } from '@/api/hooks/useGrantDetail';

export default function DraftingScreen() {
  const grantId = useActiveGrantId();
  return <DraftingSession key={grantId} grantId={grantId} />;
}

function DraftingSession({ grantId }: { grantId: string }) {
  const theme = useTheme();
  const query = useProposalDraft(grantId);
  const mutation = useMutateProposalSections(grantId);
  const local = useDraftStore((state) => state.drafts[grantId] ?? EMPTY_DRAFT);
  const addNote = useDraftStore((state) => state.addDraftingMessage);
  const [message, setMessage] = useState('');
  const [sectionName, setSectionName] = useState('');
  const detail = useGrantDetail(grantId);
  if (!grantId || query.isPending || query.isError || !query.data) {
    return (
      <ScreenContainer>
        <EmptyStateLayout
          title={
            !grantId
              ? 'Select an opportunity'
              : query.isError
                ? 'Instrument fault'
                : 'Calibrating instrument…'
          }
          description={
            !grantId
              ? 'Open an application from Dashboard or Discovery to begin drafting.'
              : (query.error?.message ?? 'Loading application draft.')
          }
          ctaLabel={query.isError ? 'Try again' : undefined}
          onCtaPress={() => {
            void query.refetch();
          }}
        />
      </ScreenContainer>
    );
  }
  const { requiredSections, completedSections } = query.data;
  const verified =
    requiredSections.length > 0 &&
    requiredSections.every((section) => completedSections.includes(section));
  return (
    <ScreenContainer scrollable={false}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
        <View style={styles.heading}>
          <AppText variant="h1" style={styles.flexible}>
            {DRAFTING_COPY.title}
          </AppText>
          <StatusBadge
            label={completedSections.length + '/' + requiredSections.length + ' sections verified'}
            variant={verified ? 'verified' : 'pending'}
          />
        </View>
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <AppText variant="caption" color="muted">
            APPLICATION DRAFT — REQUIRED SECTIONS
          </AppText>
          {requiredSections.map((section) => (
            <View key={section} style={styles.section}>
              <AppText variant="body" style={styles.flexible}>
                {section}
              </AppText>
              <View style={styles.actions}>
                {completedSections.includes(section) && (
                  <AppButton
                    label="Mark missing"
                    size="sm"
                    disabled={mutation.isPending}
                    onPress={() => mutation.mutate({ action: 'remove', sectionName: section })}
                  />
                )}
                <AppButton
                  label="Delete"
                  size="sm"
                  disabled={mutation.isPending}
                  onPress={() =>
                    mutation.mutate({ action: 'deleteRequirement', sectionName: section })
                  }
                />
              </View>
            </View>
          ))}
          <View style={styles.actions}>
            <View style={styles.input}>
              <AppInput
                placeholder="Add section (e.g. Moat)"
                value={sectionName}
                onChangeText={setSectionName}
              />
            </View>
            <AppButton
              label="Add"
              size="sm"
              disabled={mutation.isPending || !sectionName.trim()}
              onPress={() => {
                const name = sectionName.trim();
                mutation.mutate(
                  { action: 'add', sectionName: name },
                  {
                    onSuccess: () =>
                      setSectionName((current) => (current.trim() === name ? '' : current)),
                  }
                );
              }}
            />
          </View>
          {!verified && requiredSections.length > 0 && (
            <AppButton
              label="Restore all sections"
              disabled={mutation.isPending}
              onPress={() => mutation.mutate({ action: 'restore' })}
            />
          )}
          {mutation.isError && (
            <AppText color="failure" accessibilityRole="alert">
              {mutation.error.message}
            </AppText>
          )}
        </View>
        <View style={styles.actions}>
          {DRAFTING_COPY.chips.map((chip) => (
            <AppButton
              key={chip}
              label={chip}
              size="sm"
              style={styles.flexible}
              onPress={() => setMessage(chip)}
            />
          ))}
        </View>
        <AppText variant="caption" color="muted">
          Local drafting notes. Narrative generation is not connected.
        </AppText>
        {detail.data && (
          <View style={styles.card}>
            <AppText variant="caption" color="muted">
              Local preview
            </AppText>
            <ChatMessageBubble
              text={DRAFTING_COPY.welcome(detail.data.title, detail.data.funder)}
              variant="assistant-narrative"
              timestamp="now"
            />
          </View>
        )}
        {local.draftingMessages.map((item) => (
          <ChatMessageBubble key={item.id} {...item} />
        ))}
      </ScrollView>
      <ChatInputRow
        value={message}
        onChangeText={setMessage}
        onSend={() => {
          if (!message.trim()) return;
          addNote(grantId, message.trim(), 'user');
          setMessage('');
        }}
      />
    </ScreenContainer>
  );
}
const styles = StyleSheet.create({
  content: { padding: SPACING.lg, gap: SPACING.lg },
  heading: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: SPACING.sm },
  flexible: { flexShrink: 1, minWidth: 0 },
  card: { padding: SPACING.md, borderRadius: RADIUS.md, borderWidth: 1, gap: SPACING.md },
  section: { gap: SPACING.sm },
  actions: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: SPACING.sm },
  input: { flexGrow: 1, flexShrink: 1, minWidth: '60%' },
});
