import React from 'react';
import { ScrollView, Pressable, StyleSheet } from 'react-native';
import {
  LayoutDashboard,
  Compass,
  PenTool,
  ShieldCheck,
  FileCheck,
  Award,
  Lock,
} from 'lucide-react-native';
import type { Href } from 'expo-router';
import { AppText } from '@/components/atoms/AppText';
import { useTheme } from '@/hooks/useTheme';
import { NAV_COPY } from '@/config/copy';
import { SPACING } from '@/config/theme';
import { LAYOUT } from '@/config/layout';

export interface NavigationItem {
  name: string;
  label: string;
  href: Href;
  icon: typeof LayoutDashboard;
  locked?: boolean;
  disabled?: boolean;
}

export const NAVIGATION_ITEMS: readonly NavigationItem[] = [
  { name: 'index', label: NAV_COPY.dashboard, href: '/(tabs)', icon: LayoutDashboard },
  { name: 'discovery', label: NAV_COPY.discovery, href: '/(tabs)/discovery', icon: Compass },
  { name: 'drafting', label: NAV_COPY.drafting, href: '/(tabs)/drafting', icon: PenTool },
  { name: 'audit', label: NAV_COPY.audit, href: '/(tabs)/audit', icon: ShieldCheck },
  { name: 'export', label: NAV_COPY.export, href: '/(tabs)/export', icon: FileCheck },
  {
    name: 'post-award',
    label: NAV_COPY.postAward,
    href: '/(tabs)/post-award',
    icon: Award,
    locked: true,
  },
];

export interface TopTabNavigationProps {
  items?: readonly NavigationItem[];
  selectedName?: string;
  onSelect: (item: NavigationItem) => void;
}

export function TopTabNavigation({
  items = NAVIGATION_ITEMS,
  selectedName,
  onSelect,
}: TopTabNavigationProps) {
  const theme = useTheme();
  return (
    <ScrollView
      horizontal
      accessibilityRole="tablist"
      accessibilityLabel={NAV_COPY.primary}
      style={{
        backgroundColor: theme.surface,
        borderBottomColor: theme.border,
        borderBottomWidth: 1,
      }}
      contentContainerStyle={styles.list}
      showsHorizontalScrollIndicator
    >
      {items.map((item) => {
        const selected = item.name === selectedName;
        return (
          <Pressable
            key={item.name}
            accessibilityRole="tab"
            accessibilityLabel={item.label}
            accessibilityHint={item.locked ? NAV_COPY.lockedPreview : undefined}
            accessibilityState={{ selected, disabled: item.disabled ?? false }}
            aria-selected={selected}
            aria-disabled={item.disabled ?? false}
            disabled={item.disabled}
            onPress={() => onSelect(item)}
            style={({ pressed }) => [
              styles.item,
              { backgroundColor: selected || pressed ? theme.subtle : theme.surface },
            ]}
          >
            <AppText variant="label" color={selected ? 'main' : 'muted'}>
              {item.label}
            </AppText>
            {item.locked ? <Lock size={SPACING.md} color={theme.textMuted} /> : null}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  list: { flexGrow: 1 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    minHeight: LAYOUT.minTouchTarget,
    minWidth: LAYOUT.minTouchTarget,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    flexGrow: 1,
  },
});
