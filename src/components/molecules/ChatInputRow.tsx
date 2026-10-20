import React from 'react';
import { View, TextInput, StyleSheet } from 'react-native';
import { Send } from 'lucide-react-native';
import { IconButton } from '../atoms/IconButton';
import { useThemeStore } from '@/store/useThemeStore';
import { PALETTE, RADIUS } from '@/config/theme';
import { FONT } from '@/config/fonts';

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
  placeholder = 'Describe narrative changes or prompt auditor…',
  disabled = false,
}: ChatInputRowProps) {
  const mode = useThemeStore((s) => s.mode);
  const theme = PALETTE[mode];

  return (
    <View
      style={[styles.container, { backgroundColor: theme.surface, borderTopColor: theme.border }]}
    >
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.textMuted}
        editable={!disabled}
        style={[
          styles.input,
          {
            color: theme.textMain,
            backgroundColor: theme.subtle,
            borderColor: theme.border,
            fontFamily: FONT.sans.regular,
          },
        ]}
      />
      <IconButton
        icon={<Send size={18} color={value.trim() ? theme.primary : theme.textMuted} />}
        onPress={onSend}
        label="Send"
        disabled={disabled || !value.trim()}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderTopWidth: 1,
    gap: 10,
  },
  input: {
    flex: 1,
    height: 44,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 14,
  },
});
