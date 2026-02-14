import * as FileSystem from 'expo-file-system';
import functions from '@react-native-firebase/functions';

export interface BookMetadataSuggestions {
  title: string;
  author: string;
  series_name: string | null;
  book_number_in_series: number | null;
}

function getMimeTypeFromUri(uri: string): string {
  const lower = uri.toLowerCase();
  if (lower.includes('.png')) return 'image/png';
  if (lower.includes('.webp')) return 'image/webp';
  return 'image/jpeg';
}

/**
 * Suggests book metadata (title, author, series) from a cover image using Vertex AI.
 * @param uri Local file URI (e.g. from ImagePicker)
 * @returns Suggested metadata, or throws on error
 */
export async function suggestBookMetadataFromImage(
  uri: string
): Promise<BookMetadataSuggestions> {
  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  const mimeType = getMimeTypeFromUri(uri);
  const callable = functions().httpsCallable<
    { imageBase64: string; mimeType: string },
    BookMetadataSuggestions
  >('suggestBookMetadata');

  const { data } = await callable({ imageBase64: base64, mimeType });
  return data;
}
