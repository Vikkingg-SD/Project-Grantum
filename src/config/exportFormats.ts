import type { ExportFormat } from '@/types/api';

export interface ExportFormatConfig {
  id: ExportFormat;
  label: string;
  blurb: string;
}

export const EXPORT_FORMATS: ExportFormatConfig[] = [
  { id: 'word', label: 'Word (.docx)', blurb: 'Funder portal upload' },
  { id: 'notebook', label: 'Notebook (.ipynb)', blurb: 'Internal working draft' },
  { id: 'pdf', label: 'PDF (.pdf)', blurb: 'Signed submission copy' },
  { id: 'markdown', label: 'Markdown (.md)', blurb: 'Version-controlled source' },
];
