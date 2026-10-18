import React, { useState } from 'react';
import { View, StyleSheet, FlatList, Pressable } from 'react-native';
import { Trash2, X } from 'lucide-react-native';
import { ScreenContainer } from '@/components/templates/ScreenContainer';
import { AppText } from '@/components/atoms/AppText';
import { AppButton } from '@/components/atoms/AppButton';
import { AppInput } from '@/components/atoms/AppInput';
import { StatusBadge } from '@/components/atoms/StatusBadge';
import { ChatInputRow } from '@/components/molecules/ChatInputRow';
import { ChatMessageBubble } from '@/components/molecules/ChatMessageBubble';
import { useDraftStore } from '@/store/useDraftStore';
import { useUIStore } from '@/store/useUIStore';
import { useThemeStore } from '@/store/useThemeStore';
import { PALETTE } from '@/config/theme';

export default function DraftingScreen() {
  const { mode } = useThemeStore();
  const theme = PALETTE[mode];
  const grantId = useUIStore((s) => s.activeGrantId);

  const draft = useDraftStore((s) => s.drafts[grantId] ?? s.getDraft(grantId));
  const { completedSections, requiredSections, draftingMessages } = draft;

  const removeCompletedSection = useDraftStore((s) => s.removeCompletedSection);
  const restoreCompletedSections = useDraftStore((s) => s.restoreCompletedSections);
  const addRequiredSection = useDraftStore((s) => s.addRequiredSection);
  const deleteRequiredSection = useDraftStore((s) => s.deleteRequiredSection);
  const addDraftingMessage = useDraftStore((s) => s.addDraftingMessage);

  const [inputMessage, setInputMessage] = useState('');
  const [newSectionName, setNewSectionName] = useState('');
  const chips = [
    'Tighten the mission statement',
    'Align budget to funder cap',
    'Add evidence references',
  ];

  const handleSend = () => {
    if (!inputMessage.trim()) return;
    addDraftingMessage(grantId, inputMessage, 'user');
    const msg = inputMessage;
    setInputMessage('');
    setTimeout(() => {
      addDraftingMessage(
        grantId,
        `Noted. Revising draft for: "${msg}". Narrative remains aligned with funder criteria.`,
        'assistant-narrative'
      );
    }, 600);
  };

  return (
    <ScreenContainer scrollable={false} style={{ padding: 0 }}>
      <View style={styles.topInfo}>
        <AppText variant="h1">Drafting Assistant</AppText>
        <StatusBadge
          label={`${completedSections.length}/${requiredSections.length} sections verified`}
          variant={completedSections.length === requiredSections.length ? 'verified' : 'pending'}
        />
      </View>
      <View
        style={[styles.sectionsCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
      >
        <AppText variant="caption" color="muted" style={styles.cardHeader}>
          APPLICATION DRAFT — REQUIRED SECTIONS
        </AppText>
        <View style={styles.sectionRows}>
          {completedSections.map((sec) => (
            <View
              key={sec}
              style={[
                styles.sectionRow,
                { borderColor: theme.border, backgroundColor: theme.subtle },
              ]}
            >
              <AppText variant="body" style={styles.secText}>
                {sec}
              </AppText>
              <View style={styles.secActions}>
                <Pressable
                  onPress={() => removeCompletedSection(grantId, sec)}
                  style={styles.iconBtn}
                >
                  <X size={14} color={theme.textMuted} />
                </Pressable>
                <Pressable
                  onPress={() => deleteRequiredSection(grantId, sec)}
                  style={styles.iconBtn}
                >
                  <Trash2 size={14} color={theme.failure} />
                </Pressable>
              </View>
            </View>
          ))}
        </View>
        <View style={styles.addSectionRow}>
          <View style={styles.addInput}>
            <AppInput
              placeholder="Add section (e.g. Moat)"
              value={newSectionName}
              onChangeText={setNewSectionName}
            />
          </View>
          <AppButton
            label="Add"
            size="sm"
            onPress={() => {
              if (newSectionName.trim()) {
                addRequiredSection(grantId, newSectionName);
                setNewSectionName('');
              }
            }}
          />
        </View>
        {completedSections.length < requiredSections.length && (
          <AppButton
            label="Restore all sections"
            variant="outline"
            size="sm"
            onPress={() => restoreCompletedSections(grantId)}
          />
        )}
      </View>
      <View style={styles.chipRow}>
        {chips.map((chip) => (
          <Pressable
            key={chip}
            style={[styles.chip, { backgroundColor: theme.surface, borderColor: theme.border }]}
            onPress={() => {
              addDraftingMessage(grantId, chip, 'user');
              setTimeout(() => {
                addDraftingMessage(
                  grantId,
                  `Automated revision pass executed for: ${chip}.`,
                  'assistant-narrative'
                );
              }, 600);
            }}
          >
            <AppText variant="caption">{chip}</AppText>
          </Pressable>
        ))}
      </View>
      <FlatList
        data={draftingMessages}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <ChatMessageBubble {...item} />}
        contentContainerStyle={styles.chatList}
      />
      <ChatInputRow value={inputMessage} onChangeText={setInputMessage} onSend={handleSend} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  topInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  sectionsCard: {
    marginHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
  },
  cardHeader: {
    fontWeight: '700',
    marginBottom: 8,
  },
  sectionRows: {
    gap: 6,
  },
  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 8,
    borderRadius: 6,
    borderWidth: 1,
  },
  secText: {
    fontWeight: '600',
  },
  secActions: {
    flexDirection: 'row',
    gap: 8,
  },
  iconBtn: {
    padding: 4,
  },
  addSectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  addInput: {
    flex: 1,
  },
  chipRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginVertical: 8,
    gap: 6,
  },
  chip: {
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  chatList: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
});
