import React from 'react';
import { Tabs } from 'expo-router';
import {
  LayoutDashboard,
  Compass,
  PenTool,
  ShieldCheck,
  FileCheck,
  Award,
} from 'lucide-react-native';
import { useThemeStore } from '@/store/useThemeStore';
import { PALETTE } from '@/config/theme';

export default function TabsLayout() {
  const { mode } = useThemeStore();
  const theme = PALETTE[mode];

  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: theme.background,
          borderBottomColor: theme.border,
          borderBottomWidth: 1,
        },
        headerTitleStyle: {
          color: theme.textMain,
          fontFamily: 'Inter',
          fontSize: 18,
          fontWeight: '700',
        },
        tabBarStyle: {
          backgroundColor: theme.surface,
          borderTopColor: theme.border,
          borderTopWidth: 1,
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.textMuted,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, size }) => <LayoutDashboard color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="discovery"
        options={{
          title: 'Discovery',
          tabBarIcon: ({ color, size }) => <Compass color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="drafting"
        options={{
          title: 'Drafting',
          tabBarIcon: ({ color, size }) => <PenTool color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="audit"
        options={{
          title: 'Audit',
          tabBarIcon: ({ color, size }) => <ShieldCheck color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="export"
        options={{
          title: 'Export',
          tabBarIcon: ({ color, size }) => <FileCheck color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="post-award"
        options={{
          title: 'Post-Award',
          tabBarIcon: ({ color, size }) => <Award color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
