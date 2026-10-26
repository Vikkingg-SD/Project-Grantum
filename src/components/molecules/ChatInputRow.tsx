import React from 'react';
import { Platform, View, TextInput, StyleSheet, type TextInputProps } from 'react-native';
import { Send } from 'lucide-react-native';
import { IconButton } from '../atoms/IconButton';
import { useThemeStore } from '@/store/useThemeStore';
import { PALETTE, RADIUS, SPACING, TYPOGRAPHY } from '@/config/theme';
import { LAYOUT } from '@/config/layout';
import { MAX_INPUT_CHARS } from '@/config/constants';
import { CHAT_COPY } from '@/config/copy';
import { canSendMessage, composerKeyAction } from '@/utils/composer';

export interface ChatInputRowProps {
  value: string;
  onChangeText: (text: string) => void;
  onSend: () => void;
  placeholder?: string;
  disabled?: boolean;
}

export function ChatInputRow({
  value,
  onChangeText,
  onSend,
  placeholder = CHAT_COPY.placeholder,
  disabled = false,
}: ChatInputRowProps) {
  const mode = useThemeStore((state) => state.mode);
  const theme = PALETTE[mode];
  const canSend = canSendMessage(value, disabled);

  const send = () => {
    if (canSendMessage(value, disabled)) onSend();
  };

  const handleKeyPress: NonNullable<TextInputProps['onKeyPress']> = (event) => {
    if (Platform.OS !== 'web') return;
    const action = composerKeyAction(event.nativeEvent, value, disabled);
    if (action === 'none') return;
    event.preventDefault();
    if (action === 'send') send();
  };

  return (
    <View
      style={[styles.container, { backgroundColor: theme.surface, borderTopColor: theme.border }]}
    >
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        accessibilityLabel={placeholder}
        accessibilityState={{ disabled }}
        placeholderTextColor={theme.textMuted}
        editable={!disabled}
        multiline
        submitBehavior="newline"
        maxLength={MAX_INPUT_CHARS}
        onKeyPress={handleKeyPress}
        style={[
          styles.input,
          {
            color: theme.textMain,
            backgroundColor: theme.subtle,
            borderColor: theme.border,
          },
        ]}
      />
      <IconButton
        icon={<Send size={SPACING.lg} color={canSend ? theme.primary : theme.textMuted} />}
        onPress={send}
        label={CHAT_COPY.send}
        active
        disabled={!canSend}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: SPACING.md,
    borderTopWidth: 1,
    gap: SPACING.sm,
  },
  input: {
    ...TYPOGRAPHY.body,
    flex: 1,
    minWidth: 0,
    minHeight: LAYOUT.minTouchTarget,
    maxHeight: SPACING['4xl'] * 4,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    textAlignVertical: 'top',
  },
});
