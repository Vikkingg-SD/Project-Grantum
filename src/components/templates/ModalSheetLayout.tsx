import React from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import X from 'lucide-react-native/icons/x';
import { AppText } from '../atoms/AppText';
import { IconButton } from '../atoms/IconButton';
import { useTheme } from '@/hooks/useTheme';
import { useReduceMotion } from '@/hooks/useReduceMotion';
import { LAYOUT } from '@/config/layout';
import { useLayoutMetrics } from '@/hooks/useLayoutMetrics';
import { RADIUS, SPACING } from '@/config/theme';
import { MODAL_COPY } from '@/config/copy';

export interface ModalSheetLayoutProps {
  visible: boolean;
  onClose: () => void;
  accessibilityLabel: string;
  title?: string;
  children: React.ReactNode;
  size?: 'compact' | 'workspace';
}

export function ModalSheetLayout({
  visible,
  onClose,
  accessibilityLabel,
  title,
  children,
  size = 'compact',
}: ModalSheetLayoutProps) {
  const theme = useTheme();
  const reduceMotion = useReduceMotion();
  const { mobile, height } = useLayoutMetrics();
  const insets = useSafeAreaInsets();
  const wide = !mobile;

  return (
    <Modal
      visible={visible}
      transparent
      animationType={Platform.OS === 'web' || reduceMotion ? 'none' : 'fade'}
      onRequestClose={onClose}
      accessibilityLabel={accessibilityLabel}
    >
      <SafeAreaView style={[styles.overlay, { backgroundColor: theme.overlay }]}>
        {Platform.OS === 'web' ? (
          <View
            accessible={false}
            style={StyleSheet.absoluteFill}
            onStartShouldSetResponder={() => true}
            onResponderRelease={onClose}
          />
        ) : (
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={onClose}
            accessible={false}
            focusable={false}
          />
        )}
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={[styles.position, wide && styles.centered]}
        >
          <View
            testID={size === 'workspace' ? 'workspace-sheet' : 'modal-sheet'}
            style={[
              styles.sheet,
              wide && styles.dialog,
              wide && size === 'workspace' && styles.workspace,
              {
                maxHeight: (height - insets.top - insets.bottom) * LAYOUT.modalMaxHeightRatio,
                backgroundColor: theme.surface,
                borderColor: theme.border,
              },
            ]}
          >
            <View style={[styles.closeRow, Boolean(title) && styles.headerRow]}>
              {Boolean(title) && (
                <AppText variant="h2" style={styles.headerTitle}>
                  {title}
                </AppText>
              )}
              <IconButton
                icon={<X size={SPACING.xl} color={theme.textMuted} />}
                label={MODAL_COPY.close}
                onPress={onClose}
              />
            </View>
            {children}
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1 },
  position: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    pointerEvents: 'box-none',
  },
  centered: { justifyContent: 'center', padding: SPACING.lg },
  sheet: {
    width: '100%',
    flexShrink: 1,
    borderTopLeftRadius: RADIUS.lg,
    borderTopRightRadius: RADIUS.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  dialog: { maxWidth: LAYOUT.modalMaxWidth, borderRadius: RADIUS.lg },
  workspace: { maxWidth: 1120 },
  closeRow: { alignItems: 'flex-end', paddingHorizontal: SPACING.lg, paddingTop: SPACING.sm },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.md,
    paddingTop: SPACING.md,
  },
  headerTitle: { flex: 1, minWidth: 0 },
});
