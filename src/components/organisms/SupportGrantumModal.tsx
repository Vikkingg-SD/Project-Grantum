import React, { useRef, useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import { ModalSheetLayout } from '@/components/templates/ModalSheetLayout';
import { AppText } from '@/components/atoms/AppText';
import { AppButton } from '@/components/atoms/AppButton';
import { SPACING } from '@/config/theme';
import { GRANTUM_FEEDBACK_EMAIL, GRANTUM_FEEDBACK_MAILTO } from '@/utils/productRoadmap';

export interface SupportGrantumModalProps {
  visible: boolean;
  onClose: () => void;
  onRemindLater: () => void;
}

export function SupportGrantumModal({ visible, onClose, onRemindLater }: SupportGrantumModalProps) {
  const [opening, setOpening] = useState(false);
  const [notice, setNotice] = useState('');
  const openToken = useRef(0);

  const resetAndClose = (callback: () => void) => {
    openToken.current += 1;
    setOpening(false);
    setNotice('');
    callback();
  };

  return (
    <ModalSheetLayout
      visible={visible}
      onClose={() => resetAndClose(onClose)}
      accessibilityLabel="Support Grantum"
      title="Support Grantum"
    >
      <View style={styles.body}>
        <AppText>
          Grantum is currently in active beta. Share feedback, suggest new funding opportunities, or
          reach out directly to help shape upcoming releases. No paid plan is required to explore
          the workspace.
        </AppText>
        <AppText selectable>{GRANTUM_FEEDBACK_EMAIL}</AppText>
        <View style={styles.actions}>
          <AppButton
            label="Remind me in 3 days"
            variant="primary"
            onPress={() => resetAndClose(onRemindLater)}
          />
          <AppButton
            label="Email us"
            variant="outline"
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
          <AppButton label="Not now" variant="ghost" onPress={() => resetAndClose(onClose)} />
        </View>
        {Boolean(notice) && <AppText accessibilityLiveRegion="polite">{notice}</AppText>}
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
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginTop: SPACING.xs },
});
