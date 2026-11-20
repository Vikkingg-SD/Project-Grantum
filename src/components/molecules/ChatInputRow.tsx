import { LocalAttachments } from './LocalAttachments';
import React from 'react';
import { Platform, View, TextInput, StyleSheet, type TextInputProps } from 'react-native';
import MoreHorizontal from 'lucide-react-native/icons/ellipsis';
import Send from 'lucide-react-native/icons/send';
import X from 'lucide-react-native/icons/x';
import Sparkles from 'lucide-react-native/icons/sparkles';
import { AppText } from '../atoms/AppText';
import { AttachmentIcon } from '../atoms/AttachmentIcon';
import { IconButton } from '../atoms/IconButton';
import { useThemeStore } from '@/store/useThemeStore';
import { useDraftStore, EMPTY_DRAFT } from '@/store/useDraftStore';
import {
  PALETTE,
  RADIUS,
  SPACING,
  TYPOGRAPHY,
  DESKTOP_TYPOGRAPHY,
  withAlpha,
} from '@/config/theme';
import { useLayoutMetrics } from '@/hooks/useLayoutMetrics';
import { LAYOUT } from '@/config/layout';
import { MAX_INPUT_CHARS } from '@/config/constants';
import { CHAT_COPY } from '@/config/copy';
import { canSendMessage, composerKeyAction } from '@/utils/composer';
import type { LocalAttachment } from '@/utils/attachments';

const EMPTY_ATTACHMENTS: LocalAttachment[] = [];

export interface ChatInputRowProps {
  draftKey?: string;
  onOptions?: () => void;
  optionsLabel?: string;
  activeTool?: { id: string; label: string } | null;
  onClearTool?: () => void;
  value: string;
  onChangeText: (text: string) => void;
  onSend: () => void;
  placeholder?: string;
  disabled?: boolean;
}

export function ChatInputRow({
  draftKey,
  onOptions,
  optionsLabel = 'Tools and prompts',
  activeTool,
  onClearTool,
  value,
  onChangeText,
  onSend,
  placeholder = CHAT_COPY.placeholder,
  disabled = false,
}: ChatInputRowProps) {
  const mode = useThemeStore((state) => state.mode);
  const theme = PALETTE[mode];
  const { desktop } = useLayoutMetrics();
  const stagedAttachments = useDraftStore((state) =>
    draftKey ? (state.drafts[draftKey] ?? EMPTY_DRAFT).attachments : EMPTY_ATTACHMENTS
  );
  const setAttachments = useDraftStore((state) => state.setAttachments);
  const canSend = canSendMessage(value, disabled, stagedAttachments.length);

  const send = () => {
    if (canSendMessage(value, disabled, stagedAttachments.length)) onSend();
  };

  const handleKeyPress: NonNullable<TextInputProps['onKeyPress']> = (event) => {
    if (Platform.OS !== 'web') return;
    const action = composerKeyAction(event.nativeEvent, value, disabled, stagedAttachments.length);
    if (action === 'none') return;
    event.preventDefault();
    if (action === 'send') send();
  };

  const hasTray = stagedAttachments.length > 0 || Boolean(activeTool);

  return (
    <View
      style={[styles.wrapper, { backgroundColor: theme.surface, borderTopColor: theme.border }]}
    >
      {hasTray && (
        <View testID="composer-attachment-tray" style={styles.tray}>
          {activeTool ? (
            <View
              style={[
                styles.chip,
                {
                  backgroundColor: withAlpha(theme.primary, 0.12),
                  borderColor: withAlpha(theme.primary, 0.4),
                },
              ]}
            >
              <Sparkles size={15} color={theme.primaryText} />
              <AppText variant="caption" color="primary" numberOfLines={1} style={styles.chipText}>
                {activeTool.label}
              </AppText>
              {onClearTool ? (
                <View style={styles.chipCloseSlot}>
                  <IconButton
                    label={`Remove tool ${activeTool.label}`}
                    icon={<X size={16} color={theme.primaryText} />}
                    onPress={onClearTool}
                  />
                </View>
              ) : null}
            </View>
          ) : null}
          {stagedAttachments.map((file) => (
            <View
              key={file.id}
              testID={`staged-attachment-${file.id}`}
              style={[styles.chip, { backgroundColor: theme.subtle, borderColor: theme.border }]}
            >
              <AttachmentIcon
                name={file.name}
                type={file.type}
                size={15}
                color={theme.primaryText}
              />
              <AppText variant="caption" numberOfLines={1} style={styles.chipText}>
                {file.name} · {Math.max(1, Math.ceil(file.size / 1024))} KB
              </AppText>
              {draftKey ? (
                <View style={styles.chipCloseSlot}>
                  <IconButton
                    label={`Remove attached ${file.name}`}
                    icon={<X size={16} color={theme.textMuted} />}
                    onPress={() =>
                      setAttachments(
                        draftKey,
                        stagedAttachments.filter((item) => item.id !== file.id)
                      )
                    }
                  />
                </View>
              ) : null}
            </View>
          ))}
        </View>
      )}
      <View style={styles.container}>
        {onOptions && (
          <IconButton
            label={optionsLabel}
            icon={<MoreHorizontal size={20} color={theme.textMain} />}
            onPress={onOptions}
          />
        )}
        {Boolean(draftKey) && <LocalAttachments draftKey={draftKey!} />}
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
            desktop && DESKTOP_TYPOGRAPHY.body,
            {
              height: desktop ? 80 : 72,
              color: theme.textMain,
              backgroundColor: theme.subtle,
              borderColor: theme.inputBorder,
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
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderTopWidth: 1,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    gap: SPACING.sm,
  },
  tray: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    maxWidth: '100%',
    minHeight: LAYOUT.minTouchTarget,
    paddingLeft: SPACING.sm,
    paddingRight: 2,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    gap: SPACING.xs,
  },
  chipText: {
    flexShrink: 1,
    minWidth: 0,
  },
  chipCloseSlot: {
    flexShrink: 0,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
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
