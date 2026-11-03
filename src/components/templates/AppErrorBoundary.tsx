import React, { useState } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { reloadAppAsync } from 'expo';
import { create } from 'zustand';
import type { ErrorBoundaryProps } from 'expo-router';
import { AppText } from '@/components/atoms/AppText';
import { AppButton } from '@/components/atoms/AppButton';
import { ERROR_COPY } from '@/config/copy';
import { PALETTE, RADIUS, SPACING } from '@/config/theme';
import { LAYOUT } from '@/config/layout';
import { useThemeStore } from '@/store/useThemeStore';

type FaultTarget = 'root' | 'tab' | 'screen';
const useRecoveryFault = create<{ target: FaultTarget | null; remaining: number }>(() => ({
  target: null,
  remaining: 0,
}));

// Diagnostic state is transient and cannot be armed in a release build.
export function armRecoveryFault(target: FaultTarget, remaining = 1): void {
  if (__DEV__) useRecoveryFault.setState({ target, remaining });
}

export function useRecoveryProbe(target: FaultTarget): void {
  const fail = useRecoveryFault((s) => s.target === target && s.remaining > 0);
  if (__DEV__ && fail) throw new Error(`GRANTUM_RECOVERY_${target.toUpperCase()}`);
}

export function AppErrorBoundary({
  retry,
  screen = false,
}: ErrorBoundaryProps & { screen?: boolean }) {
  const mode = useThemeStore((s) => s.mode);
  const theme = PALETTE[mode];
  const [pending, setPending] = useState<'retry' | 'reload' | null>(null);
  const [actionFailed, setActionFailed] = useState(false);
  const perform = async (action: 'retry' | 'reload') => {
    if (pending) return;
    setPending(action);
    setActionFailed(false);
    try {
      if (__DEV__) {
        useRecoveryFault.setState((s) => ({ remaining: Math.max(0, s.remaining - 1) }));
      }
      if (action === 'retry') await retry();
      else if (Platform.OS === 'web') window.location.reload();
      else await reloadAppAsync();
    } catch {
      // The generic fallback stays usable; raw runtime errors never become product copy.
      setActionFailed(true);
    } finally {
      setPending(null);
    }
  };

  return (
    <SafeAreaProvider>
      <SafeAreaView style={[styles.stage, { backgroundColor: theme.background }]}>
        <View
          testID="recovery-fallback"
          style={[styles.panel, { backgroundColor: theme.surface, borderColor: theme.border }]}
        >
          <AppText variant="eyebrow" color="failure">
            {ERROR_COPY.title}
          </AppText>
          <AppText color="muted" accessibilityRole={actionFailed ? 'alert' : undefined}>
            {screen ? ERROR_COPY.screenMessage : ERROR_COPY.routeMessage}
          </AppText>
          <View style={styles.actions}>
            <AppButton
              label={ERROR_COPY.retry}
              variant="outline"
              disabled={pending !== null}
              isLoading={pending === 'retry'}
              onPress={() => void perform('retry')}
            />
            <AppButton
              label={screen ? ERROR_COPY.screenReload : ERROR_COPY.reload}
              variant="primary"
              disabled={pending !== null}
              isLoading={pending === 'reload'}
              onPress={() => void perform('reload')}
            />
          </View>
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

export function AppScreenErrorBoundary(props: ErrorBoundaryProps) {
  return <AppErrorBoundary {...props} screen />;
}

const styles = StyleSheet.create({
  stage: { flex: 1, justifyContent: 'center', padding: SPACING['2xl'] },
  panel: {
    width: '100%',
    maxWidth: LAYOUT.authMaxWidth,
    alignSelf: 'center',
    padding: SPACING['2xl'],
    gap: SPACING.lg,
    borderWidth: 1,
    borderRadius: RADIUS.lg,
  },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
});
