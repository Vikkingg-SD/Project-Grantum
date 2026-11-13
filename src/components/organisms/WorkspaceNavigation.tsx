import React from 'react';
import { View, StyleSheet } from 'react-native';
import { usePathname, useRouter } from 'expo-router';
import { AppButton } from '@/components/atoms/AppButton';
import { useTheme } from '@/hooks/useTheme';
import { SPACING } from '@/config/theme';

export function WorkspaceNavigation() {
  const pathname = usePathname();
  const router = useRouter();
  const theme = useTheme();
  return (
    <View style={[styles.navigation, { borderBottomColor: theme.border }]}>
      {(
        [
          ['/discover', 'Discover'],
          ['/my-works', 'My Works'],
          ['/project-profile', 'Project Profile'],
        ] as const
      ).map(([href, label]) => (
        <AppButton
          key={href}
          label={label}
          size="sm"
          variant="ghost"
          selected={
            pathname === href || (href === '/discover' && pathname.endsWith('/discovery-studio'))
          }
          style={{
            borderRadius: 0,
            borderBottomWidth: 2,
            borderBottomColor:
              pathname === href || (href === '/discover' && pathname.endsWith('/discovery-studio'))
                ? theme.primary
                : 'transparent',
          }}
          onPress={() => {
            if (pathname !== href) router.navigate(href);
          }}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  navigation: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: SPACING.sm,
    padding: SPACING.sm,
    borderBottomWidth: 1,
  },
});
