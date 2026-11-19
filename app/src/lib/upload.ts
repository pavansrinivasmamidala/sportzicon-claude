import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';

import { readBytes } from './read-bytes';
import { supabase } from './supabase';

export interface PickedFile {
  uri: string;
  name: string;
  mimeType: string;
  kind: 'image' | 'video' | 'document';
}

export async function pickMedia(kind: 'image' | 'video' | 'any' = 'any'): Promise<PickedFile | null> {
  const res = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: kind === 'image' ? ['images'] : kind === 'video' ? ['videos'] : ['images', 'videos'],
    quality: 0.8,
    allowsEditing: kind === 'image',
    videoMaxDuration: 120,
  });
  if (res.canceled || !res.assets?.[0]) return null;
  const a = res.assets[0];
  const isVideo = a.type === 'video';
  return {
    uri: a.uri,
    name: a.fileName ?? (isVideo ? 'reel.mp4' : 'photo.jpg'),
    mimeType: a.mimeType ?? (isVideo ? 'video/mp4' : 'image/jpeg'),
    kind: isVideo ? 'video' : 'image',
  };
}

export async function pickDocument(): Promise<PickedFile | null> {
  const res = await DocumentPicker.getDocumentAsync({
    type: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    copyToCacheDirectory: true,
  });
  if (res.canceled || !res.assets?.[0]) return null;
  const a = res.assets[0];
  return { uri: a.uri, name: a.name, mimeType: a.mimeType ?? 'application/pdf', kind: 'document' };
}

/** Uploads to `<bucket>/<userId>/<timestamp>-<name>` and returns the storage path. */
export async function uploadFile(bucket: 'avatars' | 'media' | 'documents', userId: string, file: PickedFile) {
  const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-60);
  const path = `${userId}/${Date.now()}-${safe}`;
  const body = await readBytes(file.uri);
  if (!body.byteLength) throw new Error('Could not read the selected file. Please try again.');
  const { error } = await supabase.storage.from(bucket).upload(path, body, { contentType: file.mimeType, upsert: false });
  if (error) throw new Error(error.message);
  return path;
}

export function publicUrl(bucket: 'avatars' | 'media', path: string) {
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}
