import React, { useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenContainer } from '@/components/templates/ScreenContainer';
import { AppText } from '@/components/atoms/AppText';
import { AppInput } from '@/components/atoms/AppInput';
import { AppButton } from '@/components/atoms/AppButton';
import { ToggleSwitch } from '@/components/atoms/ToggleSwitch';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';
import { useTheme } from '@/hooks/useTheme';
import { styles } from './workspacePageStyles';

export default function PersonalSettingsScreen() {
  const router = useRouter();
  const theme = useTheme();
  const nickname = useWorkspaceStore((state) => state.nickname);
  const userId = useWorkspaceStore((state) => state.userId);
  const digestEnabled = useWorkspaceStore((state) => state.digestEnabled);
  const launchTourCompleted = useWorkspaceStore((state) => state.launchTourCompleted);
  const persistenceStatus = useWorkspaceStore((state) => state.persistenceStatus);
  const setPersonalSettings = useWorkspaceStore((state) => state.setPersonalSettings);
  const setLaunchTourEnabled = useWorkspaceStore((state) => state.setLaunchTourEnabled);
  const [name, setName] = useState(nickname);
  const [digest, setDigest] = useState(digestEnabled);
  const [notice, setNotice] = useState('');
  const validName = name.trim().length > 0;
  return (
    <ScreenContainer insetEdges={[]}>
      <View style={styles.pageContent}>
        <AppText variant="h1">Personal settings</AppText>
        <AppText color="muted">Manage your display name and workspace preferences.</AppText>
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <AppText color="muted" selectable>
            User ID: {userId}
          </AppText>
          <AppInput
            label="Display name"
            value={name}
            onChangeText={setName}
            maxLength={80}
            error={!validName ? 'Enter a display name.' : undefined}
          />
          <View style={styles.rowBetween}>
            <AppText>Deadline and sync digest</AppText>
            <ToggleSwitch label="Deadline and sync digest" checked={digest} onChange={setDigest} />
          </View>
          <View style={styles.rowBetween}>
            <AppText>Show onboarding slides at launch</AppText>
            <ToggleSwitch
              label="Show onboarding slides at launch"
              checked={!launchTourCompleted}
              onChange={(next) => {
                setLaunchTourEnabled(next);
              }}
            />
          </View>
          <AppText variant="caption" color="muted">
            Preferences save automatically. Push notification delivery will activate once connected.
          </AppText>
          <AppButton
            label="Save settings"
            variant="primary"
            disabled={!validName}
            onPress={() => {
              setPersonalSettings(name, digest);
              setNotice('Settings updated.');
            }}
          />
          {Boolean(notice) && (
            <AppText accessibilityLiveRegion="polite" color="verified">
              {notice}
            </AppText>
          )}
          <AppText variant="caption" color="muted">
            {persistenceStatus === 'device-saved'
              ? 'Preferences saved.'
              : persistenceStatus === 'saving'
                ? 'Saving preferences…'
                : 'Storage unavailable; preferences apply to the current session.'}
          </AppText>
          <AppButton
            label="Replay onboarding tour"
            variant="outline"
            onPress={() =>
              router.push({
                pathname: '/onboarding',
                params: { replay: '1', returnTo: '/settings' },
              })
            }
          />
          <AppButton
            label="Subscriptions & plans overview"
            variant="outline"
            onPress={() => router.push({ pathname: '/plans', params: { returnTo: '/settings' } })}
          />
        </View>
      </View>
    </ScreenContainer>
  );
}
