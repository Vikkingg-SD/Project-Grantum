import React from 'react';
import { View, StyleSheet } from 'react-native';
import { usePathname, useRouter, type Href } from 'expo-router';
import { AppButton } from '@/components/atoms/AppButton';
import { useTheme } from '@/hooks/useTheme';
import { SPACING } from '@/config/theme';
import { normalizePathname } from '@/utils/navigationHistory';

const WORKSPACE_TABS = [
  ['/form-templates', 'Form templates'],
  ['/my-works', 'My Works'],
  ['/project-profile', 'Project Profile'],
] as const;

export function WorkspaceNavigation() {
  const pathname = normalizePathname(usePathname());
  const router = useRouter();
  const theme = useTheme();
  return (
    <View style={[styles.navigation, { borderBottomColor: theme.border }]}>
      {WORKSPACE_TABS.map(([href, label]) => {
        const selected = pathname === href;
        return (
          <AppButton
            key={href}
            label={label}
            size="sm"
            variant="ghost"
            selected={selected}
            style={{
              borderRadius: 0,
              borderBottomWidth: 2,
              borderBottomColor: selected ? theme.primary : 'transparent',
            }}
            onPress={() => {
              if (pathname !== href) router.push(href as Href);
            }}
          />
        );
      })}
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
