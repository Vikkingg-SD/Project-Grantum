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
  ExportFile,
  Format,
  Revision,
  WorkStatus,
} from './api';
import { downloadFile } from './download';

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

export function AttemptPane(props: Props) {
  const { api, scope, attemptId, grantId } = props;
  const [tab, setTab] = useState<Tab>('Drafting');
  const query = useQuery({
    queryKey: [...scope, 'attempt', attemptId],
    queryFn: () => api.attempt(attemptId),
    retry: false,
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: 'always',
  });
  const record = query.data;
  const denied = query.error instanceof ApiError && [401, 403, 404].includes(query.error.status);
  if (!record || denied)
    return (
      <QueryMessage
        pending={query.isPending}
        error={query.error}
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
  staff,
  reload,
}: Props & { record: Attempt; tab: Tab; reload: () => void }) {
  const cache = useQueryClient();
  const [edit, setEdit] = useState<Pick<
    Attempt,
    'title' | 'sections' | 'budget' | 'version'
  > | null>(null);
  const current = edit ?? {
    title: record.title,
    sections: record.sections,
    budget: record.budget,
    version: record.version,
  };
  const { title, sections, budget } = current;
  const setTitle = (value: string) => setEdit({ ...current, title: value });
  const setSections = (value: Attempt['sections']) => setEdit({ ...current, sections: value });
  const setBudget = (value: Attempt['budget']) => setEdit({ ...current, budget: value });
  const [custom, setCustom] = useState('');
  const action = useAction();
  const working = record.status === 'drafting' || record.status === 'review';
  const editable = working && (record.role === 'owner' || record.role === 'editor');
  const path = '/attempts/' + record.id;
  const dirty = edit !== null;
  const conflict = dirty && current.version !== record.version;
  const apply = async (next: Attempt) => {
    cache.setQueryData([...scope, 'attempt', record.id], next);
    await Promise.all([
      cache.invalidateQueries({ queryKey: [...scope, 'attempts'] }),
      cache.invalidateQueries({ queryKey: [...scope, 'dashboard'] }),
      cache.invalidateQueries({ queryKey: [...scope, 'audits', record.id] }),
      cache.invalidateQueries({ queryKey: [...scope, 'revisions', record.id] }),
      cache.invalidateQueries({ queryKey: [...scope, 'inbox'] }),
    ]);
  };
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

  return (
    <>
      {tab === 'Drafting' && (
        <Card>
          <AppText variant="h3">Drafting</AppText>
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
      {tab === 'Form Templates' && (
        <Card>
          <AppText variant="h3">Form Templates</AppText>
          <AppText>Templates add sections and keep the text you have already written.</AppText>
          <AppText color="muted">Required · {record.requirements.join(', ')}</AppText>
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
      {tab === 'Budget' && (
        <BudgetForm
          budget={budget}
          editable={editable}
          setBudget={setBudget}
          save={() => void save()}
          dirty={dirty && !conflict}
          busy={action.busy}
        />
      )}
      {tab === 'Audit' && <AuditPanel api={api} scope={scope} record={record} dirty={dirty} />}
      {tab === 'Export' && <ExportPanel api={api} scope={scope} record={record} dirty={dirty} />}
      {tab === 'Progress Tracking' && (
        <ProgressPanel
          api={api}
          scope={scope}
          record={record}
          staff={staff}
          dirty={dirty}
          editable={editable}
          apply={apply}
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

function ExportPanel({ api, scope, record, dirty }: PanelProps) {
  const action = useAction();
  const query = useAudits(api, scope, record.id);
  const ready = query.data?.some(
    (item) => item.current && item.version === record.version && item.score >= 85
  );
  const formats: { key: Format; label: string }[] = [
    { key: 'markdown', label: 'Download Markdown' },
    { key: 'notebook', label: 'Download notebook' },
    { key: 'word', label: 'Download Word' },
    { key: 'pdf', label: 'Download PDF' },
  ];
  return (
    <Card>
      <AppText variant="h3">Export</AppText>
      <QueryMessage
        pending={query.isPending}
        error={query.error}
        retry={() => void query.refetch()}
      />
      {!ready && (
        <AppText>
          Run an audit on this revision and complete at least 85% of required sections to unlock
          exports.
        </AppText>
      )}
      {ready && <AppText>Export the saved revision {record.version}.</AppText>}
      <View style={actionStyles.row}>
        {formats.map(({ key, label }) => (
          <AppButton
            key={key}
            label={label}
            disabled={!ready || dirty || action.busy}
            onPress={() =>
              void action.run(async () => {
                const file = await api.post<ExportFile>('/attempts/' + record.id + '/export', {
                  version: record.version,
                  format: key,
                });
                if (file.version !== record.version)
                  throw new Error('The export revision changed. Reload and try again.');
                await downloadFile(file.name, file.mime, file.base64);
              })
            }
          />
        ))}
      </View>
      <ActionMessage action={action} />
    </Card>
  );
}

function ProgressPanel({
  api,
  scope,
  record,
  staff,
  dirty,
  editable,
  apply,
}: PanelProps & {
  staff: boolean;
  editable: boolean;
  apply: (next: Attempt) => Promise<void>;
}) {
  const [reference, setReference] = useState('');
  const action = useAction();
  const path = '/attempts/' + record.id;
  const history = useQuery({
    queryKey: [...scope, 'revisions', record.id],
    queryFn: () => api.get<Revision[]>(path + '/revisions'),
  });
  const reviewer = record.role === 'owner' || record.role === 'reviewer';
  const move =
    (status: WorkStatus, withReference = false) =>
    () =>
      void action.run(async () => {
        await apply(
          await api.post<Attempt>(path + '/status', {
            status,
            version: record.version,
            ...(withReference ? { reference } : {}),
          })
        );
      }, 'Application status updated.');
  return (
    <Card>
      <AppText variant="h3">Progress Tracking</AppText>
      <AppText>Status · {record.status}</AppText>
      {record.receipt && <AppText>Recorded receipt · {record.receipt}</AppText>}
      {record.decisionReference && (
        <AppText>Recorded decision · {record.decisionReference}</AppText>
      )}
      <View style={actionStyles.row}>
        {record.status === 'drafting' && editable && (
          <AppButton
            label="Mark in review"
            disabled={dirty || action.busy}
            onPress={move('review')}
          />
        )}
        {['drafting', 'review'].includes(record.status) && reviewer && (
          <AppButton
            label="Mark ready"
            disabled={dirty || action.busy || record.completionPct !== 100}
            onPress={move('ready')}
          />
        )}
        {['review', 'ready'].includes(record.status) && reviewer && (
          <AppButton
            label="Reopen draft"
            disabled={dirty || action.busy}
            onPress={move('drafting')}
          />
        )}
      </View>
      {((record.status === 'ready' && record.role === 'owner') ||
        (record.status === 'submitted' && staff && reviewer)) && (
        <>
          <AppInput
            label={
              record.status === 'ready'
                ? 'Official submission receipt'
                : 'Official funder decision reference'
            }
            value={reference}
            onChangeText={setReference}
            maxLength={500}
          />
          <AppText color="muted">Enter the reference you received from the funder.</AppText>
          {record.status === 'ready' ? (
            <AppButton
              label="Record funder submission"
              disabled={!reference.trim() || action.busy}
              onPress={move('submitted', true)}
            />
          ) : (
            <View style={actionStyles.row}>
              <AppButton
                label="Record awarded decision"
                disabled={!reference.trim() || action.busy}
                onPress={move('awarded', true)}
              />
              <AppButton
                label="Record declined decision"
                disabled={!reference.trim() || action.busy}
                onPress={move('declined', true)}
              />
            </View>
          )}
        </>
      )}
      <AppText variant="h3">Revision history</AppText>
      <QueryMessage
        pending={history.isPending}
        error={history.error}
        retry={() => void history.refetch()}
      />
      {history.data?.map((entry) => (
        <View key={entry.version} style={actionStyles.row}>
          <AppText>
            Revision {entry.version} · {entry.status} ·{' '}
            {new Date(entry.createdAt).toLocaleDateString()}
          </AppText>
          {entry.version !== record.version && editable && (
            <AppButton
              label={'Restore revision ' + entry.version}
              size="sm"
              disabled={dirty || action.busy}
              onPress={() =>
                void action.run(async () => {
                  await apply(
                    await api.post<Attempt>(path + '/revisions/' + entry.version + '/restore', {
                      version: record.version,
                    })
                  );
                })
              }
            />
          )}
        </View>
      ))}
      <ActionMessage action={action} />
    </Card>
  );
}
