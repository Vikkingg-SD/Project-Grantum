import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Bot, User } from 'lucide-react-native';
import { AppText } from '../atoms/AppText';
import { useThemeStore } from '@/store/useThemeStore';
import { PALETTE, RADIUS } from '@/config/theme';
import { ChatMessage } from '@/types/api';

export function ChatMessageBubble({ text, variant, timestamp = 'now' }: ChatMessage) {
  const { mode } = useThemeStore();
  const theme = PALETTE[mode];
  const isUser = variant === 'user';
  const isAudit = variant === 'assistant-auditor';

  return (
    <View style={[styles.row, isUser ? styles.userRow : styles.assistantRow]}>
      <View
        style={[
          styles.bubble,
          isUser
            ? { backgroundColor: theme.subtle, borderColor: theme.border }
            : isAudit
              ? { backgroundColor: theme.surface, borderColor: theme.border, borderWidth: 1 }
              : { backgroundColor: theme.surface, borderColor: theme.border },
        ]}
      >
        <View style={styles.header}>
          {isUser ? (
            <User size={14} color={theme.textMuted} />
          ) : (
            <Bot size={14} color={isAudit ? theme.verified : theme.primary} />
          )}
          <AppText variant="caption" color="muted" style={styles.timestamp}>
            {timestamp}
          </AppText>
        </View>
        <AppText
          variant={isAudit ? 'metric-sm' : 'body'}
          color="main"
          style={isAudit ? styles.monoText : null}
        >
          {text}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    width: '100%',
    flexDirection: 'row',
    marginVertical: 6,
  },
  userRow: {
    justifyContent: 'flex-end',
  },
  assistantRow: {
    justifyContent: 'flex-start',
  },
  bubble: {
    maxWidth: '85%',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    padding: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  timestamp: {
    fontSize: 11,
  },
  monoText: {
    fontSize: 13,
  },
});
