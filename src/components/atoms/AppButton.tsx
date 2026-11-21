import React from 'react';
import {
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Platform,
  ViewStyle,
  StyleProp,
} from 'react-native';
import { useReduceMotion } from '@/hooks/useReduceMotion';
import { AppText } from './AppText';
import { useThemeStore } from '@/store/useThemeStore';
import { PALETTE, RADIUS, SPACING } from '@/config/theme';
import { MOTION, pressScale, webPressTransition } from '@/config/motion';

export interface AppButtonProps {
  label: string;
  accessibilityLabel?: string;
  onPress: () => void;
  variant?: 'primary' | 'surface' | 'outline' | 'ghost' | 'danger' | 'gold';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  style?: StyleProp<ViewStyle>;
  expanded?: boolean;
  selected?: boolean;
}

export function AppButton({
  label,
  accessibilityLabel,
  onPress,
  variant = 'surface',
  size = 'md',
  isLoading = false,
  disabled = false,
  icon,
  iconPosition = 'left',
  style,
  expanded,
  selected,
}: AppButtonProps) {
  const mode = useThemeStore((s) => s.mode);
  const theme = PALETTE[mode];
  const reduceMotion = useReduceMotion();

  const getVariantStyle = (pressed: boolean): ViewStyle => {
    switch (variant) {
      case 'primary':
        if (disabled && !isLoading) {
          return {
            backgroundColor: theme.subtle,
            borderWidth: 1,
            borderColor: theme.border,
          };
        }
        return {
          backgroundColor: theme.primary,
          borderWidth: 0,
          opacity: pressed ? 0.85 : 1,
        };
      case 'outline':
        return {
          backgroundColor: selected ? theme.subtle : 'transparent',
          borderWidth: 1,
          borderColor: selected ? theme.borderStrong : theme.border,
          opacity: pressed ? 0.7 : 1,
        };
      case 'ghost':
        return {
          backgroundColor: pressed ? theme.subtle : 'transparent',
          borderWidth: 0,
        };
      case 'danger':
        return {
          backgroundColor: theme.failure,
          borderWidth: 0,
          opacity: pressed ? 0.85 : 1,
        };
      case 'gold':
        return {
          backgroundColor: theme.gold,
          borderWidth: 1,
          borderColor: theme.goldText,
          opacity: pressed ? 0.85 : 1,
        };
      case 'surface':
      default:
        return {
          backgroundColor: pressed ? theme.subtle : theme.surface,
          borderWidth: 1,
          borderColor: theme.border,
        };
    }
  };

  const getTextColor = (): 'main' | 'muted' | 'primary' | 'primaryForeground' | 'failureText' => {
    if (variant === 'primary' && disabled && !isLoading) return 'muted';
    if (variant === 'primary' || variant === 'gold') return 'primaryForeground';
    if (variant === 'ghost') return 'muted';
    return 'main';
  };

  return (
    <Pressable
      accessibilityRole="button"
      aria-expanded={expanded}
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: disabled || isLoading, busy: isLoading, expanded, selected }}
      aria-busy={isLoading}
      aria-pressed={Platform.OS === 'web' ? selected : undefined}
      onPress={onPress}
      disabled={disabled || isLoading}
      style={({ pressed }) => [
        styles.base,
        Platform.OS === 'web' && !reduceMotion && webPressTransition,
        styles[size],
        getVariantStyle(pressed),
        pressScale(pressed, reduceMotion, size === 'lg' ? MOTION.pressScaleLarge : undefined),
        (disabled || isLoading) &&
          !(variant === 'primary' && disabled && !isLoading) &&
          styles.disabled,
        style,
      ]}
    >
      {isLoading ? (
        <ActivityIndicator
          size="small"
          color={
            variant === 'primary' || variant === 'gold'
              ? theme.primaryForeground
              : variant === 'danger'
                ? theme.failureForeground
                : theme.textMain
          }
        />
      ) : (
        <>
          {icon && iconPosition === 'left' && icon}
          <AppText
            variant={size === 'sm' ? 'caption' : 'label'}
            style={[
              styles.label,
              variant === 'danger' && { color: theme.failureForeground },
              icon ? (iconPosition === 'left' ? styles.iconRight : styles.iconLeft) : null,
            ]}
            color={getTextColor()}
          >
            {label}
          </AppText>
          {icon && iconPosition === 'right' && icon}
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  label: { flexShrink: 1, minWidth: 0, textAlign: 'center' },
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RADIUS.sm,
    maxWidth: '100%',
    flexShrink: 1,
  },
  sm: {
    minHeight: 44,
    paddingVertical: SPACING.sm,
    paddingHorizontal: 12,
  },
  md: {
    minHeight: 48,
    paddingVertical: SPACING.sm,
    paddingHorizontal: 16,
  },
  lg: {
    minHeight: 56,
    paddingVertical: SPACING.md,
    paddingHorizontal: 20,
  },
  iconRight: {
    marginLeft: 8,
  },
  iconLeft: {
    marginRight: 8,
  },
  disabled: {
    opacity: 0.4,
  },
});
