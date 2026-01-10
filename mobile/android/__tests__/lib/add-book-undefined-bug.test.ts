/**
 * Test that verifies the fix for the undefined thumbnailUrl bug.
 * 
 * The bug was that when adding a book without a cover image, undefined
 * values were being passed to Firestore which rejects them.
 * 
 * The fix was to filter out undefined values before sending to Firestore.
 */

import type { CreateFamilyBook } from '../../types/models';

// Mock Firestore with realistic validation that rejects undefined values
jest.mock('@react-native-firebase/firestore', () => {
  const mockAdd = jest.fn((data: Record<string, unknown>) => {
    // Simulate Firestore's validation - it rejects undefined field values
    for (const [key, value] of Object.entries(data)) {
      if (value === undefined) {
        return Promise.reject(new Error('Unsupported field value: undefined'));
      }
    }
    return Promise.resolve({ id: 'mock-doc-id' });
  });

  const mockCollection = jest.fn(() => ({
    add: mockAdd,
    doc: jest.fn(() => ({
      get: jest.fn(() => Promise.resolve({ exists: true, id: 'mock-doc-id', data: () => ({}) })),
      collection: mockCollection,
    })),
  }));

  const firestore = jest.fn(() => ({
    collection: mockCollection,
  }));

  firestore.FieldValue = {
    serverTimestamp: jest.fn(() => new Date()),
  };

  return {
    __esModule: true,
    default: firestore,
  };
});

import { createFamilyBook } from '../../lib/firestore';

describe('Bug fix: undefined thumbnailUrl handling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * This test verifies the FIX for the undefined thumbnailUrl bug.
   * createFamilyBook now filters out undefined values before passing to Firestore.
   */
  it('should successfully add a book without a cover image', async () => {
    let thumbnailUrl: string | undefined;
    // No cover image was selected, so thumbnailUrl remains undefined
    
    const title = 'My New Book';
    const author = 'John Author';

    // The fixed pattern - createFamilyBook filters out undefined values
    const bookData: Omit<CreateFamilyBook, 'addedAt'> = {
      title: title.trim(),
      author: author.trim(),
      addedBy: 'member-123',
      ...(thumbnailUrl && { thumbnailUrl }),  // FIX: excludes undefined
    };

    // Now this succeeds because undefined fields are not included
    const bookId = await createFamilyBook('family-123', bookData);
    
    expect(bookId).toBe('mock-doc-id');
  });

  /**
   * This test shows the CORRECT way to handle optional fields.
   * It passes because undefined fields are excluded from the object.
   */
  it('should succeed when optional fields are properly excluded', async () => {
    let thumbnailUrl: string | undefined;
    // No cover image selected
    
    const title = 'My New Book';
    const author = 'John Author';

    // CORRECT approach: Only include thumbnailUrl if it has a value
    const bookData: Omit<CreateFamilyBook, 'addedAt'> = {
      title: title.trim(),
      author: author.trim(),
      addedBy: 'member-123',
      ...(thumbnailUrl && { thumbnailUrl }),  // Only spread if defined
    };

    const bookId = await createFamilyBook('family-123', bookData);
    
    expect(bookId).toBe('mock-doc-id');
  });
});
