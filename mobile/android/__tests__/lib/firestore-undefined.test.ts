/**
 * Test to verify that createBook properly handles undefined field values.
 * 
 * Firestore rejects undefined values, so createBook filters them out
 * before sending data to Firestore.
 */

import type { CreateBook } from '../../types/models';

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
import { createBook } from '../../lib/firestore';

describe('Firestore undefined field value handling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should succeed even when thumbnailUrl is explicitly undefined (filters it out)', async () => {
    // createBook now filters out undefined values before sending to Firestore
    // This ensures we never get "Unsupported field value: undefined" errors
    
    const bookDataWithUndefined: Omit<CreateBook, 'memberId' | 'addedAt'> = {
      title: 'Test Book',
      author: 'Test Author',
      status: 'to-read',
      thumbnailUrl: undefined,  // This will be filtered out by createBook
    };

    // Should succeed because createBook filters out undefined values
    const bookId = await createBook('family-123', 'member-123', bookDataWithUndefined);
    expect(bookId).toBe('mock-doc-id');
  });

  it('should succeed when thumbnailUrl is not included at all', async () => {
    const bookDataWithoutThumbnail: Omit<CreateBook, 'memberId' | 'addedAt'> = {
      title: 'Test Book',
      author: 'Test Author',
      status: 'to-read',
      // thumbnailUrl is NOT included at all
    };

    const bookId = await createBook('family-123', 'member-123', bookDataWithoutThumbnail);
    expect(bookId).toBe('mock-doc-id');
  });

  it('should succeed when thumbnailUrl has an actual value', async () => {
    const bookDataWithThumbnail: Omit<CreateBook, 'memberId' | 'addedAt'> = {
      title: 'Test Book',
      author: 'Test Author',
      status: 'to-read',
      thumbnailUrl: 'https://example.com/cover.jpg',  // Has a real value
    };

    const bookId = await createBook('family-123', 'member-123', bookDataWithThumbnail);
    expect(bookId).toBe('mock-doc-id');
  });
});

