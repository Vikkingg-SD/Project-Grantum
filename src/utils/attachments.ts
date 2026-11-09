export interface LocalAttachment {
  id: string;
  name: string;
  type: string;
  size: number;
}
export const ATTACHMENT_LIMIT = 10 * 1024 * 1024;
export const ATTACHMENT_ACCEPT = {
  Document: '.pdf,.docx,.txt,.md',
  Spreadsheet: '.csv,.xlsx',
  Media: '.png,.jpg,.jpeg,.webp,.mp4',
} as const;
export function attachmentError(file: Pick<LocalAttachment, 'name' | 'size'>): string | null {
  if (!/\.(pdf|docx|txt|md|csv|xlsx|png|jpe?g|webp|mp4)$/i.test(file.name))
    return 'Choose a supported document, spreadsheet, image, or MP4 file.';
  if (!Number.isFinite(file.size) || file.size <= 0)
    return 'This file is empty or its size is unknown. Choose a file with a known size.';
  if (file.size > ATTACHMENT_LIMIT) return 'Choose a file smaller than 10 MB.';
  return null;
}
