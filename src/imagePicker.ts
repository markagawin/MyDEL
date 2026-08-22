import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';

/**
 * expo-image-picker ships a web implementation too (opens the browser's native file picker),
 * so this one function works on both web and native — no Platform branching needed for the
 * picking itself. The one gap: on web the returned base64 is the original file's bytes
 * untouched (no `quality`/`allowsEditing` support there), so a full-resolution camera photo
 * would bloat AsyncStorage; resize it down via canvas before returning.
 */
async function resizeDataUriForWeb(dataUri: string, maxSize = 300, quality = 0.7): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(dataUri);
        return;
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => resolve(dataUri);
    img.src = dataUri;
  });
}

/** Opens the photo picker and returns a data URI, or null if canceled/denied. */
export async function pickProfilePhoto(): Promise<string | null> {
  if (Platform.OS !== 'web') {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return null;
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.6,
    base64: true,
  });

  if (result.canceled || !result.assets?.[0]?.base64) return null;

  const asset = result.assets[0];
  const dataUri = `data:${asset.mimeType || 'image/jpeg'};base64,${asset.base64}`;
  return Platform.OS === 'web' ? resizeDataUriForWeb(dataUri) : dataUri;
}
