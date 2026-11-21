export type LocalTextFormat = 'txt' | 'md';

export function buildSafeExportFilename(
  projectName: string,
  grantId: string,
  format: LocalTextFormat
): string {
  const slug =
    projectName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'grantum-draft';
  const cleanGrant = grantId.replace(/[^a-z0-9_-]+/gi, '') || 'application';
  return `${slug}-grant-${cleanGrant}.${format}`;
}

export function formatLocalExportContent(input: {
  format: LocalTextFormat;
  projectName: string;
  grantId: string;
  profileRevisionId: string;
  body: string;
}): string {
  const trimmed = input.body.trim();
  if (!trimmed) {
    throw new Error('Enter or load application narrative text before downloading.');
  }
  const project = input.projectName.trim() || 'Grantum Project';
  if (input.format === 'md') {
    return [
      `# ${project} (Grant #${input.grantId})`,
      '',
      `- Pinned Profile Revision: ${input.profileRevisionId}`,
      '- Export Type: Markdown draft export',
      '',
      '---',
      '',
      trimmed,
      '',
    ].join('\n');
  }
  return [
    `${project} (Grant #${input.grantId})`,
    `Pinned Profile Revision: ${input.profileRevisionId}`,
    'Export Type: Plain-text draft export',
    '------------------------------------------------------------',
    '',
    trimmed,
    '',
  ].join('\n');
}

export function triggerWebTextDownload(
  filename: string,
  content: string,
  mimeType: string
): boolean {
  if (
    typeof document === 'undefined' ||
    typeof Blob === 'undefined' ||
    typeof URL === 'undefined' ||
    typeof URL.createObjectURL !== 'function'
  ) {
    return false;
  }
  const blob = new Blob([content], { type: mimeType });
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = filename;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  setTimeout(() => {
    URL.revokeObjectURL(objectUrl);
  }, 100);
  return true;
}
