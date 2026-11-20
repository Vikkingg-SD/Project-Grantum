import { EligibilityPreflightPanel } from '@/components/organisms/EligibilityPreflightPanel';
import { WorkspaceStudioBar } from '@/components/organisms/WorkspaceStudioBar';
import ArrowLeft from 'lucide-react-native/icons/arrow-left';
import ArrowRight from 'lucide-react-native/icons/arrow-right';
import Plus from 'lucide-react-native/icons/plus';
import { IconButton } from '@/components/atoms/IconButton';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, View, type ViewStyle } from 'react-native';
import { ScreenContainer } from '@/components/templates/ScreenContainer';
import { EmptyStateLayout } from '@/components/templates/EmptyStateLayout';
import { AppText } from '@/components/atoms/AppText';
import { AppButton } from '@/components/atoms/AppButton';
import { AppInput } from '@/components/atoms/AppInput';
import { AppTextArea } from '@/components/atoms/AppTextArea';
import { StatusBadge } from '@/components/atoms/StatusBadge';
import { ChatMessageBubble } from '@/components/molecules/ChatMessageBubble';
import { ChatInputRow } from '@/components/molecules/ChatInputRow';
import { AgentToolsMenu, type AgentToolDefinition } from '@/components/molecules/AgentToolsMenu';
import { useProposalDraft, useMutateProposalSections } from '@/api/hooks/useProposalDraft';
import { useDraftStore, EMPTY_DRAFT } from '@/store/useDraftStore';
import { useWorkbenchStore, EMPTY_WORKBENCH } from '@/store/useWorkbenchStore';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';
import { useActiveGrantId } from '@/hooks/useActiveGrantId';
import { buildActiveSectionItems } from '@/hooks/useApplicationAuditState';
import { useEscapeDismiss } from '@/hooks/useEscapeDismiss';
import { useReduceMotion } from '@/hooks/useReduceMotion';
import { useTheme } from '@/hooks/useTheme';
import { ENV } from '@/config/env';
import { FONT } from '@/config/fonts';
import { LAYOUT } from '@/config/layout';
import { RADIUS, SPACING } from '@/config/theme';
import { DRAFTING_COPY } from '@/config/copy';
import { useLayoutMetrics } from '@/hooks/useLayoutMetrics';
import { GrantContext } from '@/components/molecules/GrantContext';
import { ModalSheetLayout } from '@/components/templates/ModalSheetLayout';
import { useGrantDetail } from '@/api/hooks/useGrantDetail';
import { removeWorkbenchSection, upsertWorkbenchSection } from '@/utils/drafting';
import { findKnownSection, normalizeSectionTitle } from '@/utils/sectionCatalog';
import { workSlotKey } from '@/utils/workspace';

export default function DraftingScreen() {
  const grantId = useActiveGrantId();
  const activeProjectId = useWorkspaceStore((state) => state.activeProjectId);
  const slotKey = grantId ? workSlotKey(activeProjectId, grantId) : '';
  return <DraftingSession key={slotKey} grantId={grantId} slotKey={slotKey} />;
}

function DraftingSession({ grantId, slotKey }: { grantId: string; slotKey: string }) {
  const theme = useTheme();
  const reduceMotion = useReduceMotion();
  const { mobile } = useLayoutMetrics();
  const [toolsOpen, setToolsOpen] = useState(false);
  const [activeTool, setActiveTool] = useState<AgentToolDefinition | null>(null);
  const [promptsOpen, setPromptsOpen] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const scrollAfterNote = useRef(false);
  const prevAttachmentCount = useRef(0);
  const [sectionsOpen, setSectionsOpen] = useState(false);
  const [addFormOpen, setAddFormOpen] = useState(false);
  useEscapeDismiss(sectionsOpen, () => setSectionsOpen(false));
  useEscapeDismiss(mobile && promptsOpen, () => setPromptsOpen(false));
  const [page, setPage] = useState(0);
  const [deleteSection, setDeleteSection] = useState<string | null>(null);
  const [detailTitle, setDetailTitle] = useState<string | null>(null);
  const [detailDraftText, setDetailDraftText] = useState('');
  const [detailCustomDesc, setDetailCustomDesc] = useState('');
  const [detailNotice, setDetailNotice] = useState('');

  const query = useProposalDraft(grantId);
  const mutation = useMutateProposalSections(grantId);
  const local = useDraftStore((state) => state.drafts[slotKey] ?? EMPTY_DRAFT);
  const addNote = useDraftStore((state) => state.addDraftingMessage);
  const setAttachments = useDraftStore((state) => state.setAttachments);
  const markContentChanged = useDraftStore((state) => state.markContentChanged);
  const work = useWorkbenchStore((state) => state.work[slotKey] ?? EMPTY_WORKBENCH);
  const updateWorkbench = useWorkbenchStore((state) => state.update);
  const workspace = useWorkspaceStore((state) => state.workspace);
  const activeProjectId = useWorkspaceStore((state) => state.activeProjectId);

  useEffect(() => {
    if (local.attachments.length > 0 && prevAttachmentCount.current === 0) {
      scrollRef.current?.scrollToEnd({ animated: false });
    }
    prevAttachmentCount.current = local.attachments.length;
  }, [local.attachments.length]);

  const [message, setMessage] = useState('');
  const [sectionName, setSectionName] = useState('');
  const [sectionDesc, setSectionDesc] = useState('');
  const [sectionError, setSectionError] = useState('');
  const detail = useGrantDetail(grantId);
  const activeProject =
    workspace.projects.find((p) => p.id === activeProjectId) ?? workspace.projects[0];
  const activeApp = workspace.applications.find(
    (app) => app.projectId === activeProjectId && app.grantId === grantId
  );
  const activeRevision = workspace.revisions.find(
    (r) => r.id === (activeApp?.profileRevisionId ?? activeProject?.currentRevisionId)
  );

  const rawRequired = query.data?.requiredSections;
  const rawCompleted = query.data?.completedSections;

  const sectionItems = useMemo(
    () => buildActiveSectionItems(rawRequired ?? [], rawCompleted ?? [], work),
    [rawCompleted, rawRequired, work]
  );

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

  const completeCount = sectionItems.filter((item) => item.completionPct >= 100).length;
  const allComplete = sectionItems.length > 0 && completeCount === sectionItems.length;
  const pageCount = Math.max(1, Math.ceil(sectionItems.length / 3));
  const currentPage = Math.min(page, pageCount - 1);
  const trackReqs =
    sectionItems.length > 0
      ? sectionItems.map((item) => item.title)
      : (detail.data?.requirements ?? query.data.requiredSections);

  const matchedKnownNew = findKnownSection(sectionName);
  const selectedItem = detailTitle
    ? sectionItems.find(
        (item) => normalizeSectionTitle(item.title) === normalizeSectionTitle(detailTitle)
      )
    : undefined;

  const openSectionDetail = (item: (typeof sectionItems)[number]) => {
    setDetailTitle(item.title);
    setDetailDraftText(item.text);
    setDetailCustomDesc(item.description);
    setDetailNotice('');
  };

  const handleAddSection = () => {
    const clean = sectionName.trim().replace(/\s+/g, ' ');
    if (!clean) {
      setSectionError('Enter a section name.');
      return;
    }
    const exists = sectionItems.some(
      (item) => normalizeSectionTitle(item.title) === normalizeSectionTitle(clean)
    );
    if (exists) {
      setSectionError(`"${clean}" is already in your required sections.`);
      return;
    }
    const known = findKnownSection(clean);
    const displayTitle = known ? known.title : clean;
    updateWorkbench(slotKey, (current) =>
      upsertWorkbenchSection(current, {
        title: displayTitle,
        text: '',
        description: known ? undefined : sectionDesc.trim() || undefined,
      })
    );
    markContentChanged(slotKey);
    if (
      ENV.DATA_SOURCE !== 'mock' &&
      query.data?.requiredSections.includes(displayTitle) === false
    ) {
      mutation.mutate({ action: 'add', sectionName: displayTitle });
    }
    setSectionName('');
    setSectionDesc('');
    setSectionError('');
    setAddFormOpen(false);
    setPage(Math.max(0, Math.ceil((sectionItems.length + 1) / 3) - 1));
  };

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
            label={`${completeCount}/${sectionItems.length} sections complete`}
            variant={allComplete ? 'verified' : 'pending'}
            style={styles.fullWidth}
          />
        </View>
        <GrantContext grantId={grantId} />
        <WorkspaceStudioBar />
        {detail.data ? (
          <EligibilityPreflightPanel
            grant={detail.data}
            requirements={trackReqs}
            project={activeProject}
            revision={activeRevision}
            onApplyToChat={(brief) => setMessage(brief)}
          />
        ) : null}
        <View>
          <AppButton
            label={`Required sections (${completeCount}/${sectionItems.length})`}
            variant="outline"
            expanded={sectionsOpen}
            onPress={() => setSectionsOpen(!sectionsOpen)}
          />
        </View>
        {sectionsOpen && (
          <View
            testID="required-sections-panel"
            style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}
          >
            <View style={styles.panelHeader}>
              <View style={styles.flexible}>
                <AppText variant="h3">Required sections</AppText>
                <AppText variant="caption" color="muted">
                  Tap any orange section to read what it requires and track drafting progress. This
                  ordered list guides the agent step by step.
                </AppText>
              </View>
              <AppButton
                label="Add section"
                size="sm"
                variant="outline"
                icon={<Plus size={16} color={theme.textMain} />}
                expanded={addFormOpen}
                onPress={() => {
                  setAddFormOpen((current) => !current);
                  setSectionError('');
                }}
              />
            </View>

            {sectionItems.length === 0 && (
              <AppText align="center" color="muted">
                No required sections yet. Add a section below to guide the drafting agent.
              </AppText>
            )}

            {sectionItems.slice(currentPage * 3, currentPage * 3 + 3).map((item, idx) => {
              const absoluteIdx = currentPage * 3 + idx;
              const badgeVariant =
                item.completionPct >= 100
                  ? 'verified'
                  : item.completionPct > 0
                    ? 'pending'
                    : 'failure';
              return (
                <View
                  key={normalizeSectionTitle(item.title)}
                  style={[styles.sectionRow, { borderBottomColor: theme.border }]}
                >
                  <Pressable
                    testID={`required-section-link-${absoluteIdx}`}
                    accessibilityRole="button"
                    accessibilityLabel={`${item.title} requirements`}
                    onPress={() => openSectionDetail(item)}
                    style={({ pressed }) => [
                      styles.sectionLinkButton,
                      Platform.OS === 'web' && !reduceMotion && webLinkTransition,
                      { opacity: pressed ? 0.72 : 1 },
                    ]}
                  >
                    <AppText
                      variant="body"
                      color="primary"
                      style={[
                        styles.sectionLinkText,
                        { color: theme.primaryText, textDecorationColor: theme.primaryText },
                      ]}
                    >
                      {item.title}
                    </AppText>
                  </Pressable>
                  <View style={styles.actions}>
                    <StatusBadge label={`${item.completionPct}% complete`} variant={badgeVariant} />
                    <AppButton
                      label="Delete"
                      size="sm"
                      disabled={mutation.isPending}
                      onPress={() => setDeleteSection(item.title)}
                    />
                  </View>
                </View>
              );
            })}

            {sectionItems.length > 0 && (
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
            )}

            {(addFormOpen || sectionItems.length === 0) && (
              <View
                testID="add-section-form"
                style={[styles.addBox, { borderTopColor: theme.border }]}
              >
                <AppInput
                  label="New section name"
                  placeholder="Enter custom or standard section title"
                  value={sectionName}
                  maxLength={80}
                  onChangeText={(text) => {
                    setSectionName(text);
                    if (sectionError) setSectionError('');
                  }}
                />
                {matchedKnownNew ? (
                  <AppText variant="caption" color="muted">
                    Standard section requirement (fixed): {matchedKnownNew.description}
                  </AppText>
                ) : (
                  <AppTextArea
                    label="What this section requires"
                    placeholder="Describe what the applicant and agent should cover in this section"
                    value={sectionDesc}
                    charLimit={600}
                    onChangeText={setSectionDesc}
                  />
                )}
                {sectionError ? (
                  <AppText variant="caption" color="failureText" accessibilityRole="alert">
                    {sectionError}
                  </AppText>
                ) : null}
                <View style={styles.actions}>
                  <AppButton
                    label="Save section"
                    size="sm"
                    variant="primary"
                    disabled={mutation.isPending || !sectionName.trim()}
                    onPress={handleAddSection}
                  />
                  {sectionItems.length > 0 && (
                    <AppButton
                      label="Cancel"
                      size="sm"
                      variant="ghost"
                      onPress={() => {
                        setAddFormOpen(false);
                        setSectionError('');
                      }}
                    />
                  )}
                </View>
              </View>
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
        <AppText testID="drafting-llm-disclosure" variant="caption" color="muted" align="center">
          {DRAFTING_COPY.llmDisclosure}
        </AppText>

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

      <AgentToolsMenu
        visible={toolsOpen}
        onClose={() => setToolsOpen(false)}
        selectedToolId={activeTool?.id ?? null}
        onSelectTool={(tool) => setActiveTool(tool)}
        onSelectPrompt={(prompt) => setMessage(prompt)}
        requiredSections={sectionItems.map((item) => item.title)}
      />

      <ChatInputRow
        onOptions={() => setToolsOpen(true)}
        optionsLabel="Tools and prompts"
        activeTool={activeTool}
        onClearTool={() => setActiveTool(null)}
        draftKey={slotKey}
        value={message}
        onChangeText={setMessage}
        onSend={() => {
          if (!message.trim() && local.attachments.length === 0) return;
          scrollAfterNote.current = true;
          addNote(slotKey, message.trim(), 'user', {
            attachments: local.attachments,
            toolLabel: activeTool?.label,
          });
          if (local.attachments.length > 0) setAttachments(slotKey, []);
          if (activeTool) setActiveTool(null);
          setMessage('');
        }}
      />

      <ModalSheetLayout
        visible={Boolean(selectedItem)}
        onClose={() => setDetailTitle(null)}
        accessibilityLabel={selectedItem ? `${selectedItem.title} requirements` : 'Section details'}
      >
        {selectedItem && (
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
            <View style={styles.panelHeader}>
              <AppText variant="h2" color="primary" style={styles.flexible}>
                {selectedItem.title}
              </AppText>
              <View style={styles.actions}>
                <StatusBadge
                  label={`${selectedItem.completionPct}% complete`}
                  variant={
                    selectedItem.completionPct >= 100
                      ? 'verified'
                      : selectedItem.completionPct > 0
                        ? 'pending'
                        : 'failure'
                  }
                />
                <StatusBadge
                  label={selectedItem.isFixed ? 'Standard (fixed)' : 'Custom'}
                  variant={selectedItem.isFixed ? 'neutral' : 'brand'}
                />
              </View>
            </View>

            <View style={{ gap: SPACING.xs }}>
              <AppText variant="label">What this section requires</AppText>
              {selectedItem.isFixed ? (
                <>
                  <AppText testID="section-fixed-description">{selectedItem.description}</AppText>
                  <AppText variant="caption" color="muted">
                    Standard template section requirements remain fixed across templates.
                  </AppText>
                </>
              ) : (
                <>
                  <AppTextArea
                    label="Custom section description"
                    value={detailCustomDesc}
                    charLimit={600}
                    onChangeText={setDetailCustomDesc}
                  />
                  <AppButton
                    label="Save description"
                    size="sm"
                    variant="outline"
                    onPress={() => {
                      updateWorkbench(slotKey, (current) =>
                        upsertWorkbenchSection(current, {
                          title: selectedItem.title,
                          description: detailCustomDesc,
                        })
                      );
                      markContentChanged(slotKey);
                      setDetailNotice('Saved custom section description.');
                    }}
                  />
                </>
              )}
            </View>

            <View style={{ gap: SPACING.xs }}>
              <AppTextArea
                label="Section draft content"
                placeholder={`Write your ${selectedItem.title} response here...`}
                value={detailDraftText}
                charLimit={10000}
                onChangeText={setDetailDraftText}
              />
              <View style={styles.actions}>
                <AppButton
                  label="Save section draft"
                  size="sm"
                  variant="primary"
                  onPress={() => {
                    updateWorkbench(slotKey, (current) =>
                      upsertWorkbenchSection(current, {
                        title: selectedItem.title,
                        text: detailDraftText,
                        description: selectedItem.isFixed ? undefined : detailCustomDesc,
                      })
                    );
                    markContentChanged(slotKey);
                    setDetailNotice('Section draft saved. Run Audit again before exporting.');
                  }}
                />
                <AppButton
                  label="Ask agent about this section"
                  size="sm"
                  variant="outline"
                  onPress={() => {
                    setMessage(
                      `Help me draft "${selectedItem.title}": ${selectedItem.description}`
                    );
                    setDetailTitle(null);
                  }}
                />
              </View>
            </View>

            {detailNotice ? (
              <AppText variant="caption" color="verified" accessibilityLiveRegion="polite">
                {detailNotice}
              </AppText>
            ) : null}

            <AppButton label="Done" variant="ghost" onPress={() => setDetailTitle(null)} />
          </ScrollView>
        )}
      </ModalSheetLayout>

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
            Your chat notes will stay.
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
              if (!deleteSection) return;
              const target = deleteSection;
              updateWorkbench(slotKey, (current) => removeWorkbenchSection(current, target));
              markContentChanged(slotKey);
              if (ENV.DATA_SOURCE !== 'mock' && query.data.requiredSections.includes(target)) {
                mutation.mutate(
                  { action: 'deleteRequirement', sectionName: target },
                  { onSuccess: () => setDeleteSection(null) }
                );
              } else {
                setDeleteSection(null);
              }
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
  panelHeader: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.sm,
  },
  sectionRow: {
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    gap: SPACING.xs,
  },
  sectionLinkButton: {
    minHeight: LAYOUT.minTouchTarget,
    justifyContent: 'center',
    alignSelf: 'flex-start',
    maxWidth: '100%',
  },
  sectionLinkText: {
    fontFamily: FONT.sans.semibold,
    textDecorationLine: 'underline',
  },
  addBox: {
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    gap: SPACING.sm,
  },
  actions: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: SPACING.sm },
  centeredActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
  },
});

const webLinkTransition = {
  transitionProperty: 'opacity',
  transitionDuration: '120ms',
  transitionTimingFunction: 'cubic-bezier(0.23, 1, 0.32, 1)',
} as ViewStyle;
