import { File } from 'expo-file-system';

/**
 * Reads a picked file (file:// or content://) into memory for upload.
 * On Android/iOS, fetch(uri).arrayBuffer() does not return the file contents, so use expo-file-system.
 */
export async function readBytes(uri: string): Promise<ArrayBuffer> {
  return new File(uri).arrayBuffer();
}
