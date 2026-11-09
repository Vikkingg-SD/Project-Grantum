import React from 'react';
import { AppText } from '../atoms/AppText';

export function LocalAttachments({ grantId: _grantId }: { grantId: string }) {
  return (
    <AppText variant="caption" color="muted">
      Open the web version to keep file references with your notes. Uploads are not connected.
    </AppText>
  );
}
