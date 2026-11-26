import { useRef, useState, type PropsWithChildren } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppButton } from '@/components/atoms/AppButton';
import { AppText } from '@/components/atoms/AppText';
import { PALETTE } from '@/config/theme';
import { useThemeStore } from '@/store/useThemeStore';

export const actionStyles = StyleSheet.create({
  block: { gap: 12 },
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  card: { borderWidth: 1, borderRadius: 12, padding: 16, gap: 12 },
  multiline: { minHeight: 100, textAlignVertical: 'top' },
});

export function Card({ children }: PropsWithChildren) {
  const colors = useThemeStore((state) => PALETTE[state.mode]);
  return (
    <View
      style={[actionStyles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
    >
      {children}
    </View>
  );
}

export function useAction() {
  const active = useRef(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  async function run(work: () => Promise<void>, success?: string) {
    if (active.current) return;
    active.current = true;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await work();
      if (success) setMessage(success);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'This action could not be completed.');
    } finally {
      active.current = false;
      setBusy(false);
    }
  }
  return { run, error, message, busy };
}

export function ActionMessage({ action }: { action: ReturnType<typeof useAction> }) {
  if (action.error)
    return (
      <AppText accessibilityRole="alert" color="failureText">
        {action.error}
      </AppText>
    );
  if (action.message)
    return (
      <AppText accessibilityLiveRegion="polite" color="verified">
        {action.message}
      </AppText>
    );
  return null;
}

export function QueryMessage({
  pending,
  error,
  retry,
}: {
  pending: boolean;
  error: Error | null;
  retry: () => void;
}) {
  if (pending) return <AppText accessibilityLiveRegion="polite">Loading…</AppText>;
  if (!error) return null;
  return (
    <View style={actionStyles.block}>
      <AppText accessibilityRole="alert" color="failureText">
        {error.message}
      </AppText>
      <AppButton label="Retry loading" onPress={retry} />
    </View>
  );
}
