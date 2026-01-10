/**
 * Test to verify that createFamilyBook properly handles undefined field values.
 * 
 * Firestore rejects undefined values, so createFamilyBook filters them out
 * before sending data to Firestore.
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
      set: jest.fn(() => Promise.resolve()),
      update: jest.fn(() => Promise.resolve()),
      delete: jest.fn(() => Promise.resolve()),
      collection: mockCollection,
    })),
    get: jest.fn(() => Promise.resolve({ docs: [], empty: true })),
    where: jest.fn(() => ({
      get: jest.fn(() => Promise.resolve({ docs: [], empty: true })),
      limit: jest.fn(() => ({
        get: jest.fn(() => Promise.resolve({ docs: [], empty: true })),
      })),
      orderBy: jest.fn(() => ({
        get: jest.fn(() => Promise.resolve({ docs: [], empty: true })),
      })),
    })),
    orderBy: jest.fn(() => ({
      get: jest.fn(() => Promise.resolve({ docs: [], empty: true })),
      onSnapshot: jest.fn(() => jest.fn()),
    })),
    onSnapshot: jest.fn(() => jest.fn()),
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

// Import after mocking
import { createFamilyBook } from '../../lib/firestore';

describe('Firestore undefined field value handling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should succeed even when thumbnailUrl is explicitly undefined (filters it out)', async () => {
    // createFamilyBook now filters out undefined values before sending to Firestore
    // This ensures we never get "Unsupported field value: undefined" errors
    
    const bookDataWithUndefined: Omit<CreateFamilyBook, 'addedAt'> = {
      title: 'Test Book',
      author: 'Test Author',
      addedBy: 'member-123',
      thumbnailUrl: undefined,  // This will be filtered out by createFamilyBook
    };

    // Should succeed because createFamilyBook filters out undefined values
    const bookId = await createFamilyBook('family-123', bookDataWithUndefined);
    expect(bookId).toBe('mock-doc-id');
  });

  it('should succeed when thumbnailUrl is not included at all', async () => {
    const bookDataWithoutThumbnail: Omit<CreateFamilyBook, 'addedAt'> = {
      title: 'Test Book',
      author: 'Test Author',
      addedBy: 'member-123',
      // thumbnailUrl is NOT included at all
    };

    const bookId = await createFamilyBook('family-123', bookDataWithoutThumbnail);
    expect(bookId).toBe('mock-doc-id');
  });

  it('should succeed when thumbnailUrl has an actual value', async () => {
    const bookDataWithThumbnail: Omit<CreateFamilyBook, 'addedAt'> = {
      title: 'Test Book',
      author: 'Test Author',
      addedBy: 'member-123',
      thumbnailUrl: 'https://example.com/cover.jpg',  // Has a real value
    };

    const bookId = await createFamilyBook('family-123', bookDataWithThumbnail);
    expect(bookId).toBe('mock-doc-id');
  });
});

describe('updateFamilyBook undefined field value handling', () => {
  let mockFieldValueDelete: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Access the mocked firestore and add FieldValue.delete mock
    const firestore = require('@react-native-firebase/firestore').default;
    mockFieldValueDelete = jest.fn(() => ({ _fieldValueDelete: true }));
    firestore.FieldValue.delete = mockFieldValueDelete;
  });

  it('should convert undefined genres to FieldValue.delete()', async () => {
    const { updateFamilyBook } = require('../../lib/firestore');
    
    // This should NOT throw because undefined gets converted to FieldValue.delete()
    await expect(
      updateFamilyBook('family-123', 'book-123', { genres: undefined })
    ).resolves.not.toThrow();
    
    // Verify FieldValue.delete() was called
    expect(mockFieldValueDelete).toHaveBeenCalled();
  });

  it('should not call FieldValue.delete() for defined values', async () => {
    const { updateFamilyBook } = require('../../lib/firestore');
    
    await updateFamilyBook('family-123', 'book-123', { 
      genres: ['fantasy', 'adventure'] 
    });
    
    // FieldValue.delete() should NOT be called for defined values
    expect(mockFieldValueDelete).not.toHaveBeenCalled();
  });
});
