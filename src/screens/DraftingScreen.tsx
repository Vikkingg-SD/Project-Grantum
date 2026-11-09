import React, { useRef, useState } from 'react';
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
import { useLayoutMetrics } from '@/hooks/useLayoutMetrics';
import { GrantContext } from '@/components/molecules/GrantContext';
import { LocalAttachments } from '@/components/molecules/LocalAttachments';
import { ModalSheetLayout } from '@/components/templates/ModalSheetLayout';
import { useAppNavigation } from '@/hooks/useAppNavigation';
import { useGrantDetail } from '@/api/hooks/useGrantDetail';

export default function DraftingScreen() {
  const grantId = useActiveGrantId();
  return <DraftingSession key={grantId} grantId={grantId} />;
}

function DraftingSession({ grantId }: { grantId: string }) {
  const theme = useTheme();
  const { mobile } = useLayoutMetrics();
  const [promptsOpen, setPromptsOpen] = useState(false);
  const navigation = useAppNavigation();
  const scrollRef = useRef<ScrollView>(null);
  const scrollAfterNote = useRef(false);
  const [sectionsOpen, setSectionsOpen] = useState(false);
  const [page, setPage] = useState(0);
  const [deleteSection, setDeleteSection] = useState<string | null>(null);
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
  const pageCount = Math.max(1, Math.ceil(requiredSections.length / 3));
  const currentPage = Math.min(page, pageCount - 1);
  return (
    <ScreenContainer scrollable={false}>
      <ScrollView
        ref={scrollRef}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.content}
        onContentSizeChange={() => {
          if (scrollAfterNote.current) {
            scrollRef.current?.scrollToEnd({ animated: false });
            scrollAfterNote.current = false;
          }
        }}
      >
        <View style={styles.heading}>
          <AppText variant="h1" style={styles.flexible}>
            {DRAFTING_COPY.title}
          </AppText>
          <StatusBadge
            label={completedSections.length + '/' + requiredSections.length + ' sections present'}
            variant={verified ? 'verified' : 'pending'}
          />
        </View>
        <GrantContext grantId={grantId} />
        <AppText color="muted">
          Notes stay in this session. Edit your application narrative in Export.
        </AppText>
        <View style={styles.actions}>
          <AppButton
            label="Edit application narrative"
            variant="primary"
            onPress={() => navigation.navigateTo('export', grantId)}
          />
          <AppButton
            label={`Required sections (${completedSections.length}/${requiredSections.length})`}
            variant="outline"
            expanded={sectionsOpen}
            onPress={() => setSectionsOpen(!sectionsOpen)}
          />
        </View>
        {sectionsOpen && (
          <View
            style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}
          >
            <AppText variant="h3">Section checklist</AppText>
            <AppText variant="caption" color="muted">
              Mark presence only. This checklist does not review section content.
            </AppText>
            {requiredSections.length === 0 && (
              <AppText>No sections yet. Add a requirement below.</AppText>
            )}
            {requiredSections.slice(currentPage * 3, currentPage * 3 + 3).map((section) => (
              <View key={section} style={styles.section}>
                <AppText variant="body" style={styles.flexible}>
                  {section}
                </AppText>
                <View style={styles.actions}>
                  {completedSections.includes(section) ? (
                    <AppButton
                      label="Mark missing"
                      size="sm"
                      disabled={mutation.isPending}
                      onPress={() => mutation.mutate({ action: 'remove', sectionName: section })}
                    />
                  ) : (
                    <StatusBadge label="Missing" variant="failure" />
                  )}
                  <AppButton
                    label="Delete"
                    size="sm"
                    disabled={mutation.isPending}
                    onPress={() => setDeleteSection(section)}
                  />
                </View>
              </View>
            ))}
            <View style={styles.actions}>
              <AppButton
                label="Previous sections"
                size="sm"
                disabled={currentPage === 0}
                onPress={() => setPage(currentPage - 1)}
              />
              <AppText variant="caption">
                {String(currentPage + 1).padStart(2, '0')} / {String(pageCount).padStart(2, '0')}
              </AppText>
              <AppButton
                label="Next sections"
                size="sm"
                disabled={currentPage === pageCount - 1}
                onPress={() => setPage(currentPage + 1)}
              />
            </View>
            <View style={styles.actions}>
              <View style={styles.input}>
                <AppInput
                  accessibilityLabel="New section name"
                  placeholder="Add a required section"
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
        )}
        <AppText variant="h3">Working notes</AppText>
        {local.draftingMessages.length === 0 && detail.data && (
          <AppText color="muted">
            Start with a project idea or an evidence reference. Save a note using the field below.
          </AppText>
        )}
        <LocalAttachments grantId={grantId} />
        {mobile && (
          <AppButton
            label="Writing prompts"
            size="sm"
            expanded={promptsOpen}
            onPress={() => setPromptsOpen(!promptsOpen)}
          />
        )}
        {(!mobile || promptsOpen) && (
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
          scrollAfterNote.current = true;
          addNote(grantId, message.trim(), 'user');
          setMessage('');
        }}
      />
      <ModalSheetLayout
        visible={Boolean(deleteSection)}
        onClose={() => setDeleteSection(null)}
        accessibilityLabel="Delete required section"
      >
        <View style={styles.content}>
          <AppText variant="h2">Delete {deleteSection}?</AppText>
          <AppText>
            This removes the requirement from your checklist and changes its completeness score.
            Your notes and narrative will stay.
          </AppText>
          {mutation.isError && (
            <AppText color="failure" accessibilityRole="alert">
              {mutation.error.message}
            </AppText>
          )}
          <AppButton label="Keep section" onPress={() => setDeleteSection(null)} />
          <AppButton
            label="Delete section"
            variant="danger"
            isLoading={mutation.isPending}
            onPress={() => {
              if (deleteSection)
                mutation.mutate(
                  { action: 'deleteRequirement', sectionName: deleteSection },
                  { onSuccess: () => setDeleteSection(null) }
                );
            }}
          />
        </View>
      </ModalSheetLayout>
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
