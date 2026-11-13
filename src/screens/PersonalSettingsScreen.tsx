import React, { useState } from 'react';
import { View } from 'react-native';
import { ScreenContainer } from '@/components/templates/ScreenContainer';
import { AppText } from '@/components/atoms/AppText';
import { AppInput } from '@/components/atoms/AppInput';
import { AppButton } from '@/components/atoms/AppButton';
import { ToggleSwitch } from '@/components/atoms/ToggleSwitch';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';
import { useTheme } from '@/hooks/useTheme';
import { styles } from './workspacePageStyles';

export default function PersonalSettingsScreen() {
  const theme = useTheme();
  const nickname = useWorkspaceStore((state) => state.nickname);
  const userId = useWorkspaceStore((state) => state.userId);
  const digestEnabled = useWorkspaceStore((state) => state.digestEnabled);
  const persistenceStatus = useWorkspaceStore((state) => state.persistenceStatus);
  const setPersonalSettings = useWorkspaceStore((state) => state.setPersonalSettings);
  const [name, setName] = useState(nickname);
  const [digest, setDigest] = useState(digestEnabled);
  const [notice, setNotice] = useState('');
  const validName = name.trim().length > 0;
  return (
    <ScreenContainer insetEdges={[]}>
      <View style={styles.pageContent}>
        <AppText variant="h1">Personal settings</AppText>
        <AppText color="muted">Manage your display name and notification preferences.</AppText>
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
          <AppText variant="caption" color="muted">
            Your preference is saved locally. Notification delivery is not connected.
          </AppText>
          <AppButton
            label="Save settings"
            variant="primary"
            disabled={!validName}
            onPress={() => {
              setPersonalSettings(name, digest);
              setNotice('Personal settings saved.');
            }}
          />
          {notice ? (
            <AppText accessibilityLiveRegion="polite" color="verified">
              {notice}
            </AppText>
          ) : null}
          <AppText variant="caption" color="muted">
            {persistenceStatus === 'device-saved'
              ? 'Saved on this device.'
              : 'Available for this session only.'}
          </AppText>
        </View>
      </View>
    </ScreenContainer>
  );
}
