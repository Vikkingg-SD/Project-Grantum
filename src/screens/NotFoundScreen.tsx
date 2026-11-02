import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenContainer } from '@/components/templates/ScreenContainer';
import { AppText } from '@/components/atoms/AppText';
import { AppButton } from '@/components/atoms/AppButton';
import { SPACING } from '@/config/theme';

export default function NotFoundScreen() {
  const router = useRouter();
  return (
    <ScreenContainer>
      <View style={styles.content}>
        <AppText variant="display" color="primary">
          404
        </AppText>
        <AppText variant="h1">Signal lost</AppText>
        <AppText color="muted">
          This route is not part of the instrument. Return to the command center to continue the
          demonstration.
        </AppText>
        <AppButton
          label="Back to dashboard"
          variant="primary"
          onPress={() => router.replace('/(tabs)')}
        />
      </View>
    </ScreenContainer>
  );
}
const styles = StyleSheet.create({
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: SPACING.lg },
});
