import { useState } from 'react';
import { View } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AppButton } from '@/components/atoms/AppButton';
import { AppInput } from '@/components/atoms/AppInput';
import { AppText } from '@/components/atoms/AppText';
import { ApiError } from '@/api/client';
import { actionStyles, ActionMessage, Card, QueryMessage, useAction } from './ui';
import type {
  Attempt,
  Audit,
  BudgetLine,
  ConnectedClient,
  OutputKind,
  ProjectRevision,
} from './api';
import { ExportPanel } from './ExportPanel';
import { ProgressPanel } from './ProgressPanel';

type Props = {
  api: ConnectedClient;
  scope: readonly string[];
  attemptId: string;
  grantId?: string;
  staff: boolean;
};
const tabs = [
  'Drafting',
  'Form Templates',
  'Audit',
  'Budget',
  'Export',
  'Progress Tracking',
] as const;
type Tab = (typeof tabs)[number];
type AttemptAccess = { record: Attempt; denied: null } | { record: null; denied: ApiError };

export function AttemptPane(props: Props) {
  const { api, scope, attemptId, grantId } = props;
  const [tab, setTab] = useState<Tab>('Drafting');
  const cache = useQueryClient();
  const query = useQuery<AttemptAccess>({
    queryKey: [...scope, 'attempt', attemptId],
    queryFn: async () => {
      try {
        return { record: await api.attempt(attemptId), denied: null };
      } catch (error) {
        if (error instanceof ApiError && [401, 403, 404].includes(error.status)) {
          cache.removeQueries({ queryKey: [...scope, 'audits', attemptId] });
          cache.removeQueries({ queryKey: [...scope, 'revisions', attemptId] });
          cache.removeQueries({ queryKey: [...scope, 'tasks', attemptId] });
          return { record: null, denied: error };
        }
        throw error;
      }
    },
    retry: false,
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: 'always',
  });
  const record = query.data?.record;
  if (!record)
    return (
      <QueryMessage
        pending={query.isPending}
        error={query.data?.denied ?? query.error}
        retry={() => void query.refetch()}
      />
    );
  if (grantId && record.grantId !== grantId) {
    return (
      <AppText color="failureText" accessibilityRole="alert">
        Application unavailable for this opportunity.
      </AppText>
    );
  }
  return (
    <View style={actionStyles.block}>
      <Card>
        <AppText variant="h2">{record.title}</AppText>
        <AppText color="muted">
          {record.grantTitle} · Revision {record.version} · {record.status}
        </AppText>
        <AppText>{record.completionPct}% of required sections complete</AppText>
        <View style={actionStyles.row}>
          {tabs.map((item) => (
            <AppButton
              key={item}
              label={item}
              size="sm"
              variant="outline"
              selected={tab === item}
              onPress={() => setTab(item)}
            />
          ))}
        </View>
      </Card>
      <AttemptEditor
        key={record.id}
        {...props}
        record={record}
        tab={tab}
        setTab={setTab}
        reload={() => void query.refetch()}
      />
    </View>
  );
}

function AttemptEditor({
  api,
  scope,
  record,
  tab,
  setTab,
  staff,
  reload,
}: Props & { record: Attempt; tab: Tab; setTab: (next: Tab) => void; reload: () => void }) {
  const cache = useQueryClient();
  const [edit, setEdit] = useState<Pick<
    Attempt,
    'title' | 'sections' | 'budget' | 'outputs' | 'exportNarrative' | 'profileVersion' | 'version'
  > | null>(null);
  const current = edit ?? {
    title: record.title,
    sections: record.sections,
    budget: record.budget,
    outputs: record.outputs,
    exportNarrative: record.exportNarrative,
    profileVersion: record.profileVersion,
    version: record.version,
  };
  const { title, sections, budget, outputs, exportNarrative, profileVersion } = current;
  const setTitle = (value: string) => setEdit({ ...current, title: value });
  const setSections = (value: Attempt['sections']) => setEdit({ ...current, sections: value });
  const setBudget = (value: Attempt['budget']) => setEdit({ ...current, budget: value });
  const setOutputs = (value: OutputKind[]) => setEdit({ ...current, outputs: value });
  const setExportNarrative = (value: string) => setEdit({ ...current, exportNarrative: value });
  const setProfileVersion = (value: number) => setEdit({ ...current, profileVersion: value });
  const [custom, setCustom] = useState('');
  const activeTab = tab;
  const action = useAction();
  const working = record.status === 'drafting' || record.status === 'review';
  const editable = working && (record.role === 'owner' || record.role === 'editor');
  const path = '/attempts/' + record.id;
  const dirty = edit !== null;
  const conflict = dirty && current.version !== record.version;
  const projectRevisions = useQuery({
    queryKey: [...scope, 'project-revisions', record.projectId],
    queryFn: () => api.get<ProjectRevision[]>('/projects/' + record.projectId + '/revisions'),
  });
  const apply = async (next: Attempt) => {
    cache.setQueryData<AttemptAccess>([...scope, 'attempt', record.id], {
      record: next,
      denied: null,
    });
    await Promise.all([
      cache.invalidateQueries({ queryKey: [...scope, 'attempts'] }),
      cache.invalidateQueries({ queryKey: [...scope, 'dashboard'] }),
      cache.invalidateQueries({ queryKey: [...scope, 'audits', record.id] }),
      cache.invalidateQueries({ queryKey: [...scope, 'revisions', record.id] }),
      cache.invalidateQueries({ queryKey: [...scope, 'tasks', record.id] }),
      cache.invalidateQueries({ queryKey: [...scope, 'inbox'] }),
    ]);
  };
  function compileBundle() {
    const parts = [
      `Requested outputs: ${outputs.join(', ')}`,
      ...sections.map((section) => `## ${section.name}\n\n${section.text}`),
    ];
    if (budget.length) {
      parts.push(
        `## Budget\n\n` +
          budget
            .map(
              (line) => `- ${line.name}: ${line.currency} ${(line.amountMinor / 100).toFixed(2)}`
            )
            .join('\n')
      );
    }
    return parts.join('\n\n');
  }
  function save() {
    return action.run(async () => {
      if (conflict) throw new Error('A newer draft is saved. Copy your edits before reloading.');
      const next = await api.patch<Attempt>(path, current);
      setEdit(null);
      await apply(next);
    }, 'Attempt saved.');
  }
  function append(names: string[]) {
    const inUse = new Set(sections.map((section) => section.name.toLowerCase()));
    const added = names
      .filter((name) => !inUse.has(name.toLowerCase()))
      .map((name) => ({ name, text: '' }));
    if (!added.length) return;
    setSections([...sections, ...added].slice(0, 30));
    setCustom('');
  }

  const outputOptions: { id: OutputKind; label: string }[] = [
    { id: 'application', label: 'Application' },
    { id: 'pitch-deck', label: 'Pitch deck' },
    { id: 'document', label: 'Document' },
  ];
  const toggleOutput = (kind: OutputKind) => {
    if (outputs.includes(kind)) {
      if (outputs.length <= 1) return;
      setOutputs(outputs.filter((item) => item !== kind));
    } else {
      setOutputs([...outputs, kind]);
    }
  };

  return (
    <>
      {activeTab === 'Drafting' && (
        <Card>
          <AppText variant="h3">Drafting</AppText>
          <AppText color="muted">
            Pinned project profile ·{' '}
            {profileVersion !== null ? `Revision #${profileVersion}` : 'Latest'}
          </AppText>
          {Boolean(editable && projectRevisions.data?.length) && (
            <View style={actionStyles.row}>
              {projectRevisions.data?.map((rev) => (
                <AppButton
                  key={rev.version}
                  label={'Profile #' + rev.version}
                  size="sm"
                  variant="outline"
                  selected={profileVersion === rev.version}
                  onPress={() => setProfileVersion(rev.version)}
                />
              ))}
            </View>
          )}
          <AppInput
            label="Application title"
            value={title}
            onChangeText={setTitle}
            editable={editable}
            maxLength={120}
          />
          {sections.map((section, index) => (
            <View key={section.name} style={actionStyles.block}>
              <AppInput
                label={section.name}
                value={section.text}
                multiline
                maxLength={16000}
                editable={editable}
                style={actionStyles.multiline}
                onChangeText={(text) =>
                  setSections(sections.map((item, i) => (i === index ? { ...item, text } : item)))
                }
              />
              {editable &&
                !record.requirements.some(
                  (name) => name.toLowerCase() === section.name.toLowerCase()
                ) && (
                  <AppButton
                    label={'Remove ' + section.name}
                    size="sm"
                    onPress={() => setSections(sections.filter((_, i) => i !== index))}
                  />
                )}
            </View>
          ))}
          <View style={actionStyles.row}>
            {editable && (
              <AppButton
                label="Save application draft"
                variant="primary"
                disabled={!dirty || conflict || !title.trim()}
                isLoading={action.busy}
                onPress={() => void save()}
              />
            )}
            {dirty && (
              <AppButton label="Check for saved changes" disabled={action.busy} onPress={reload} />
            )}
            <AppButton
              label={dirty ? 'Discard edits and reload saved revision' : 'Reload saved revision'}
              disabled={action.busy}
              onPress={() => {
                setEdit(null);
                reload();
              }}
            />
          </View>
          <AppText color="muted">AI drafting requires a connected AI provider.</AppText>
        </Card>
      )}
      {activeTab === 'Form Templates' && (
        <Card>
          <AppText variant="h3">Form Templates</AppText>
          <AppText>Templates add sections and keep the text you have already written.</AppText>
          <AppText color="muted">Required · {record.requirements.join(', ')}</AppText>
          <AppText variant="h3">Requested outputs</AppText>
          <View style={actionStyles.row}>
            {outputOptions.map((option) => (
              <AppButton
                key={option.id}
                label={option.label}
                size="sm"
                variant="outline"
                selected={outputs.includes(option.id)}
                disabled={!editable}
                onPress={() => toggleOutput(option.id)}
              />
            ))}
          </View>
          {editable && (
            <>
              <View style={actionStyles.row}>
                <AppButton
                  label="Add grant template"
                  onPress={() => append(['Executive summary', 'Implementation plan', 'Outcomes'])}
                />
                <AppButton
                  label="Add startup template"
                  onPress={() => append(['Market opportunity', 'Business model', 'Team'])}
                />
                <AppButton
                  label="Add research template"
                  onPress={() => append(['Research question', 'Methodology', 'Expected findings'])}
                />
              </View>
              <AppInput
                label="Custom section name"
                value={custom}
                onChangeText={setCustom}
                maxLength={120}
              />
              <AppButton
                label="Add custom section"
                disabled={
                  !custom.trim() ||
                  sections.length >= 30 ||
                  sections.some(
                    (section) => section.name.toLowerCase() === custom.trim().toLowerCase()
                  )
                }
                onPress={() => append([custom.trim()])}
              />
              <AppText>{sections.map((section) => section.name).join(' · ')}</AppText>
              <AppButton
                label="Save template changes"
                variant="primary"
                disabled={!dirty || conflict || !title.trim()}
                isLoading={action.busy}
                onPress={() => void save()}
              />
            </>
          )}
        </Card>
      )}
      {activeTab === 'Budget' && (
        <BudgetForm
          budget={budget}
          editable={editable}
          setBudget={setBudget}
          save={() => void save()}
          dirty={dirty && !conflict}
          busy={action.busy}
        />
      )}
      {activeTab === 'Audit' && (
        <AuditPanel api={api} scope={scope} record={record} dirty={dirty} />
      )}
      {activeTab === 'Export' && (
        <ExportPanel
          api={api}
          scope={scope}
          record={record}
          dirty={dirty}
          conflict={conflict}
          editable={editable}
          saving={action.busy}
          exportNarrative={exportNarrative}
          setExportNarrative={setExportNarrative}
          compileBundle={compileBundle}
          save={save}
        />
      )}
      {activeTab === 'Progress Tracking' && (
        <ProgressPanel
          api={api}
          scope={scope}
          record={record}
          staff={staff}
          dirty={dirty}
          editable={editable}
          apply={apply}
          onNavigateTab={setTab}
        />
      )}
      {conflict && (
        <AppText accessibilityRole="alert" color="failureText">
          A newer draft has been saved. Your edits are still here. Copy what you need before
          reloading.
        </AppText>
      )}
      {dirty && !conflict && <AppText color="muted">You have unsaved application changes.</AppText>}
      <ActionMessage action={action} />
    </>
  );
}

function BudgetForm({
  budget,
  editable,
  setBudget,
  save,
  dirty,
  busy,
}: {
  budget: BudgetLine[];
  editable: boolean;
  setBudget: (lines: BudgetLine[]) => void;
  save: () => void;
  dirty: boolean;
  busy: boolean;
}) {
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState<BudgetLine['currency']>('USD');
  const validAmount = /^\d{1,9}(?:\.\d{1,2})?$/.test(amount.trim());
  return (
    <Card>
      <AppText variant="h3">Budget</AppText>
      {budget.length === 0 && <AppText>No budget lines yet.</AppText>}
      {budget.map((line, index) => (
        <View key={line.name + index} style={actionStyles.row}>
          <AppText>
            {line.name} · {line.currency} {(line.amountMinor / 100).toFixed(2)}
          </AppText>
          {editable && (
            <AppButton
              label={'Remove ' + line.name}
              size="sm"
              onPress={() => setBudget(budget.filter((_, i) => i !== index))}
            />
          )}
        </View>
      ))}
      {editable && (
        <>
          <AppInput label="Budget line name" value={name} onChangeText={setName} maxLength={120} />
          <AppInput
            label="Amount"
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
          />
          <View style={actionStyles.row}>
            {(['USD', 'EUR', 'KZT', 'GBP'] as const).map((code) => (
              <AppButton
                key={code}
                label={code}
                selected={code === currency}
                variant="outline"
                onPress={() => setCurrency(code)}
              />
            ))}
          </View>
          <AppButton
            label="Add budget line"
            disabled={!name.trim() || !validAmount || budget.length >= 35}
            onPress={() => {
              setBudget([
                ...budget,
                { name: name.trim(), amountMinor: Math.round(Number(amount) * 100), currency },
              ]);
              setName('');
              setAmount('');
            }}
          />
          <AppButton
            label="Save budget"
            variant="primary"
            disabled={!dirty}
            isLoading={busy}
            onPress={save}
          />
        </>
      )}
      <AppText color="muted">
        Budget figures do not verify market prices or funder approval.
      </AppText>
    </Card>
  );
}

type PanelProps = {
  api: ConnectedClient;
  scope: readonly string[];
  record: Attempt;
  dirty: boolean;
};

function useAudits(api: ConnectedClient, scope: readonly string[], id: string) {
  return useQuery({
    queryKey: [...scope, 'audits', id],
    queryFn: () => api.get<Audit[]>('/attempts/' + id + '/audits'),
  });
}

function AuditPanel({ api, scope, record, dirty }: PanelProps) {
  const action = useAction();
  const query = useAudits(api, scope, record.id);
  return (
    <Card>
      <AppText variant="h3">Audit</AppText>
      <AppText>
        This check looks for written content in the opportunity’s required sections.
      </AppText>
      {record.role !== 'viewer' && (
        <AppButton
          label="Run draft audit"
          variant="primary"
          disabled={dirty}
          isLoading={action.busy}
          onPress={() =>
            void action.run(async () => {
              await api.post('/attempts/' + record.id + '/audits', { version: record.version });
              await query.refetch();
            }, 'Audit complete.')
          }
        />
      )}
      <QueryMessage
        pending={query.isPending}
        error={query.error}
        retry={() => void query.refetch()}
      />
      {query.data?.length === 0 && <AppText>No audits yet.</AppText>}
      {query.data?.map((audit) => (
        <AppText key={audit.id}>
          Revision {audit.version} · {audit.score}% · {audit.current ? 'Current' : 'Previous'}
          {audit.missing.length ? ' · Missing ' + audit.missing.join(', ') : ''}
        </AppText>
      ))}
      <ActionMessage action={action} />
    </Card>
  );
}
