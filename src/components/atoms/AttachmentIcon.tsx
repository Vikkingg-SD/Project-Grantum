import React from 'react';
import FileText from 'lucide-react-native/icons/file-text';
import FileSpreadsheet from 'lucide-react-native/icons/file-spreadsheet';
import Images from 'lucide-react-native/icons/images';

export function AttachmentIcon({
  name,
  type,
  size = 15,
  color,
}: {
  name: string;
  type: string;
  size?: number;
  color: string;
}) {
  if (
    type.startsWith('image/') ||
    type.startsWith('video/') ||
    /\.(png|jpe?g|webp|mp4)$/i.test(name)
  ) {
    return <Images size={size} color={color} />;
  }
  if (type.includes('csv') || type.includes('sheet') || /\.(csv|xlsx)$/i.test(name)) {
    return <FileSpreadsheet size={size} color={color} />;
  }
  return <FileText size={size} color={color} />;
}
