import React, { useState } from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import { CheckCircle2, AlertCircle } from 'lucide-react-native';
import { ScreenContainer } from '@/components/templates/ScreenContainer';
import { AppText } from '@/components/atoms/AppText';
import { StatusBadge } from '@/components/atoms/StatusBadge';
import { ConfidenceGaugeReadout } from '@/components/molecules/ConfidenceGaugeReadout';
import { ChatMessageBubble } from '@/components/molecules/ChatMessageBubble';
import { ChatInputRow } from '@/components/molecules/ChatInputRow';
import { useDraftStore } from '@/store/useDraftStore';
import { useUIStore } from '@/store/useUIStore';
import { useThemeStore } from '@/store/useThemeStore';
import { PALETTE } from '@/config/theme';
import { draftConfidenceScore } from '@/utils/scoring';

export default function AuditScreen() {
  const { mode } = useThemeStore();
  const theme = PALETTE[mode];
  const grantId = useUIStore((s) => s.activeGrantId);

  const draft = useDraftStore((s) => s.drafts[grantId] ?? s.getDraft(grantId));
  const { completedSections, requiredSections, auditMessages } = draft;
  const confidenceScore = draftConfidenceScore(completedSections, requiredSections);

  const addAuditMessage = useDraftStore((s) => s.addAuditMessage);

  const [inputMessage, setInputMessage] = useState('');

  const handleSend = () => {
    if (!inputMessage.trim()) return;
    addAuditMessage(grantId, inputMessage, 'user');
    const msg = inputMessage;
    setInputMessage('');
    setTimeout(() => {
      const missing = requiredSections.filter((s) => !completedSections.includes(s));
      const res =
        missing.length === 0
          ? `AUDIT OK · ${msg}: Zero arithmetic inconsistencies. Confidence index 100.`
          : `AUDIT ALERT · ${msg}: Blocked on omitted sections: ${missing.join(', ')}. Confidence: ${confidenceScore}.`;
      addAuditMessage(grantId, res, 'assistant-auditor');
    }, 600);
  };

  return (
    <ScreenContainer scrollable={false} style={{ padding: 0 }}>
      <View style={styles.header}>
        <AppText variant="h1">Deterministic Auditor</AppText>
        <StatusBadge label="Agent-2 Deterministic" variant="verified" />
      </View>
      <View
        style={[styles.scanCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
      >
        <AppText variant="caption" color="muted" style={styles.cardTitle}>
          SCAN STATUS · REQUIRED PROPOSAL SECTIONS
        </AppText>
        <View style={styles.grid}>
          {requiredSections.map((sec) => {
            const passed = completedSections.includes(sec);
            return (
              <View
                key={sec}
                style={[
                  styles.gridItem,
                  { backgroundColor: theme.subtle, borderColor: theme.border },
                ]}
              >
                {passed ? (
                  <CheckCircle2 size={16} color={theme.verified} />
                ) : (
                  <AlertCircle size={16} color={theme.failure} />
                )}
                <AppText
                  variant="caption"
                  color={passed ? 'main' : 'failure'}
                  style={{ fontWeight: '600' }}
                >
                  {sec}
                </AppText>
              </View>
            );
          })}
        </View>
        <View style={[styles.gaugeBox, { borderTopColor: theme.border }]}>
          <ConfidenceGaugeReadout score={confidenceScore} />
        </View>
      </View>
      <FlatList
        data={auditMessages}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <ChatMessageBubble {...item} />}
        contentContainerStyle={styles.chatList}
      />
      <ChatInputRow
        value={inputMessage}
        onChangeText={setInputMessage}
        onSend={handleSend}
        placeholder="Query the deterministic auditor..."
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  scanCard: {
    marginHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
  },
  cardTitle: {
    fontWeight: '700',
    marginBottom: 10,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  gridItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
  },
  gaugeBox: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  chatList: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
});
