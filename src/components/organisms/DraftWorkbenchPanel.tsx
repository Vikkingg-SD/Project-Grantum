import React, { useState } from 'react';
import { View, ScrollView, Linking } from 'react-native';
import { AppText } from '../atoms/AppText';
import { AppButton } from '../atoms/AppButton';
import { AppInput } from '../atoms/AppInput';
import { AppTextArea } from '../atoms/AppTextArea';
import { ModalSheetLayout } from '../templates/ModalSheetLayout';
import { useWorkbenchStore, EMPTY_WORKBENCH } from '@/store/useWorkbenchStore';
import { useDraftStore } from '@/store/useDraftStore';
import {
  acceptSuggestion,
  type TextSuggestion,
  applyTemplate,
  bundleText,
  recordSubmission,
  restoreVersion,
  saveVersion,
  templates,
  validSource,
} from '@/utils/drafting';
import { generateId } from '@/utils/uuid';
import type { OutputKind, ProjectKind } from '@/types/workspace';
import { SPACING } from '@/config/theme';

export function DraftWorkbenchPanel({
  grantId,
  visible,
  onClose,
  suggestion,
  onDismissSuggestion,
}: {
  grantId: string;
  visible: boolean;
  onClose: () => void;
  suggestion?: TextSuggestion;
  onDismissSuggestion?: () => void;
}) {
  const key = `legacy-grant:${grantId}`;
  const work = useWorkbenchStore((state) => state.work[key] ?? EMPTY_WORKBENCH);
  const update = useWorkbenchStore((state) => state.update);
  const setExport = useDraftStore((state) => state.setExportDocument);
  const [kind, setKind] = useState<ProjectKind>(work.kind);
  const [outputs, setOutputs] = useState<OutputKind[]>([...work.outputs]);
  const [summary, setSummary] = useState('');
  const [receipt, setReceipt] = useState('');
  const [destination, setDestination] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [compare, setCompare] = useState<string | null>(null);
  const [sectionTitle, setSectionTitle] = useState('');
  const [sectionSource, setSectionSource] = useState('');
  const [tab, setTab] = useState<'templates' | 'edit' | 'history' | 'review'>('templates');
  const act = (action: () => void, message = '') => {
    try {
      action();
      setError('');
      setNotice(message);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to update draft');
    }
  };
  return (
    <ModalSheetLayout
      visible={visible}
      onClose={onClose}
      accessibilityLabel="Form templates and drafting"
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: SPACING.lg, gap: SPACING.lg }}
      >
        <AppText variant="h2">Form templates and drafting</AppText>
        <AppText color="muted">
          Session-only workspace for this grant. Closing the app loses this work.
          Application-specific saving is not connected yet.
        </AppText>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm }}>
          {(['templates', 'edit', 'history', 'review'] as const).map((value) => (
            <AppButton
              key={value}
              label={
                {
                  templates: 'Templates',
                  edit: 'Sections',
                  history: 'History',
                  review: 'Review & handoff',
                }[value]
              }
              selected={tab === value}
              onPress={() => setTab(value)}
            />
          ))}
        </View>
        {error ? (
          <AppText accessibilityRole="alert" color="failureText">
            {error}
          </AppText>
        ) : null}
        {notice ? <AppText accessibilityLiveRegion="polite">{notice}</AppText> : null}
        {tab === 'templates' && (
          <>
            <AppText variant="h3">Project type</AppText>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm }}>
              {(Object.keys(templates) as ProjectKind[]).map((value) => (
                <AppButton
                  key={value}
                  label={value}
                  selected={kind === value}
                  onPress={() => setKind(value)}
                />
              ))}
            </View>
            <AppText variant="h3">Requested outputs</AppText>
            {(['application', 'pitch-deck', 'document'] as OutputKind[]).map((value) => (
              <AppButton
                key={value}
                label={value}
                selected={outputs.includes(value)}
                onPress={() =>
                  setOutputs((current) =>
                    current.includes(value)
                      ? current.filter((item) => item !== value)
                      : [...current, value]
                  )
                }
              />
            ))}
            <AppText>
              Suggested sections: {templates[kind].join(', ')}. Applying adds missing sections and
              preserves existing text.
            </AppText>
            <AppButton
              label="Apply template"
              disabled={!outputs.length}
              onPress={() =>
                act(() => {
                  update(key, (current) => applyTemplate(current, kind, outputs));
                  setTab('edit');
                }, 'Template applied in this session.')
              }
            />
            <AppText color="muted">
              Track analysis and AI section suggestions are unavailable. Add a source-backed
              requirement manually below.
            </AppText>
            <AppInput
              label="Additional requirement"
              value={sectionTitle}
              onChangeText={setSectionTitle}
              maxLength={120}
            />
            <AppInput
              label="Official requirement source URL"
              value={sectionSource}
              onChangeText={setSectionSource}
              autoCapitalize="none"
            />
            <AppButton
              label="Accept requirement"
              disabled={!sectionTitle.trim() || !validSource(sectionSource)}
              onPress={() =>
                act(() => {
                  update(key, (current) => ({
                    ...current,
                    sections: [
                      ...current.sections,
                      {
                        id: generateId('section'),
                        title: sectionTitle.trim(),
                        text: '',
                        evidence: sectionSource.trim(),
                      },
                    ],
                  }));
                  setSectionTitle('');
                  setSectionSource('');
                }, 'Requirement added.')
              }
            />
          </>
        )}
        {tab === 'edit' && (
          <>
            {!work.sections.length && (
              <AppText>No sections yet. Choose a template to begin.</AppText>
            )}
            {work.sections.map((section) => (
              <View key={section.id} style={{ gap: SPACING.sm }}>
                <AppTextArea
                  label={section.title}
                  value={section.text}
                  charLimit={10000}
                  onChangeText={(text) =>
                    update(key, (current) => ({
                      ...current,
                      sections: current.sections.map((s) =>
                        s.id === section.id ? { ...s, text } : s
                      ),
                    }))
                  }
                />
                <AppInput
                  label={`Evidence URL for ${section.title}`}
                  value={section.evidence}
                  autoCapitalize="none"
                  onChangeText={(evidence) =>
                    update(key, (current) => ({
                      ...current,
                      sections: current.sections.map((s) =>
                        s.id === section.id ? { ...s, evidence } : s
                      ),
                    }))
                  }
                />
              </View>
            ))}
            <AppInput
              label="Version change summary"
              value={summary}
              onChangeText={setSummary}
              maxLength={200}
            />
            <AppButton
              label="Save session version"
              disabled={!work.sections.length || !summary.trim()}
              onPress={() =>
                act(() => {
                  update(key, (current) =>
                    saveVersion(current, generateId('version'), new Date().toISOString(), summary)
                  );
                  setSummary('');
                }, 'Version saved in this session.')
              }
            />
            <AppText color="muted">
              AI rewriting is offline. Your manual edits remain available; no generated text has
              been applied.
            </AppText>
          </>
        )}
        {suggestion && (
          <View style={{ gap: SPACING.sm }}>
            <AppText variant="h3">Review suggested change</AppText>
            <AppText>Original: {suggestion.original}</AppText>
            <AppText>Proposed: {suggestion.proposed}</AppText>
            {suggestion.sources.map((source) => (
              <AppButton
                key={source}
                label={source}
                disabled={!validSource(source)}
                onPress={() => {
                  void Linking.openURL(source).catch(() => setError('Could not open source.'));
                }}
              />
            ))}
            <AppButton
              label="Accept suggestion"
              onPress={() =>
                act(() => {
                  update(key, (current) =>
                    acceptSuggestion(
                      current,
                      suggestion,
                      generateId('version'),
                      new Date().toISOString()
                    )
                  );
                  onDismissSuggestion?.();
                }, 'Accepted. Open History to restore the original text.')
              }
            />
            <AppButton
              label="Reject suggestion"
              onPress={() => {
                onDismissSuggestion?.();
                setNotice('Suggestion rejected. Your text is unchanged.');
              }}
            />
          </View>
        )}
        {tab === 'history' && (
          <>
            {!work.versions.length && <AppText>No saved versions yet.</AppText>}
            {[...work.versions].reverse().map((version) => (
              <View key={version.id} style={{ gap: SPACING.sm }}>
                <AppText variant="h3">{version.summary}</AppText>
                <AppText>
                  {version.author} � {version.createdAt}
                </AppText>
                <AppButton
                  label="Compare with current"
                  onPress={() => setCompare(compare === version.id ? null : version.id)}
                />
                {compare === version.id && (
                  <>
                    {version.sections.map((section) => (
                      <View key={section.id} style={{ gap: SPACING.sm }}>
                        <AppText>{section.title}</AppText>
                        <AppText>Saved: {section.text || '(empty)'}</AppText>
                        <AppText>
                          Current:{' '}
                          {work.sections.find((s) => s.id === section.id)?.text ||
                            '(empty or removed)'}
                        </AppText>
                      </View>
                    ))}
                    <AppButton
                      label="Restore this version (preserve current)"
                      onPress={() =>
                        act(
                          () =>
                            update(key, (current) =>
                              restoreVersion(
                                current,
                                version.id,
                                generateId('version'),
                                new Date().toISOString()
                              )
                            ),
                          'Restored. Previous work remains in history.'
                        )
                      }
                    />
                  </>
                )}
              </View>
            ))}
          </>
        )}
        {tab === 'review' && (
          <>
            <AppText variant="h3">Bundle review</AppText>
            <AppText>Outputs: {work.outputs.join(', ')}</AppText>
            <AppText>
              {work.sections.filter((s) => s.text.trim()).length}/{work.sections.length} sections
              have text. This is not an AI assessment or eligibility verdict.
            </AppText>
            <AppText>{bundleText(work) || 'No content to review.'}</AppText>
            <AppText color="muted">
              Match explanations and verified source analysis are unavailable. Existing catalog
              percentages are sample data, not a probability of winning.
            </AppText>
            <AppButton
              label="Use reviewed text in Export"
              disabled={!work.sections.length || work.sections.some((s) => !s.text.trim())}
              onPress={() =>
                act(
                  () => setExport(grantId, bundleText(work)),
                  'Review text copied to Export. Download requires a connected service; nothing was submitted.'
                )
              }
            />
            <AppText variant="h3">Record an external submission</AppText>
            <AppText>
              Submit through the funder's official site first, then record its receipt. This is your
              record, not independent verification.
            </AppText>
            <AppInput
              label="Official submission destination URL"
              value={destination}
              onChangeText={setDestination}
              autoCapitalize="none"
            />
            <AppButton
              label="Open official destination"
              disabled={!validSource(destination)}
              onPress={() => {
                void Linking.openURL(destination).catch(() =>
                  setError('Could not open the destination.')
                );
              }}
            />
            <AppInput
              label="Receipt reference supplied by funder"
              value={receipt}
              onChangeText={setReceipt}
              maxLength={200}
            />
            <AppButton
              label="Record receipt and snapshot"
              disabled={!receipt.trim() || !validSource(destination)}
              onPress={() =>
                act(
                  () =>
                    update(key, (current) =>
                      recordSubmission(
                        current,
                        generateId('submission'),
                        new Date().toISOString(),
                        receipt,
                        destination
                      )
                    ),
                  'Receipt recorded in this session; snapshot preserved.'
                )
              }
            />
            {work.submissions.map((item) => (
              <View key={item.id}>
                <AppText>Recorded: {item.receipt}</AppText>
                <AppText>
                  {item.recordedAt} � {item.destination}
                </AppText>
                <AppText>
                  {item.version.sections.length} sections preserved in the submission snapshot.
                </AppText>
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </ModalSheetLayout>
  );
}
