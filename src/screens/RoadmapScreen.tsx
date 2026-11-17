import React, { useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { workspaceReturnPath } from '@/utils/workspaceReturn';
import { ScreenContainer } from '@/components/templates/ScreenContainer';
import { AppText } from '@/components/atoms/AppText';
import { AppButton } from '@/components/atoms/AppButton';
import { useTheme } from '@/hooks/useTheme';
import { SPACING } from '@/config/theme';

const milestones = [
  {
    status: 'Available in the sample',
    title: 'Your application workspace',
    body: 'Explore sample opportunities, maintain project profiles, write and restore proposal sections, and organize application handoffs. Work can be saved on this device when local storage is available.',
  },
  {
    status: 'Next',
    title: 'Find the right opportunity and prepare with confidence',
    body: 'More discovery filters, eligibility questions before drafting, reusable proposal sections, application deadlines and simple document exports.',
  },
  {
    status: 'Later',
    title: 'Connected services and shared work',
    body: 'Verified live sources, bounded AI assistance, team collaboration and notifications. Editor integrations, organizer listings and learning resources follow product validation.',
  },
];

export default function RoadmapScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { returnTo } = useLocalSearchParams<{ returnTo?: string | string[] }>();
  const returnPath = workspaceReturnPath(returnTo);
  const [notice, setNotice] = useState('');
  const [opening, setOpening] = useState(false);
  return (
    <ScreenContainer>
      <View style={styles.page}>
        <AppText variant="h1">Building Grantum together</AppText>
        <AppText>See what you can use today and what we want to improve next.</AppText>
        {milestones.map((milestone) => (
          <View key={milestone.title} style={[styles.milestone, { borderTopColor: theme.border }]}>
            <AppText variant="caption" color="primary">
              {milestone.status}
            </AppText>
            <AppText variant="h2">{milestone.title}</AppText>
            <AppText>{milestone.body}</AppText>
          </View>
        ))}
        <AppText color="muted">
          Delivery dates and funding targets are not set yet. Priorities may change as we learn from
          applicants.
        </AppText>
        <View style={[styles.milestone, { borderTopColor: theme.border }]}>
          <AppText variant="h2">Help shape the next step</AppText>
          <AppText>
            Tell us what slows your application down, suggest a source, or discuss supporting
            Grantum. No subscription needed.
          </AppText>
          <AppText selectable>suggestions_grantum@gmail.com</AppText>
          <AppButton
            label="Email your suggestion"
            isLoading={opening}
            onPress={async () => {
              setOpening(true);
              setNotice('');
              try {
                await Linking.openURL(
                  'mailto:suggestions_grantum@gmail.com?subject=Grantum%20suggestion'
                );
                setNotice(
                  'Finish sending in your email app. If it did not open, copy the address above.'
                );
              } catch {
                setNotice(
                  'Could not open an email app. Copy the address above into your preferred email service.'
                );
              } finally {
                setOpening(false);
              }
            }}
          />
          {notice ? <AppText accessibilityLiveRegion="polite">{notice}</AppText> : null}
        </View>
        <AppButton
          label="View proposed subscriptions & pricing"
          variant="outline"
          onPress={() =>
            router.push({ pathname: '/plans', params: { returnTo: String(returnPath) } })
          }
        />
        <AppButton
          label="Explore the sample workspace"
          variant="primary"
          onPress={() => router.push('/dashboard')}
        />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  page: { gap: SPACING.xl, width: '100%', maxWidth: 800, alignSelf: 'center' },
  milestone: { borderTopWidth: 1, paddingTop: SPACING.xl, gap: SPACING.md },
});
