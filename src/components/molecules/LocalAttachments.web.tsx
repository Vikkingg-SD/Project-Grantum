import React, { useRef, useState } from 'react';
import { FileReferencePanel } from './FileReferencePanel';
import { useDraftStore, EMPTY_DRAFT } from '@/store/useDraftStore';
import { ATTACHMENT_ACCEPT, attachmentError } from '@/utils/attachments';
import { generateId } from '@/utils/uuid';

export function LocalAttachments({ grantId }: { grantId: string }) {
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState('');
  return (
    <>
      <FileReferencePanel
        grantId={grantId}
        error={error}
        onChoose={(category) => {
          setError('');
          if (input.current) {
            input.current.accept = ATTACHMENT_ACCEPT[category];
            input.current.click();
          }
        }}
      />
      <input
        ref={input}
        type="file"
        aria-label="Choose local file reference"
        style={{ display: 'none' }}
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = '';
          if (!file) return;
          const invalid = attachmentError(file);
          const store = useDraftStore.getState();
          const files = (store.drafts[grantId] ?? EMPTY_DRAFT).attachments;
          if (invalid || files.length >= 5) {
            setError(invalid ?? 'Remove a reference before adding another.');
            return;
          }
          store.setAttachments(grantId, [
            ...files,
            { id: generateId('file'), name: file.name, type: file.type, size: file.size },
          ]);
          setError('');
        }}
      />
    </>
  );
}
