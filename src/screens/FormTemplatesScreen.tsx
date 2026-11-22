import React, { useMemo, useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import Check from 'lucide-react-native/icons/check';
import Plus from 'lucide-react-native/icons/plus';
import { AppButton } from '@/components/atoms/AppButton';
import { AppInput } from '@/components/atoms/AppInput';
import { AppText } from '@/components/atoms/AppText';
import { AppTextArea } from '@/components/atoms/AppTextArea';
import { StatusBadge } from '@/components/atoms/StatusBadge';
import { WorkspaceStudioBar } from '@/components/organisms/WorkspaceStudioBar';
import { ScreenContainer } from '@/components/templates/ScreenContainer';
import { queryKeys } from '@/api/queryKeys';
import { styles } from './workspacePageStyles';
import { useTheme } from '@/hooks/useTheme';
import { useLayoutMetrics } from '@/hooks/useLayoutMetrics';
import { useDraftStore } from '@/store/useDraftStore';
import { useWorkbenchStore, EMPTY_WORKBENCH } from '@/store/useWorkbenchStore';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';
import { useProgressStore } from '@/store/useProgressStore';
import {
  applySelectedTemplate,
  mergeTemplateInitialSections,
  type EditableTemplateSection,
} from '@/utils/drafting';
import { canRolePerform, workSlotKey } from '@/utils/workspace';
import {
  findKnownSection,
  isKnownSection,
  KNOWN_SECTION_CATALOG,
  normalizeSectionTitle,
  OUTPUT_KIND_OPTIONS,
  PROJECT_KIND_OPTIONS,
  resolveSectionDescription,
  TEMPLATE_TYPE_SECTIONS,
} from '@/utils/sectionCatalog';
import type { CoWorkRole, OutputKind, ProjectKind } from '@/types/workspace';

const ROLE_LABELS: Record<CoWorkRole, string> = {
  owner: 'Owner',
  editor: 'Editor',
  reviewer: 'Reviewer',
  viewer: 'Viewer',
};

export default function FormTemplatesScreen() {
  const workspace = useWorkspaceStore((state) => state.workspace);
  const activeProjectId = useWorkspaceStore((state) => state.activeProjectId);
  const lastGrantId = useDraftStore((state) => state.lastGrantId);

  const activeApp =
    workspace.applications.find(
      (app) => app.projectId === activeProjectId && (!lastGrantId || app.grantId === lastGrantId)
    ) ?? workspace.applications.find((app) => app.projectId === activeProjectId);
  const targetGrantId = lastGrantId ?? activeApp?.grantId ?? '1';
  const slotKey = workSlotKey(activeProjectId, targetGrantId);

  return <FormTemplatesEditor key={slotKey} slotKey={slotKey} targetGrantId={targetGrantId} />;
}

function FormTemplatesEditor({
  slotKey,
  targetGrantId,
}: {
  slotKey: string;
  targetGrantId: string;
}) {
  const theme = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { desktop } = useLayoutMetrics();

  const workspace = useWorkspaceStore((state) => state.workspace);
  const activeProjectId = useWorkspaceStore((state) => state.activeProjectId);
  const nickname = useWorkspaceStore((state) => state.nickname);
  const projectRoles = useWorkspaceStore((state) => state.projectRoles);
  const activeRole = useWorkspaceStore((state) => state.activeRole);
  const effectiveRole: CoWorkRole = projectRoles[activeProjectId] ?? activeRole;
  const canEdit = canRolePerform(effectiveRole, 'edit');

  const work = useWorkbenchStore((state) => state.work[slotKey] ?? EMPTY_WORKBENCH);
  const updateWorkbench = useWorkbenchStore((state) => state.update);
  const markContentChanged = useDraftStore((state) => state.markContentChanged);
  const recordActivity = useProgressStore((state) => state.recordActivity);

  const activeProject =
    workspace.projects.find((p) => p.id === activeProjectId) ?? workspace.projects[0];

  const [kind, setKind] = useState<ProjectKind>(() => work.kind);
  const [outputs, setOutputs] = useState<OutputKind[]>(() =>
    work.outputs.length ? [...work.outputs] : ['application']
  );
  const [sections, setSections] = useState<EditableTemplateSection[]>(() =>
    mergeTemplateInitialSections(work)
  );
  const [showAllStandard, setShowAllStandard] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  const typePresetTitles = TEMPLATE_TYPE_SECTIONS[kind];
  const matchedKnownNew = findKnownSection(newTitle);
  const selectedNormSet = useMemo(
    () => new Set(sections.map((item) => normalizeSectionTitle(item.title))),
    [sections]
  );

  const extraStandardTitles = useMemo(() => {
    const presetSet = new Set(typePresetTitles.map((t) => normalizeSectionTitle(t)));
    return KNOWN_SECTION_CATALOG.filter(
      (entry) => !presetSet.has(normalizeSectionTitle(entry.title))
    )
      .slice(0, 12)
      .map((entry) => entry.title);
  }, [typePresetTitles]);

  const handleSelectKind = (nextKind: ProjectKind) => {
    setKind(nextKind);
    setError('');
    setNotice('');
    // Swap standard preset sections cleanly across Grant -> Startup -> R&D while preserving
    // user-created custom sections and any existing section that already holds authored text.
    const nextPresets = TEMPLATE_TYPE_SECTIONS[nextKind];
    const authoredByNorm = new Set(
      work.sections
        .filter((item) => item.text.trim().length > 0)
        .map((item) => normalizeSectionTitle(item.title))
    );
    const preserved = sections.filter(
      (item) => !item.isFixed || authoredByNorm.has(normalizeSectionTitle(item.title))
    );
    const seen = new Set(preserved.map((item) => normalizeSectionTitle(item.title)));
    const nextList: EditableTemplateSection[] = [...preserved];
    for (const title of nextPresets) {
      const norm = normalizeSectionTitle(title);
      if (seen.has(norm)) continue;
      seen.add(norm);
      const resolved = resolveSectionDescription(title);
      nextList.push({
        title,
        description: resolved.description,
        isFixed: resolved.isFixed,
      });
    }
    setSections(nextList);
  };

  const toggleOutput = (output: OutputKind) => {
    setError('');
    setNotice('');
    setOutputs((current) =>
      current.includes(output) ? current.filter((item) => item !== output) : [...current, output]
    );
  };

  const toggleKnownSection = (title: string) => {
    setError('');
    setNotice('');
    const norm = normalizeSectionTitle(title);
    if (selectedNormSet.has(norm)) {
      setSections((current) =>
        current.filter((item) => normalizeSectionTitle(item.title) !== norm)
      );
      return;
    }
    const resolved = resolveSectionDescription(title);
    setSections((current) => [
      ...current,
      { title, description: resolved.description, isFixed: resolved.isFixed },
    ]);
  };

  const handleCreateSection = () => {
    const cleanTitle = newTitle.trim().replace(/\s+/g, ' ');
    if (!cleanTitle) {
      setError('Enter a section name first.');
      return;
    }
    if (selectedNormSet.has(normalizeSectionTitle(cleanTitle))) {
      setError(`"${cleanTitle}" is already in this template.`);
      return;
    }
    const known = findKnownSection(cleanTitle);
    const resolved = resolveSectionDescription(cleanTitle, known ? undefined : newDescription);
    setSections((current) => [
      ...current,
      {
        title: known ? known.title : cleanTitle,
        description: resolved.description,
        isFixed: resolved.isFixed,
      },
    ]);
    setNewTitle('');
    setNewDescription('');
    setError('');
    setNotice(`Added "${known ? known.title : cleanTitle}" to required sections.`);
  };

  const handleApply = () => {
    if (!canEdit) return;
    if (!outputs.length) {
      setError('Choose at least one requested output.');
      return;
    }
    if (!sections.length) {
      setError('Select or create at least one required section.');
      return;
    }
    try {
      updateWorkbench(slotKey, (current) =>
        applySelectedTemplate(
          current,
          kind,
          outputs,
          sections.map((item) => ({
            title: item.title,
            description: isKnownSection(item.title) ? undefined : item.description,
          }))
        )
      );
      markContentChanged(slotKey);
      recordActivity(slotKey, {
        actor: nickname || 'Founder Lead',
        agent: 'agent-1-narrative',
        message: `Applied ${kind} template (${sections.length} required sections)`,
      });
      void queryClient.invalidateQueries({ queryKey: queryKeys.audit(targetGrantId) });
      setError('');
      setNotice('Template applied. Open Drafting workspace to review required sections.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to apply template.');
    }
  };

  const kindLabel = PROJECT_KIND_OPTIONS.find((item) => item.id === kind)?.label ?? kind;

  return (
    <ScreenContainer insetEdges={[]}>
      <View style={styles.pageContent}>
        <View style={styles.rowBetween}>
          <View style={{ flexShrink: 1, minWidth: 0, gap: 4 }}>
            <AppText variant="h1">Form templates</AppText>
            <AppText color="muted">
              Choose a template type, requested outputs, and required sections for{' '}
              {activeProject?.name ?? 'your active project'}.
            </AppText>
          </View>
          <StatusBadge label={ROLE_LABELS[effectiveRole]} variant={canEdit ? 'brand' : 'pending'} />
        </View>

        {!canEdit && (
          <StatusBadge
            label={`Read-only (${ROLE_LABELS[effectiveRole]} cannot edit templates)`}
            variant="pending"
          />
        )}

        {error ? (
          <AppText color="failureText" accessibilityRole="alert">
            {error}
          </AppText>
        ) : null}
        {notice ? (
          <AppText color="verified" accessibilityLiveRegion="polite">
            {notice}
          </AppText>
        ) : null}

        <WorkspaceStudioBar />

        <View testID="workspace-columns" style={[styles.columns, desktop && styles.desktopColumns]}>
          <View style={styles.mainColumn}>
            <View
              style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}
            >
              <AppText variant="h3">Template type</AppText>
              <View style={styles.rowWrap} testID="template-type-chooser">
                {PROJECT_KIND_OPTIONS.map((option) => (
                  <AppButton
                    key={option.id}
                    size="sm"
                    variant="outline"
                    label={option.label}
                    selected={kind === option.id}
                    disabled={!canEdit}
                    onPress={() => handleSelectKind(option.id)}
                  />
                ))}
              </View>
              <AppText variant="caption" color="muted">
                {PROJECT_KIND_OPTIONS.find((item) => item.id === kind)?.summary}
              </AppText>

              <AppText variant="h3">Requested outputs</AppText>
              <View style={styles.rowWrap} testID="template-outputs-chooser">
                {OUTPUT_KIND_OPTIONS.map((option) => {
                  const selected = outputs.includes(option.id);
                  return (
                    <AppButton
                      key={option.id}
                      size="sm"
                      variant="outline"
                      label={option.label}
                      selected={selected}
                      disabled={!canEdit}
                      onPress={() => toggleOutput(option.id)}
                    />
                  );
                })}
              </View>
              {outputs.length === 0 ? (
                <AppText variant="caption" color="failureText">
                  Select at least one requested output.
                </AppText>
              ) : null}
            </View>

            <View
              testID="form-templates-required-sections"
              style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}
            >
              <AppText variant="h3">Required sections</AppText>
              <AppText variant="caption" color="muted">
                {kindLabel} section templates use fixed requirements; custom sections let you define
                their requirement text directly.
              </AppText>

              <AppText variant="label">Known section templates ({kindLabel})</AppText>
              <View style={styles.rowWrap} testID="known-section-chooser">
                {typePresetTitles.map((title) => {
                  const selected = selectedNormSet.has(normalizeSectionTitle(title));
                  return (
                    <AppButton
                      key={title}
                      size="sm"
                      variant="outline"
                      label={title}
                      selected={selected}
                      disabled={!canEdit}
                      icon={
                        selected ? (
                          <Check size={14} strokeWidth={2.5} color={theme.primaryText} />
                        ) : (
                          <Plus size={14} color={theme.textMuted} />
                        )
                      }
                      onPress={() => toggleKnownSection(title)}
                    />
                  );
                })}
              </View>

              <View>
                <AppButton
                  size="sm"
                  variant="ghost"
                  label={
                    showAllStandard
                      ? 'Hide extra standard sections'
                      : 'Browse more standard sections'
                  }
                  expanded={showAllStandard}
                  onPress={() => setShowAllStandard((current) => !current)}
                />
              </View>

              {showAllStandard && (
                <View style={styles.rowWrap} testID="extra-standard-sections">
                  {extraStandardTitles.map((title) => {
                    const selected = selectedNormSet.has(normalizeSectionTitle(title));
                    return (
                      <AppButton
                        key={title}
                        size="sm"
                        variant="outline"
                        label={title}
                        selected={selected}
                        disabled={!canEdit}
                        onPress={() => toggleKnownSection(title)}
                      />
                    );
                  })}
                </View>
              )}

              <View style={styles.checklistGrid} testID="selected-template-sections">
                {sections.map((section) => (
                  <View
                    key={normalizeSectionTitle(section.title)}
                    style={[styles.checkItem, { borderColor: theme.border }]}
                  >
                    <View style={styles.rowBetween}>
                      <AppText
                        variant="label"
                        color="primary"
                        style={{ flexShrink: 1, minWidth: 0 }}
                      >
                        {section.title}
                      </AppText>
                      <View style={styles.rowWrap}>
                        <StatusBadge
                          label={section.isFixed ? 'Standard (fixed)' : 'Custom'}
                          variant={section.isFixed ? 'neutral' : 'brand'}
                        />
                        <AppButton
                          size="sm"
                          variant="ghost"
                          label="Remove"
                          accessibilityLabel={`Remove ${section.title}`}
                          disabled={!canEdit}
                          onPress={() => toggleKnownSection(section.title)}
                        />
                      </View>
                    </View>
                    {section.isFixed ? (
                      <AppText variant="caption" color="muted">
                        {section.description}
                      </AppText>
                    ) : (
                      <AppTextArea
                        label={`Description for ${section.title}`}
                        value={section.description}
                        charLimit={600}
                        editable={canEdit}
                        onChangeText={(text) => {
                          setSections((current) =>
                            current.map((item) =>
                              normalizeSectionTitle(item.title) ===
                              normalizeSectionTitle(section.title)
                                ? { ...item, description: text }
                                : item
                            )
                          );
                        }}
                      />
                    )}
                  </View>
                ))}
              </View>

              <View testID="create-section-box" style={{ gap: 12, paddingTop: 8 }}>
                <AppText variant="label">Create new section</AppText>
                <AppInput
                  label="New section name"
                  placeholder="Enter a custom or standard section title"
                  value={newTitle}
                  editable={canEdit}
                  maxLength={80}
                  onChangeText={(text) => {
                    setNewTitle(text);
                    if (error) setError('');
                  }}
                />
                {matchedKnownNew ? (
                  <AppText variant="caption" color="muted">
                    Standard section description is fixed: {matchedKnownNew.description}
                  </AppText>
                ) : (
                  <AppTextArea
                    label="New section description"
                    placeholder="Describe what the applicant and agent must cover in this section"
                    value={newDescription}
                    editable={canEdit}
                    charLimit={600}
                    onChangeText={setNewDescription}
                  />
                )}
                <View style={styles.rowWrap}>
                  <AppButton
                    size="sm"
                    variant="outline"
                    label="Create new section"
                    icon={<Plus size={16} color={theme.textMain} />}
                    disabled={!canEdit || !newTitle.trim()}
                    onPress={handleCreateSection}
                  />
                </View>
              </View>
            </View>
          </View>

          <View
            style={[
              styles.card,
              styles.sideColumn,
              desktop && styles.desktopSidebar,
              { backgroundColor: theme.surface, borderColor: theme.border },
            ]}
          >
            <AppText variant="h3">Template summary</AppText>
            <AppText variant="body">
              Type: {kindLabel}
              {'\n'}Outputs:{' '}
              {outputs.length
                ? outputs
                    .map((id) => OUTPUT_KIND_OPTIONS.find((item) => item.id === id)?.label ?? id)
                    .join(', ')
                : 'None selected'}
              {'\n'}Required sections: {sections.length}
            </AppText>
            <AppText variant="caption" color="muted">
              This ordered section directory guides the agent on what questions to ask during
              drafting.
            </AppText>
            <AppButton
              label="Apply template"
              variant="primary"
              disabled={!canEdit || !outputs.length || !sections.length}
              onPress={handleApply}
            />
            <AppButton
              label="Open Drafting workspace"
              variant="outline"
              onPress={() =>
                router.push({
                  pathname: '/grants/[grantID]/drafting',
                  params: { grantID: targetGrantId },
                })
              }
            />
          </View>
        </View>
      </View>
    </ScreenContainer>
  );
}
