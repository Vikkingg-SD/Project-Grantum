import { DraftWorkbenchPanel } from '@/components/organisms/DraftWorkbenchPanel';
import { WorkspaceStudioBar } from '@/components/organisms/WorkspaceStudioBar';
import ArrowLeft from 'lucide-react-native/icons/arrow-left';
import ArrowRight from 'lucide-react-native/icons/arrow-right';
import { IconButton } from '@/components/atoms/IconButton';
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
import { useWorkbenchStore } from '@/store/useWorkbenchStore';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';
import { useActiveGrantId } from '@/hooks/useActiveGrantId';
import { useTheme } from '@/hooks/useTheme';
import { RADIUS, SPACING } from '@/config/theme';
import { DRAFTING_COPY } from '@/config/copy';
import { useLayoutMetrics } from '@/hooks/useLayoutMetrics';
import { GrantContext } from '@/components/molecules/GrantContext';
import { ModalSheetLayout } from '@/components/templates/ModalSheetLayout';
import { useGrantDetail } from '@/api/hooks/useGrantDetail';
import { syncGrantRequirements } from '@/utils/drafting';
import { workSlotKey } from '@/utils/workspace';

export default function DraftingScreen() {
  const grantId = useActiveGrantId();
  return <DraftingSession key={grantId} grantId={grantId} />;
}

function DraftingSession({ grantId }: { grantId: string }) {
  const theme = useTheme();
  const { mobile } = useLayoutMetrics();
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [optionsTab, setOptionsTab] = useState<'templates' | 'prompts'>('templates');
  const [workbenchOpen, setWorkbenchOpen] = useState(false);
  const [promptsOpen, setPromptsOpen] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const scrollAfterNote = useRef(false);
  const [sectionsOpen, setSectionsOpen] = useState(false);
  const [page, setPage] = useState(0);
  const [deleteSection, setDeleteSection] = useState<string | null>(null);
  const query = useProposalDraft(grantId);
  const mutation = useMutateProposalSections(grantId);
  const local = useDraftStore((state) => state.drafts[grantId] ?? EMPTY_DRAFT);
  const addNote = useDraftStore((state) => state.addDraftingMessage);
  const updateWorkbench = useWorkbenchStore((state) => state.update);
  const activeProjectId = useWorkspaceStore((state) => state.activeProjectId);
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
  const trackReqs = detail.data?.requirements ?? requiredSections;
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
          <AppText variant="h1" align="center" style={styles.fullWidth}>
            {DRAFTING_COPY.title}
          </AppText>
          <StatusBadge
            label={completedSections.length + '/' + requiredSections.length + ' sections present'}
            variant={verified ? 'verified' : 'pending'}
            style={styles.fullWidth}
          />
        </View>
        <GrantContext grantId={grantId} />
        <WorkspaceStudioBar />
        <View>
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
            <AppText variant="h3" align="center">
              Section checklist
            </AppText>
            <AppText variant="caption" color="muted" align="center">
              Mark presence only. This checklist does not review section content.
            </AppText>
            {requiredSections.length === 0 && (
              <AppText align="center">No sections yet. Add a requirement below.</AppText>
            )}
            {requiredSections.slice(currentPage * 3, currentPage * 3 + 3).map((section) => (
              <View key={section} style={[styles.section, { borderColor: theme.border }]}>
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
            <View style={styles.centeredActions}>
              <IconButton
                label="Previous sections"
                icon={<ArrowLeft size={20} color={theme.textMain} />}
                disabled={currentPage === 0}
                onPress={() => setPage(currentPage - 1)}
              />
              <AppText variant="caption">
                {String(currentPage + 1).padStart(2, '0')} / {String(pageCount).padStart(2, '0')}
              </AppText>
              <IconButton
                label="Next sections"
                icon={<ArrowRight size={20} color={theme.textMain} />}
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
        <AppText variant="h3" align="center">
          Agent chat
        </AppText>
        {local.draftingMessages.length === 0 && detail.data && (
          <AppText color="muted" align="center">
            Agent offline - messages stay in this session.
          </AppText>
        )}
        {mobile && (
          <AppButton
            label="Writing prompts"
            size="sm"
            expanded={promptsOpen}
            onPress={() => setPromptsOpen(!promptsOpen)}
          />
        )}
        {(!mobile || promptsOpen) && (
          <View style={styles.centeredActions}>
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
      <DraftWorkbenchPanel
        key={`${activeProjectId}:${grantId}`}
        grantId={grantId}
        grantRequirements={trackReqs}
        visible={workbenchOpen}
        onClose={() => setWorkbenchOpen(false)}
      />
      <ModalSheetLayout
        visible={optionsOpen}
        onClose={() => setOptionsOpen(false)}
        accessibilityLabel="Drafting options"
      >
        <View style={styles.content}>
          <AppText variant="h2">Drafting Options & Studio Menu</AppText>
          <View style={styles.actions}>
            <AppButton
              size="sm"
              label="Tab 1: Form & Track Templates"
              selected={optionsTab === 'templates'}
              onPress={() => setOptionsTab('templates')}
            />
            <AppButton
              size="sm"
              label="Tab 2: Quick Convenience Prompts"
              selected={optionsTab === 'prompts'}
              onPress={() => setOptionsTab('prompts')}
            />
          </View>

          {optionsTab === 'templates' ? (
            <View style={{ gap: SPACING.md }}>
              <AppText color="muted">
                Launch the split-pane Drafting & History Studio or copy catalog requirements into
                your active project work slot. Catalog text has not been checked against an official
                source.
              </AppText>
              <AppButton
                label="Form templates"
                variant="primary"
                onPress={() => {
                  setOptionsOpen(false);
                  setWorkbenchOpen(true);
                }}
              />
              {trackReqs.length > 0 && (
                <AppButton
                  label={`Copy ${trackReqs.length} catalog requirements into Studio`}
                  variant="outline"
                  onPress={() => {
                    const slot = workSlotKey(activeProjectId, grantId);
                    updateWorkbench(slot, (current) =>
                      syncGrantRequirements(current, trackReqs, '')
                    );
                    setOptionsOpen(false);
                    setWorkbenchOpen(true);
                  }}
                />
              )}
            </View>
          ) : (
            <View style={{ gap: SPACING.sm }}>
              <AppText color="muted">
                Tap a convenience prompt to populate the chat composer without cluttering the
                drafting canvas:
              </AppText>
              {DRAFTING_COPY.chips.map((chip) => (
                <AppButton
                  key={chip}
                  label={chip}
                  variant="outline"
                  onPress={() => {
                    setMessage(chip);
                    setOptionsOpen(false);
                  }}
                />
              ))}
              {trackReqs.slice(0, 3).map((req) => (
                <AppButton
                  key={`prompt-${req}`}
                  label={`Draft evidence-backed response for: ${req}`}
                  variant="ghost"
                  onPress={() => {
                    setMessage(`Draft evidence-backed response for: ${req}`);
                    setOptionsOpen(false);
                  }}
                />
              ))}
            </View>
          )}
        </View>
      </ModalSheetLayout>
      <ChatInputRow
        onOptions={() => setOptionsOpen(true)}
        grantId={grantId}
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
          <AppText variant="h2" align="center">
            Delete {deleteSection}?
          </AppText>
          <AppText align="center">
            This removes the requirement from your checklist and changes its completeness score.
            Your notes and narrative will stay.
          </AppText>
          {mutation.isError && (
            <AppText color="failure" align="center" accessibilityRole="alert">
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
  heading: { alignItems: 'center', gap: SPACING.sm },
  fullWidth: { width: '100%' },
  flexible: { flexShrink: 1, minWidth: 0 },
  card: { padding: SPACING.md, borderRadius: RADIUS.md, borderWidth: 1, gap: SPACING.md },
  section: {
    gap: SPACING.sm,
    padding: SPACING.md,
    borderWidth: 1,
    borderRadius: RADIUS.sm,
  },
  actions: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: SPACING.sm },
  centeredActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
  },
  input: { flexGrow: 1, flexShrink: 1, minWidth: '60%' },
});
