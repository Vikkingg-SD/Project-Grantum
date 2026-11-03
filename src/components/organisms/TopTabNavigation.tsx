import React, { useEffect, useRef } from 'react';
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
import { VIEW_PATHS, type AppView } from '@/hooks/useActiveView';
import { AppText } from '@/components/atoms/AppText';
import { useTheme } from '@/hooks/useTheme';
import { NAV_COPY } from '@/config/copy';
import { SPACING } from '@/config/theme';
import { LAYOUT } from '@/config/layout';

export interface NavigationItem {
  name: AppView;
  label: string;
  href: Href;
  icon: typeof LayoutDashboard;
  locked?: boolean;
  disabled?: boolean;
}

export const NAVIGATION_ITEMS: readonly Omit<NavigationItem, 'href'>[] = [
  { name: 'index', label: NAV_COPY.dashboard, icon: LayoutDashboard },
  { name: 'discovery', label: NAV_COPY.discovery, icon: Compass },
  { name: 'drafting', label: NAV_COPY.drafting, icon: PenTool },
  { name: 'audit', label: NAV_COPY.audit, icon: ShieldCheck },
  { name: 'export', label: NAV_COPY.export, icon: FileCheck },
  {
    name: 'post-award',
    label: NAV_COPY.postAward,
    icon: Award,
    locked: true,
  },
];

export function navigationItemsForGrant(grantID: string) {
  return NAVIGATION_ITEMS.map((item) => ({
    ...item,
    routePath: VIEW_PATHS[item.name],
    href: { pathname: `/grants/[grantID]/${VIEW_PATHS[item.name]}` as const, params: { grantID } },
    disabled: !grantID || item.disabled,
  }));
}

export interface TopTabNavigationProps {
  items?: readonly NavigationItem[];
  selectedName?: string;
  onSelect: (item: NavigationItem) => void;
}

export function TopTabNavigation({
  items = navigationItemsForGrant(''),
  selectedName,
  onSelect,
}: TopTabNavigationProps) {
  const theme = useTheme();
  const scrollRef = useRef<ScrollView>(null);
  const positions = useRef<Record<string, number>>({});
  useEffect(() => {
    scrollRef.current?.scrollTo({ x: positions.current[selectedName ?? ''] ?? 0, animated: false });
  }, [selectedName]);
  return (
    <ScrollView
      ref={scrollRef}
      horizontal
      accessibilityRole="tablist"
      accessibilityLabel={NAV_COPY.primary}
      style={{
        flexGrow: 0,
        flexShrink: 0,
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
            onLayout={({ nativeEvent }) => {
              positions.current[item.name] = nativeEvent.layout.x;
              if (selected) {
                scrollRef.current?.scrollTo({ x: nativeEvent.layout.x, animated: false });
              }
            }}
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
              {
                backgroundColor: selected || pressed ? theme.subtle : theme.surface,
                borderBottomColor: selected ? theme.primary : 'transparent',
              },
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

export function MobileTabNavigation(props: TopTabNavigationProps) {
  return <TopTabNavigation {...props} />;
}

const styles = StyleSheet.create({
  list: { flexGrow: 1, alignItems: 'center' },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    minHeight: LAYOUT.minTouchTarget,
    minWidth: LAYOUT.minTouchTarget,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 2,
    flexGrow: 1,
  },
});
