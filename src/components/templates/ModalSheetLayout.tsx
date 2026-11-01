import React from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';
import { IconButton } from '../atoms/IconButton';
import { useTheme } from '@/hooks/useTheme';
import { useReduceMotion } from '@/hooks/useReduceMotion';
import { BREAKPOINTS, LAYOUT } from '@/config/layout';
import { RADIUS, SPACING } from '@/config/theme';
import { MODAL_COPY } from '@/config/copy';

export interface ModalSheetLayoutProps {
  visible: boolean;
  onClose: () => void;
  accessibilityLabel: string;
  children: React.ReactNode;
}

export function ModalSheetLayout({
  visible,
  onClose,
  accessibilityLabel,
  children,
}: ModalSheetLayoutProps) {
  const theme = useTheme();
  const reduceMotion = useReduceMotion();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const wide = width >= BREAKPOINTS.md;

  return (
    <Modal
      visible={visible}
      transparent
      animationType={reduceMotion ? 'none' : 'fade'}
      onRequestClose={onClose}
      accessibilityLabel={accessibilityLabel}
    >
      <SafeAreaView style={[styles.overlay, { backgroundColor: theme.overlay }]}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessible={false}
          focusable={false}
        />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={[styles.position, wide && styles.centered]}
        >
          <View
            style={[
              styles.sheet,
              wide && styles.dialog,
              {
                maxHeight: (height - insets.top - insets.bottom) * LAYOUT.modalMaxHeightRatio,
                backgroundColor: theme.surface,
                borderColor: theme.border,
              },
            ]}
          >
            <View style={styles.closeRow}>
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
  closeRow: { alignItems: 'flex-end', paddingHorizontal: SPACING.lg, paddingTop: SPACING.sm },
});
