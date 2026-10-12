import React from 'react';
import { Pressable, StyleSheet, ActivityIndicator, ViewStyle, StyleProp } from 'react-native';
import { AppText } from './AppText';
import { useThemeStore } from '@/store/useThemeStore';
import { PALETTE } from '@/config/theme';

export interface AppButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'surface' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  style?: StyleProp<ViewStyle>;
}

export function AppButton({
  label,
  onPress,
  variant = 'surface',
  size = 'md',
  isLoading = false,
  disabled = false,
  icon,
  iconPosition = 'left',
  style,
}: AppButtonProps) {
  const { mode } = useThemeStore();
  const theme = PALETTE[mode];

  const getVariantStyle = (pressed: boolean): ViewStyle => {
    switch (variant) {
      case 'primary':
        return {
          backgroundColor: theme.primary,
          borderWidth: 0,
          opacity: pressed ? 0.85 : 1,
        };
      case 'outline':
        return {
          backgroundColor: 'transparent',
          borderWidth: 1,
          borderColor: theme.border,
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
      case 'surface':
      default:
        return {
          backgroundColor: pressed ? theme.subtle : theme.surface,
          borderWidth: 1,
          borderColor: theme.border,
        };
    }
  };

  const getTextColor = () => {
    if (variant === 'primary') return 'primaryForeground';
    if (variant === 'danger') return 'main';
    if (variant === 'ghost') return 'muted';
    return 'main';
  };

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || isLoading}
      style={({ pressed }) => [
        styles.base,
        styles[size],
        getVariantStyle(pressed),
        (disabled || isLoading) && styles.disabled,
        style,
      ]}
    >
      {isLoading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'primary' ? theme.primaryForeground : theme.textMain}
        />
      ) : (
        <>
          {icon && iconPosition === 'left' && icon}
          <AppText
            variant={size === 'sm' ? 'caption' : 'body'}
            style={[
              styles.text,
              icon ? (iconPosition === 'left' ? styles.iconRight : styles.iconLeft) : null,
            ]}
            color={getTextColor() as any}
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
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  sm: {
    height: 36,
    paddingHorizontal: 12,
  },
  md: {
    height: 44,
    paddingHorizontal: 16,
  },
  lg: {
    height: 50,
    paddingHorizontal: 20,
  },
  text: {
    fontWeight: '600',
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
