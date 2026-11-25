import React, { useState } from 'react';
import { Modal, Platform, Pressable, View, StyleSheet, useWindowDimensions } from 'react-native';
import { useGlobalSearchParams, usePathname, useRouter, useUnstableGlobalHref } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '@/components/atoms/AppText';
import { AppButton } from '@/components/atoms/AppButton';
import { useTheme } from '@/hooks/useTheme';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';
import { ENV } from '@/config/env';
import { LAYOUT } from '@/config/layout';
import { RADIUS, SPACING } from '@/config/theme';
import { normalizePathname, workspaceDestination } from '@/utils/navigationHistory';
import { workspaceReturnHref } from '@/utils/workspaceReturn';

export function AccountMenu() {
  const [open, setOpen] = useState(false);
  const nickname = useWorkspaceStore((state) => state.nickname);
  const theme = useTheme();
  const router = useRouter();
  const pathname = normalizePathname(usePathname());
  const href = useUnstableGlobalHref();
  const { returnTo } = useGlobalSearchParams<{ returnTo?: string | string[] }>();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const navigate = (
    path: '/settings' | '/project-profile' | '/admin' | '/plans' | '/affiliate-campaign'
  ) => {
    setOpen(false);
    if (pathname === path) return;
    if (path === '/plans' || path === '/affiliate-campaign') {
      const originTarget =
        pathname === '/plans' || pathname === '/affiliate-campaign'
          ? returnTo
          : workspaceDestination(href);
      router.push(workspaceReturnHref(path, originTarget));
      return;
    }
    router.push(path);
  };
  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Account menu"
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen(true)}
        style={({ pressed }) => [
          styles.avatar,
          { backgroundColor: theme.surface, borderColor: theme.border, opacity: pressed ? 0.7 : 1 },
        ]}
      >
        <AppText variant="label">
          {nickname
            .trim()
            .split(/\s+/)
            .map((part) => part[0])
            .join('')
            .slice(0, 2)
            .toUpperCase()}
        </AppText>
      </Pressable>
      <Modal
        visible={open}
        transparent
        animationType="none"
        onRequestClose={() => setOpen(false)}
        accessibilityLabel="Account menu"
      >
        <View
          style={[
            styles.overlay,
            {
              paddingTop: insets.top + 64,
              paddingRight: Math.max(0, (width - LAYOUT.contentMaxWidth) / 2) + SPACING.lg,
            },
          ]}
        >
          {Platform.OS === 'web' ? (
            <View
              accessible={false}
              style={StyleSheet.absoluteFill}
              onStartShouldSetResponder={() => true}
              onResponderRelease={() => setOpen(false)}
            />
          ) : (
            <Pressable
              style={StyleSheet.absoluteFill}
              accessible={false}
              focusable={false}
              onPress={() => setOpen(false)}
            />
          )}
          <View
            style={[styles.menu, { backgroundColor: theme.surface, borderColor: theme.border }]}
          >
            <AppText variant="label">{nickname}</AppText>
            <AppButton
              label="Personal settings"
              variant="ghost"
              onPress={() => navigate('/settings')}
            />
            <AppButton
              label="Subscriptions & plans"
              variant="ghost"
              onPress={() => navigate('/plans')}
            />
            <AppButton
              label="Affiliate campaign"
              variant="ghost"
              onPress={() => navigate('/affiliate-campaign')}
            />
            <AppButton
              label="Project team"
              variant="ghost"
              onPress={() => navigate('/project-profile')}
            />
            {ENV.DATA_SOURCE === 'mock' && (
              <AppButton
                label="Staff administration"
                variant="ghost"
                onPress={() => navigate('/admin')}
              />
            )}
            <AppButton label="Close menu" variant="ghost" onPress={() => setOpen(false)} />
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlay: { flex: 1, alignItems: 'flex-end' },
  menu: {
    width: 280,
    maxWidth: '90%',
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    gap: SPACING.sm,
  },
});
