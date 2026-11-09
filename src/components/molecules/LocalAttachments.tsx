import React, { useRef, useState } from 'react';
import * as DocumentPicker from 'expo-document-picker';
import { FileReferencePanel } from './FileReferencePanel';
import { useDraftStore, EMPTY_DRAFT } from '@/store/useDraftStore';
import { attachmentError, ATTACHMENT_ACCEPT } from '@/utils/attachments';
import { generateId } from '@/utils/uuid';

const MIME_TYPES: Record<keyof typeof ATTACHMENT_ACCEPT, string[]> = {
  Document: [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'text/markdown',
  ],
  Spreadsheet: ['text/csv', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
  Media: ['image/png', 'image/jpeg', 'image/webp', 'video/mp4'],
};

export function LocalAttachments({ grantId }: { grantId: string }) {
  const [busy, setBusy] = useState(false);
  const picking = useRef(false);
  const [error, setError] = useState('');
  const choose = async (category: keyof typeof ATTACHMENT_ACCEPT) => {
    if (picking.current) return;
    picking.current = true;
    setBusy(true);
    setError('');
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: MIME_TYPES[category],
        multiple: false,
        copyToCacheDirectory: false,
      });
      if (result.canceled) return;
      const asset = result.assets[0];
      if (!asset || asset.size === undefined) {
        setError('The file provider did not report its size. Choose a file from another provider.');
        return;
      }
      const invalid = attachmentError({ name: asset.name, size: asset.size });
      const store = useDraftStore.getState();
      const files = (store.drafts[grantId] ?? EMPTY_DRAFT).attachments;
      if (invalid || files.length >= 5) {
        setError(invalid ?? 'Remove a reference before adding another.');
        return;
      }
      store.setAttachments(grantId, [
        ...files,
        {
          id: generateId('file'),
          name: asset.name,
          size: asset.size,
          type: asset.mimeType ?? '',
        },
      ]);
    } catch {
      setError('Could not open the file chooser. Try again or choose a different file provider.');
    } finally {
      picking.current = false;
      setBusy(false);
    }
  };
  return (
    <FileReferencePanel
      grantId={grantId}
      onChoose={(category) => {
        void choose(category);
      }}
      busy={busy}
      error={error}
    />
  );
}
