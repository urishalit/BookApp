/**
 * Tests for book-cover-service.ts
 *
 * Verifies suggestBookMetadataFromImage calls Firebase callable with correct
 * payload and returns parsed suggestions.
 */

import * as FileSystem from 'expo-file-system';
import functions from '@react-native-firebase/functions';
import {
  suggestBookMetadataFromImage,
  type BookMetadataSuggestions,
} from '@/lib/book-cover-service';

jest.mock('expo-file-system');
jest.mock('@react-native-firebase/functions');

const mockReadAsStringAsync = FileSystem.readAsStringAsync as jest.MockedFunction<
  typeof FileSystem.readAsStringAsync
>;

describe('book-cover-service', () => {
  const mockCallable = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockReadAsStringAsync.mockResolvedValue('fakeBase64ImageData');
    (functions as jest.Mock)().httpsCallable.mockReturnValue(mockCallable);
  });

  it('should read file as base64 and call Firebase with correct payload', async () => {
    const suggestions: BookMetadataSuggestions = {
      title: 'The Hobbit',
      author: 'J.R.R. Tolkien',
      series_name: null,
      book_number_in_series: null,
    };
    mockCallable.mockResolvedValue({ data: suggestions });

    const result = await suggestBookMetadataFromImage('file:///path/to/cover.jpg');

    expect(mockReadAsStringAsync).toHaveBeenCalledWith(
      'file:///path/to/cover.jpg',
      expect.objectContaining({ encoding: 'base64' })
    );
    expect(mockCallable).toHaveBeenCalledWith({
      imageBase64: 'fakeBase64ImageData',
      mimeType: 'image/jpeg',
    });
    expect(result).toEqual(suggestions);
  });

  it('should use image/png mimeType for .png URIs', async () => {
    mockCallable.mockResolvedValue({
      data: { title: 'X', author: 'Y', series_name: null, book_number_in_series: null },
    });

    await suggestBookMetadataFromImage('file:///photo.png');

    expect(mockCallable).toHaveBeenCalledWith(
      expect.objectContaining({ mimeType: 'image/png' })
    );
  });

  it('should use image/webp mimeType for .webp URIs', async () => {
    mockCallable.mockResolvedValue({
      data: { title: 'X', author: 'Y', series_name: null, book_number_in_series: null },
    });

    await suggestBookMetadataFromImage('file:///photo.webp');

    expect(mockCallable).toHaveBeenCalledWith(
      expect.objectContaining({ mimeType: 'image/webp' })
    );
  });

  it('should propagate errors from the callable', async () => {
    mockCallable.mockRejectedValue(new Error('API error'));

    await expect(suggestBookMetadataFromImage('file:///cover.jpg')).rejects.toThrow(
      'API error'
    );
  });
});
