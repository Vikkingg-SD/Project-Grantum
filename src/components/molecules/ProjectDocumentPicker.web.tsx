import React, { useRef } from 'react';
import { ProjectDocumentList } from './ProjectDocumentList';
import type { PickedProjectFile, ProjectDocumentPickerProps } from './ProjectDocumentPicker';
import { ATTACHMENT_ACCEPT, attachmentError } from '@/utils/attachments';
import { MAX_PROJECT_DOCS } from '@/utils/workspace';

const COMBINED_ACCEPT = Object.values(ATTACHMENT_ACCEPT).join(',');

export function ProjectDocumentPicker({
  docs,
  disabled = false,
  error = '',
  fileSizes,
  onAddFiles,
  onRemoveDoc,
  onPickerError,
}: ProjectDocumentPickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const inputDisabled = disabled || docs.length >= MAX_PROJECT_DOCS;

  return (
    <>
      <ProjectDocumentList
        docs={docs}
        disabled={disabled}
        error={error}
        fileSizes={fileSizes}
        onPressAttach={() => {
          if (inputDisabled) return;
          onPickerError?.('');
          inputRef.current?.click();
        }}
        onRemoveDoc={onRemoveDoc}
      />
      <input
        ref={inputRef}
        data-testid="project-profile-file-input"
        type="file"
        multiple
        disabled={inputDisabled}
        accept={COMBINED_ACCEPT}
        aria-label="Attach reference files"
        style={{ display: 'none' }}
        onChange={(event) => {
          if (inputDisabled) {
            event.target.value = '';
            return;
          }
          const picked = Array.from(event.target.files ?? []);
          event.target.value = '';
          if (picked.length === 0) return;
          const validFiles: PickedProjectFile[] = [];
          let firstIssue = '';
          for (const file of picked) {
            const issue = attachmentError(file);
            if (issue) {
              firstIssue = firstIssue || issue;
              continue;
            }
            validFiles.push({ name: file.name, type: file.type, size: file.size });
          }
          if (validFiles.length > 0) {
            onAddFiles(validFiles, firstIssue || undefined);
          } else if (firstIssue) {
            onPickerError?.(firstIssue);
          }
        }}
      />
    </>
  );
}
