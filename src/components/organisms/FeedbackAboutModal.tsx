import React, { useRef, useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import { ModalSheetLayout } from '@/components/templates/ModalSheetLayout';
import { AppText } from '@/components/atoms/AppText';
import { AppButton } from '@/components/atoms/AppButton';
import { useTheme } from '@/hooks/useTheme';
import { SPACING } from '@/config/theme';
import { GRANTUM_FEEDBACK_EMAIL, GRANTUM_FEEDBACK_MAILTO } from '@/utils/productRoadmap';

export interface FeedbackAboutModalProps {
  visible: boolean;
  onClose: () => void;
}

export function FeedbackAboutModal({ visible, onClose }: FeedbackAboutModalProps) {
  const theme = useTheme();
  const [opening, setOpening] = useState(false);
  const [notice, setNotice] = useState('');
  const openToken = useRef(0);

  const handleClose = () => {
    openToken.current += 1;
    setOpening(false);
    setNotice('');
    onClose();
  };

  return (
    <ModalSheetLayout
      visible={visible}
      onClose={handleClose}
      accessibilityLabel="Feedback and About Grantum"
      title="About Grantum"
    >
      <View style={styles.body}>
        <AppText>
          Grantum helps founders, researchers, and organizations structure grant applications,
          organize project profiles, and track review readiness in one workspace.
        </AppText>
        <View style={[styles.section, { borderTopColor: theme.border }]}>
          <AppText variant="h3">Share feedback</AppText>
          <AppText color="muted">
            Tell us what slows your applications down, report a UI issue, or suggest a funding
            source.
          </AppText>
          <AppText selectable>{GRANTUM_FEEDBACK_EMAIL}</AppText>
          <View style={styles.actions}>
            <AppButton
              label="Email feedback"
              variant="primary"
              isLoading={opening}
              onPress={async () => {
                const token = ++openToken.current;
                setOpening(true);
                setNotice('');
                try {
                  await Linking.openURL(GRANTUM_FEEDBACK_MAILTO);
                  if (openToken.current === token) {
                    setNotice(
                      'Finish sending in your email app. If it did not open, copy the address above.'
                    );
                  }
                } catch {
                  if (openToken.current === token) {
                    setNotice(
                      'Could not open an email app. Copy the address above into your preferred email service.'
                    );
                  }
                } finally {
                  if (openToken.current === token) setOpening(false);
                }
              }}
            />
            <AppButton label="Done" variant="ghost" onPress={handleClose} />
          </View>
          {Boolean(notice) && <AppText accessibilityLiveRegion="polite">{notice}</AppText>}
        </View>
      </View>
    </ModalSheetLayout>
  );
}

const styles = StyleSheet.create({
  body: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.lg,
    paddingTop: SPACING.sm,
    gap: SPACING.md,
  },
  section: { borderTopWidth: 1, paddingTop: SPACING.md, gap: SPACING.sm },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginTop: SPACING.xs },
});
