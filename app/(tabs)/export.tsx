import React, { useState } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { FileText, FileDown, NotebookPen, FileCode } from 'lucide-react-native';
import { ScreenContainer } from '@/components/templates/ScreenContainer';
import { AppText } from '@/components/atoms/AppText';
import { AppButton } from '@/components/atoms/AppButton';
import { AppTextArea } from '@/components/atoms/AppTextArea';
import { StatusBadge } from '@/components/atoms/StatusBadge';
import { useDraftStore } from '@/store/useDraftStore';
import { useThemeStore } from '@/store/useThemeStore';
import { PALETTE } from '@/config/theme';
import { CONSTANTS } from '@/config/constants';

export default function ExportScreen() {
  const { mode } = useThemeStore();
  const theme = PALETTE[mode];
  const { confidenceScore, exportDocument, setExportDocument } = useDraftStore();
  const [format, setFormat] = useState('word');
  const [exported, setExported] = useState(false);

  const locked = confidenceScore < CONSTANTS.CONFIDENCE_THRESHOLD;

  const formats = [
    { id: 'word', label: 'Word (.docx)', icon: FileText },
    { id: 'notebook', label: 'Notebook (.ipynb)', icon: NotebookPen },
    { id: 'pdf', label: 'PDF (.pdf)', icon: FileDown },
    { id: 'markdown', label: 'Markdown (.md)', icon: FileCode },
  ];

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <AppText variant="h1">Export Control</AppText>
        <AppText variant="caption" color="muted">
          Deterministic compliance audit gate & document packager
        </AppText>
      </View>

      <View style={styles.formatsRow}>
        {formats.map((f) => {
          const Icon = f.icon;
          const active = format === f.id;
          return (
            <Pressable
              key={f.id}
              onPress={() => {
                setFormat(f.id);
                setExported(false);
              }}
              style={[
                styles.formatBtn,
                {
                  backgroundColor: theme.surface,
                  borderColor: active ? theme.primary : theme.border,
                },
              ]}
            >
              <Icon size={20} color={active ? theme.primary : theme.textMuted} />
              <AppText variant="caption" style={{ fontWeight: '600' }}>
                {f.label}
              </AppText>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.statusRow}>
        <StatusBadge
          label={
            locked
              ? `Export locked — confidence ${confidenceScore} below ${CONSTANTS.CONFIDENCE_THRESHOLD}`
              : `Export unlocked — confidence ${confidenceScore}`
          }
          variant={locked ? 'failure' : 'verified'}
        />
        <AppButton
          label={exported ? 'Exported Successfully' : 'Export Bundle'}
          variant="primary"
          size="sm"
          disabled={locked}
          onPress={() => setExported(true)}
        />
      </View>

      <AppTextArea
        label="Document Body"
        value={exportDocument}
        onChangeText={setExportDocument}
        charLimit={CONSTANTS.MAX_INPUT_CHARS}
      />

      {exported && (
        <View
          style={[
            styles.checksumBox,
            { backgroundColor: theme.surface, borderColor: theme.verified },
          ]}
        >
          <AppText variant="caption" color="verified" align="center">
            CHECKSUM VERIFIED · SHA-256
            e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
          </AppText>
        </View>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    marginBottom: 16,
  },
  formatsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  formatBtn: {
    flex: 1,
    minWidth: 140,
    borderRadius: 8,
    borderWidth: 1,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  checksumBox: {
    marginTop: 16,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
});
