import React from 'react';
import { View, StyleSheet } from 'react-native';
import { AppText } from '../atoms/AppText';
import { AppButton } from '../atoms/AppButton';

export interface EmptyStateLayoutProps {
  title: string;
  description: string;
  ctaLabel?: string;
  onCtaPress?: () => void;
}

export function EmptyStateLayout({
  title,
  description,
  ctaLabel,
  onCtaPress,
}: EmptyStateLayoutProps) {
  return (
    <View style={styles.container}>
      <AppText variant="h2" align="center">
        {title}
      </AppText>
      <AppText variant="body" color="muted" align="center" style={styles.desc}>
        {description}
      </AppText>
      {ctaLabel && onCtaPress && (
        <View style={styles.cta}>
          <AppButton label={ctaLabel} variant="primary" onPress={onCtaPress} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  desc: {
    marginTop: 8,
    maxWidth: 320,
  },
  cta: {
    marginTop: 16,
  },
});
