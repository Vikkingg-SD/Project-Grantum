import React, { useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  useWindowDimensions,
  type ViewStyle,
  type StyleProp,
  type KeyboardAvoidingViewProps,
} from 'react-native';
import { useNavigation } from 'expo-router';
import { useSafeAreaInsets, type Edge } from 'react-native-safe-area-context';
import { useThemeStore } from '@/store/useThemeStore';
import { PALETTE, SPACING } from '@/config/theme';
import { BREAKPOINTS, LAYOUT } from '@/config/layout';

export interface ScreenContainerProps {
  children: React.ReactNode;
  scrollable?: boolean;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  insetEdges?: readonly Edge[];
  keyboardBehavior?: KeyboardAvoidingViewProps['behavior'];
  keyboardVerticalOffset?: number;
}

export function ScreenContainer({
  children,
  scrollable = true,
  style,
  contentStyle,
  insetEdges,
  keyboardBehavior = Platform.OS === 'ios' ? 'padding' : undefined,
  keyboardVerticalOffset,
}: ScreenContainerProps) {
  const mode = useThemeStore((s) => s.mode);
  const theme = PALETTE[mode];
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { width } = useWindowDimensions();
  const measureRef = useRef<View>(null);
  const [windowY, setWindowY] = useState(0);
  // Current tab callers already sit between a header and bottom tab bar. Root/gallery
  // callers own both vertical edges. Explicit edges support other composed containers.
  const edges =
    insetEdges ??
    (navigation.getState()?.type === 'tab'
      ? ['left', 'right']
      : ['top', 'right', 'bottom', 'left']);
  const safeStyle = {
    paddingTop: edges.includes('top') ? insets.top : 0,
    paddingBottom: edges.includes('bottom') ? insets.bottom : 0,
    paddingLeft: edges.includes('left') ? insets.left : 0,
    paddingRight: edges.includes('right') ? insets.right : 0,
  };
  const pagePadding =
    width >= BREAKPOINTS.md ? LAYOUT.pagePaddingDesktop : LAYOUT.pagePaddingMobile;
  const content = scrollable ? (
    <ScrollView
      style={styles.container}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
      automaticallyAdjustKeyboardInsets={false}
      contentContainerStyle={[
        styles.content,
        { padding: pagePadding, paddingBottom: SPACING['3xl'] },
        style,
        contentStyle,
      ]}
    >
      <View testID="screen-content">{children}</View>
    </ScrollView>
  ) : (
    <View testID="screen-content" style={[styles.container, style, contentStyle]}>
      {children}
    </View>
  );

  return (
    <View
      ref={measureRef}
      testID="screen-container"
      onLayout={() => {
        if (Platform.OS === 'ios') measureRef.current?.measureInWindow((_x, y) => setWindowY(y));
      }}
      style={[styles.container, { backgroundColor: theme.background }, safeStyle]}
    >
      <KeyboardAvoidingView
        style={styles.container}
        behavior={keyboardBehavior}
        enabled={Platform.OS === 'ios' || keyboardBehavior !== undefined}
        keyboardVerticalOffset={keyboardVerticalOffset ?? windowY}
      >
        {content}
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
  },
});
