import React, { useRef, useState } from 'react';
import * as DocumentPicker from 'expo-document-picker';
import { ProjectDocumentList } from './ProjectDocumentList';
import { attachmentError } from '@/utils/attachments';
import { MAX_PROJECT_DOCS } from '@/utils/workspace';

export interface PickedProjectFile {
  name: string;
  size: number;
  type: string;
}

export interface ProjectDocumentPickerProps {
  docs: readonly string[];
  disabled?: boolean;
  error?: string;
  fileSizes?: Readonly<Record<string, number>>;
  onAddFiles: (files: PickedProjectFile[], pickerIssue?: string) => void;
  onRemoveDoc: (docName: string) => void;
  onPickerError?: (message: string) => void;
}

const NATIVE_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'text/markdown',
  'text/csv',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/png',
  'image/jpeg',
  'image/webp',
  'video/mp4',
];

export function ProjectDocumentPicker({
  docs,
  disabled = false,
  error = '',
  fileSizes,
  onAddFiles,
  onRemoveDoc,
  onPickerError,
}: ProjectDocumentPickerProps) {
  const [busy, setBusy] = useState(false);
  const picking = useRef(false);

  const handleAttach = async () => {
    if (picking.current || disabled || docs.length >= MAX_PROJECT_DOCS) return;
    picking.current = true;
    setBusy(true);
    onPickerError?.('');
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: NATIVE_MIME_TYPES,
        multiple: true,
        copyToCacheDirectory: false,
      });
      if (result.canceled) return;
      const assets = result.assets ?? [];
      const validFiles: PickedProjectFile[] = [];
      let firstIssue = '';
      for (const asset of assets) {
        if (asset.size == null) {
          firstIssue =
            firstIssue ||
            'The file provider did not report file size. Choose a file from another provider.';
          continue;
        }
        const issue = attachmentError({ name: asset.name, size: asset.size });
        if (issue) {
          firstIssue = firstIssue || issue;
          continue;
        }
        validFiles.push({
          name: asset.name,
          size: asset.size,
          type: asset.mimeType ?? '',
        });
      }
      if (validFiles.length > 0) {
        onAddFiles(validFiles, firstIssue || undefined);
      } else if (firstIssue) {
        onPickerError?.(firstIssue);
      }
    } catch {
      onPickerError?.('Could not open the file chooser. Try again or choose another file.');
    } finally {
      picking.current = false;
      setBusy(false);
    }
  };

  return (
    <ProjectDocumentList
      docs={docs}
      disabled={disabled}
      busy={busy}
      error={error}
      fileSizes={fileSizes}
      onPressAttach={() => {
        void handleAttach();
      }}
      onRemoveDoc={onRemoveDoc}
    />
  );
}
