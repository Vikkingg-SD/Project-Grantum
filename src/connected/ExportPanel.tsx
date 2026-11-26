import { useQuery } from '@tanstack/react-query';
import { View } from 'react-native';
import { AppButton } from '@/components/atoms/AppButton';
import { AppInput } from '@/components/atoms/AppInput';
import { AppText } from '@/components/atoms/AppText';
import type { Attempt, Audit, ConnectedClient, ExportFile, Format } from './api';
import { downloadFile } from './download';
import { actionStyles, ActionMessage, Card, QueryMessage, useAction } from './ui';

type ExportPanelProps = {
  api: ConnectedClient;
  scope: readonly string[];
  record: Attempt;
  dirty: boolean;
  conflict: boolean;
  editable: boolean;
  saving: boolean;
  exportNarrative: string;
  setExportNarrative: (value: string) => void;
  compileBundle: () => string;
  save: () => Promise<void>;
};

export function ExportPanel({
  api,
  scope,
  record,
  dirty,
  conflict,
  editable,
  saving,
  exportNarrative,
  setExportNarrative,
  compileBundle,
  save,
}: ExportPanelProps) {
  const action = useAction();
  const query = useQuery({
    queryKey: [...scope, 'audits', record.id],
    queryFn: () => api.get<Audit[]>('/attempts/' + record.id + '/audits'),
  });
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
      <AppText color="muted">Requested outputs · {record.outputs.join(', ')}</AppText>
      <QueryMessage
        pending={query.isPending}
        error={query.error}
        retry={() => void query.refetch()}
      />
      <AppInput
        label="Export narrative"
        placeholder="Optional compiled bundle or custom narrative override"
        value={exportNarrative}
        multiline
        maxLength={120000}
        editable={editable}
        style={actionStyles.multiline}
        onChangeText={setExportNarrative}
      />
      {editable && (
        <View style={actionStyles.row}>
          <AppButton
            label="Load compiled bundle into export narrative"
            size="sm"
            disabled={saving || action.busy}
            onPress={() => setExportNarrative(compileBundle())}
          />
          {Boolean(exportNarrative) && (
            <AppButton
              label="Clear custom narrative"
              size="sm"
              disabled={saving || action.busy}
              onPress={() => setExportNarrative('')}
            />
          )}
          <AppButton
            label="Save export narrative"
            variant="primary"
            size="sm"
            disabled={!dirty || conflict || !record.title.trim() || action.busy}
            isLoading={saving}
            onPress={() => void save()}
          />
        </View>
      )}
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
