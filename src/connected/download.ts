import { File, Paths } from 'expo-file-system';
import { isAvailableAsync, shareAsync } from 'expo-sharing';

export async function downloadFile(name: string, mime: string, base64: string) {
  if (!(await isAvailableAsync())) throw new Error('File sharing is unavailable on this device.');
  const file = new File(Paths.cache, name);
  file.create({ overwrite: true });
  try {
    file.write(Uint8Array.from(atob(base64), (character) => character.charCodeAt(0)));
    await shareAsync(file.uri, { mimeType: mime, dialogTitle: 'Save Grantum document' });
  } finally {
    file.delete();
  }
}
