import React from 'react';
import { Linking, Platform, Pressable, StyleSheet, type PressableProps } from 'react-native';
import ExternalLink from 'lucide-react-native/icons/external-link';
import { AppText } from '@/components/atoms/AppText';
import { useTheme } from '@/hooks/useTheme';
import { LAYOUT } from '@/config/layout';
import { RADIUS, SPACING } from '@/config/theme';
import { isSafeExternalUrl } from '@/utils/navigationHistory';

export interface ExternalSourceLinkProps {
  url: string;
  accessibilityLabel: string;
  color?: 'primary' | 'verified';
  iconSize?: number;
  bordered?: boolean;
  testID?: string;
  onError?: (message: string) => void;
}

type WebAnchorPressableProps = PressableProps & {
  href?: string;
  hrefAttrs?: { target?: string; rel?: string };
};

export function ExternalSourceLink({
  url,
  accessibilityLabel,
  color = 'primary',
  iconSize = 14,
  bordered = false,
  testID,
  onError,
}: ExternalSourceLinkProps) {
  const theme = useTheme();
  const safeUrl = isSafeExternalUrl(url) ? url.trim() : null;
  if (!safeUrl) return null;

  const iconColor = color === 'verified' ? theme.verifiedText : theme.primaryText;

  const handleNativePress = () => {
    void (async () => {
      try {
        const supported = await Linking.canOpenURL(safeUrl);
        if (!supported) throw new Error('Unsupported link');
        await Linking.openURL(safeUrl);
      } catch {
        onError?.('Unable to open this link. Copy and verify it manually.');
      }
    })();
  };

  const webProps: Partial<WebAnchorPressableProps> =
    Platform.OS === 'web'
      ? {
          href: safeUrl,
          hrefAttrs: { target: '_blank', rel: 'noopener noreferrer' },
        }
      : {};

  return (
    <Pressable
      testID={testID}
      accessibilityRole="link"
      accessibilityLabel={accessibilityLabel}
      onPress={Platform.OS === 'web' ? undefined : handleNativePress}
      {...(webProps as PressableProps)}
      style={({ pressed }) => [
        bordered ? styles.borderedBox : styles.inlineRow,
        bordered && { borderColor: theme.verified, backgroundColor: theme.subtle },
        pressed && styles.pressed,
      ]}
    >
      <AppText variant="caption" color={color} selectable style={styles.url}>
        {safeUrl}
      </AppText>
      <ExternalLink size={iconSize} color={iconColor} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  inlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    minHeight: LAYOUT.minTouchTarget,
  },
  borderedBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.sm,
    borderWidth: 1,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    minHeight: LAYOUT.minTouchTarget,
  },
  pressed: { opacity: 0.75 },
  url: { flex: 1, minWidth: 0, flexShrink: 1 },
});
