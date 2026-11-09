import React, { useState } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import LayoutDashboard from 'lucide-react-native/icons/layout-dashboard';
import Compass from 'lucide-react-native/icons/compass';
import PenTool from 'lucide-react-native/icons/pen-tool';
import ShieldCheck from 'lucide-react-native/icons/shield-check';
import FileCheck from 'lucide-react-native/icons/file-check';
import Award from 'lucide-react-native/icons/award';
import ChevronLeft from 'lucide-react-native/icons/chevron-left';
import ChevronRight from 'lucide-react-native/icons/chevron-right';
import type { Href } from 'expo-router';
import { VIEW_PATHS, type AppView } from '@/hooks/useActiveView';
import { AppText } from '@/components/atoms/AppText';
import { useTheme } from '@/hooks/useTheme';
import { NAV_COPY } from '@/config/copy';
import { SPACING } from '@/config/theme';
import { IconButton } from '@/components/atoms/IconButton';
import { useLayoutMetrics } from '@/hooks/useLayoutMetrics';
import { LAYOUT } from '@/config/layout';

export interface NavigationItem {
  name: AppView;
  label: string;
  href: Href;
  icon: typeof LayoutDashboard;
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
  const { mobile, effectiveWidth } = useLayoutMetrics();
  const pageSize = mobile ? (effectiveWidth < 420 ? 2 : 3) : Math.max(1, items.length);
  return (
    <PagedTabs
      key={`${selectedName}:${pageSize}`}
      items={items}
      selectedName={selectedName}
      onSelect={onSelect}
      mobile={mobile}
      pageSize={pageSize}
    />
  );
}

function PagedTabs({
  items,
  selectedName,
  onSelect,
  mobile,
  pageSize,
}: {
  items: readonly NavigationItem[];
  selectedName?: string;
  onSelect: (item: NavigationItem) => void;
  mobile: boolean;
  pageSize: number;
}) {
  const theme = useTheme();
  const selectedIndex = Math.max(
    0,
    items.findIndex((item) => item.name === selectedName)
  );
  const [page, setPage] = useState(() => Math.floor(selectedIndex / pageSize));
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
  const currentPage = Math.min(page, pageCount - 1);
  const visible = items.slice(currentPage * pageSize, (currentPage + 1) * pageSize);
  return (
    <View
      style={[styles.shell, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}
    >
      {mobile && (
        <IconButton
          label="Previous navigation tabs"
          disabled={currentPage === 0}
          onPress={() => setPage(currentPage - 1)}
          icon={<ChevronLeft size={20} color={theme.textMain} />}
        />
      )}
      <View accessibilityRole="tablist" accessibilityLabel={NAV_COPY.primary} style={styles.list}>
        {visible.map((item) => {
          const selected = item.name === selectedName;
          const Icon = item.icon;
          return (
            <Pressable
              key={item.name}
              accessibilityRole="tab"
              accessibilityLabel={item.label}
              accessibilityState={{ selected, disabled: item.disabled ?? false }}
              aria-selected={selected}
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
              {!mobile && <Icon size={18} color={selected ? theme.primaryText : theme.textMuted} />}
              <AppText
                variant={mobile ? 'caption' : 'label'}
                color={selected ? 'main' : 'muted'}
                style={styles.label}
              >
                {item.label}
              </AppText>
            </Pressable>
          );
        })}
      </View>
      {mobile && (
        <IconButton
          label="Next navigation tabs"
          disabled={currentPage >= pageCount - 1}
          onPress={() => setPage(currentPage + 1)}
          icon={<ChevronRight size={20} color={theme.textMain} />}
        />
      )}
    </View>
  );
}

export function MobileTabNavigation(props: TopTabNavigationProps) {
  return <TopTabNavigation {...props} />;
}

const styles = StyleSheet.create({
  shell: { flexDirection: 'row', alignItems: 'center', flexShrink: 0, borderBottomWidth: 1 },
  list: { flex: 1, minWidth: 0, flexDirection: 'row' },
  label: { textAlign: 'center', flexShrink: 1 },
  item: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    minHeight: LAYOUT.minTouchTarget + SPACING.sm,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 2,
  },
});
