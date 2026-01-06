import storage from '@react-native-firebase/storage';

/**
 * Upload an image to Firebase Storage
 * @param uri Local file URI (from image picker)
 * @param path Storage path (e.g., 'avatars/user123.jpg')
 * @returns Download URL of the uploaded image
 */
export async function uploadImage(uri: string, path: string): Promise<string> {
  const reference = storage().ref(path);
  
  // Upload the file
  await reference.putFile(uri);
  
  // Get the download URL
  const downloadUrl = await reference.getDownloadURL();
  return downloadUrl;
}

/**
 * Upload a member avatar
 * @param uri Local file URI
 * @param familyId Family ID
 * @param memberId Member ID
 * @returns Download URL
 */
export async function uploadMemberAvatar(
  uri: string,
  familyId: string,
  memberId: string
): Promise<string> {
  const timestamp = Date.now();
  const path = `families/${familyId}/members/${memberId}/avatar_${timestamp}.jpg`;
  return uploadImage(uri, path);
}

/**
 * Upload a book cover
 * @param uri Local file URI
 * @param familyId Family ID
 * @param memberId Member ID
 * @param bookId Optional Book ID (if not provided, uses timestamp as identifier)
 * @returns Download URL
 */
export async function uploadBookCover(
  uri: string,
  familyId: string,
  memberId: string,
  bookId?: string
): Promise<string> {
  const timestamp = Date.now();
  const identifier = bookId || `new_${timestamp}`;
  const path = `families/${familyId}/members/${memberId}/books/${identifier}/cover_${timestamp}.jpg`;
  return uploadImage(uri, path);
}

/**
 * Delete a file from Firebase Storage
 * @param path Storage path or full URL
 */
export async function deleteFile(path: string): Promise<void> {
  try {
    // Handle both full URLs and paths
    let reference;
    if (path.startsWith('https://') || path.startsWith('gs://')) {
      reference = storage().refFromURL(path);
    } else {
      reference = storage().ref(path);
    }
    await reference.delete();
  } catch (error: unknown) {
    // Ignore errors if file doesn't exist
    const errorCode = (error as { code?: string })?.code;
    if (errorCode !== 'storage/object-not-found') {
      throw error;
    }
  }
}
