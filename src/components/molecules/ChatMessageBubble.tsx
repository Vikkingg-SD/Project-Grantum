import React, { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Bot, User } from 'lucide-react-native';
import { AppText } from '../atoms/AppText';
import { useThemeStore } from '@/store/useThemeStore';
import { PALETTE, RADIUS, SPACING } from '@/config/theme';
import { CHAT_COPY } from '@/config/copy';
import type { ChatMessage } from '@/types/api';

export interface ChatMessageBubbleProps extends Omit<ChatMessage, 'id' | 'variant'> {
  id?: string;
  variant?: ChatMessage['variant'];
}

export const ChatMessageBubble = memo(function ChatMessageBubble({
  text,
  variant = 'assistant-narrative',
  timestamp,
  status,
}: ChatMessageBubbleProps) {
  const mode = useThemeStore((state) => state.mode);
  const theme = PALETTE[mode];
  const isUser = variant === 'user';
  const isAudit = variant === 'assistant-auditor';
  return (
    <View style={[styles.row, isUser ? styles.userRow : styles.assistantRow]}>
      <View
        style={[
          styles.bubble,
          { backgroundColor: isUser ? theme.subtle : theme.surface, borderColor: theme.border },
        ]}
      >
        <View style={styles.header}>
          {isUser ? (
            <User size={SPACING.lg} color={theme.textMuted} />
          ) : (
            <Bot size={SPACING.lg} color={isAudit ? theme.primary : theme.textMuted} />
          )}
          <AppText variant="caption" color="muted">
            {timestamp ?? CHAT_COPY.now}
          </AppText>
        </View>
        <AppText variant={isAudit ? 'metric-sm' : 'body'} color={isAudit ? 'muted' : 'main'}>
          {text}
        </AppText>
        {status === 'error' && (
          <AppText variant="caption" color="failure" style={styles.error}>
            {CHAT_COPY.failed}
          </AppText>
        )}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  row: { width: '100%', flexDirection: 'row', marginVertical: SPACING.xs },
  userRow: { justifyContent: 'flex-end' },
  assistantRow: { justifyContent: 'flex-start' },
  bubble: {
    maxWidth: '85%',
    minWidth: 0,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.xs },
  error: { marginTop: SPACING.sm },
});
