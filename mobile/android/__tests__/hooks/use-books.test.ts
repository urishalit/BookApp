import { renderHook, act } from '@testing-library/react-native';
import { useFamilyStore } from '../../stores/family-store';
import type { Book, Family } from '../../types/models';

// Must mock before importing the hook
jest.mock('../../lib/firestore', () => ({
  onBooksSnapshot: jest.fn((familyId, memberId, callback) => {
    // Return unsubscribe function
    return jest.fn();
  }),
  createBook: jest.fn(() => Promise.resolve('new-book-id')),
  updateBook: jest.fn(() => Promise.resolve()),
  deleteBook: jest.fn(() => Promise.resolve()),
  getBook: jest.fn(() => Promise.resolve(null)),
}));

import { useBooks, useBookOperations, useBooksListener } from '../../hooks/use-books';
import * as firestoreModule from '../../lib/firestore';

describe('useBooks Hook', () => {
  const mockFamily: Family = {
    id: 'family-123',
    name: 'Test Family',
    ownerId: 'user-123',
    createdAt: { seconds: 0, nanoseconds: 0 } as any,
  };

  const mockBooks: Book[] = [
    {
      id: 'book-1',
      memberId: 'member-123',
      title: 'Book One',
      author: 'Author One',
      status: 'reading',
      addedAt: { seconds: 1, nanoseconds: 0 } as any,
    },
    {
      id: 'book-2',
      memberId: 'member-123',
      title: 'Book Two',
      author: 'Author Two',
      status: 'to-read',
      addedAt: { seconds: 2, nanoseconds: 0 } as any,
    },
    {
      id: 'book-3',
      memberId: 'member-123',
      title: 'Book Three',
      author: 'Author Three',
      status: 'read',
      addedAt: { seconds: 3, nanoseconds: 0 } as any,
    },
    {
      id: 'book-4',
      memberId: 'member-123',
      title: 'Book Four',
      author: 'Author Four',
      status: 'reading',
      addedAt: { seconds: 4, nanoseconds: 0 } as any,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset store state
    useFamilyStore.setState({
      family: null,
      members: [],
      selectedMemberId: null,
      isLoading: false,
      error: null,
    });
  });

  describe('useBooksListener', () => {
    it('should return empty books when no family is loaded', () => {
      const { result } = renderHook(() => useBooksListener());

      expect(result.current.books).toEqual([]);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should return empty books when no member is selected', () => {
      useFamilyStore.setState({ family: mockFamily });

      const { result } = renderHook(() => useBooksListener());

      expect(result.current.books).toEqual([]);
    });

    it('should subscribe to books when family and member are set', () => {
      useFamilyStore.setState({
        family: mockFamily,
        selectedMemberId: 'member-123',
      });

      renderHook(() => useBooksListener());

      expect(firestoreModule.onBooksSnapshot).toHaveBeenCalledWith(
        'family-123',
        'member-123',
        expect.any(Function)
      );
    });

    it('should unsubscribe when unmounted', () => {
      const mockUnsubscribe = jest.fn();
      (firestoreModule.onBooksSnapshot as jest.Mock).mockReturnValue(mockUnsubscribe);

      useFamilyStore.setState({
        family: mockFamily,
        selectedMemberId: 'member-123',
      });

      const { unmount } = renderHook(() => useBooksListener());
      unmount();

      expect(mockUnsubscribe).toHaveBeenCalled();
    });
  });

  describe('useBooks - filtering', () => {
    beforeEach(() => {
      // Setup mock to call callback with books
      (firestoreModule.onBooksSnapshot as jest.Mock).mockImplementation(
        (familyId, memberId, callback) => {
          callback(mockBooks);
          return jest.fn();
        }
      );

      useFamilyStore.setState({
        family: mockFamily,
        selectedMemberId: 'member-123',
      });
    });

    it('should return all books when filter is "all"', () => {
      const { result } = renderHook(() => useBooks('all'));

      expect(result.current.books).toHaveLength(4);
      expect(result.current.counts.all).toBe(4);
    });

    it('should filter books by "reading" status', () => {
      const { result } = renderHook(() => useBooks('reading'));

      expect(result.current.books).toHaveLength(2);
      expect(result.current.books.every((b) => b.status === 'reading')).toBe(true);
      expect(result.current.counts.reading).toBe(2);
    });

    it('should filter books by "to-read" status', () => {
      const { result } = renderHook(() => useBooks('to-read'));

      expect(result.current.books).toHaveLength(1);
      expect(result.current.books[0].status).toBe('to-read');
      expect(result.current.counts['to-read']).toBe(1);
    });

    it('should filter books by "read" status', () => {
      const { result } = renderHook(() => useBooks('read'));

      expect(result.current.books).toHaveLength(1);
      expect(result.current.books[0].status).toBe('read');
      expect(result.current.counts.read).toBe(1);
    });

    it('should return correct counts for all statuses', () => {
      const { result } = renderHook(() => useBooks());

      expect(result.current.counts).toEqual({
        all: 4,
        reading: 2,
        'to-read': 1,
        read: 1,
      });
    });

    it('should provide booksByStatus grouping', () => {
      const { result } = renderHook(() => useBooks());

      expect(result.current.booksByStatus.reading).toHaveLength(2);
      expect(result.current.booksByStatus['to-read']).toHaveLength(1);
      expect(result.current.booksByStatus.read).toHaveLength(1);
    });
  });

  describe('useBookOperations', () => {
    beforeEach(() => {
      useFamilyStore.setState({
        family: mockFamily,
        selectedMemberId: 'member-123',
      });
    });

    it('should add a book', async () => {
      const { result } = renderHook(() => useBookOperations());

      const bookId = await result.current.addBook({
        title: 'New Book',
        author: 'New Author',
        status: 'to-read',
      });

      expect(bookId).toBe('new-book-id');
      expect(firestoreModule.createBook).toHaveBeenCalledWith(
        'family-123',
        'member-123',
        expect.objectContaining({
          title: 'New Book',
          author: 'New Author',
          status: 'to-read',
        })
      );
    });

    it('should update a book', async () => {
      const { result } = renderHook(() => useBookOperations());

      await result.current.editBook('book-1', { title: 'Updated Title' });

      expect(firestoreModule.updateBook).toHaveBeenCalledWith(
        'family-123',
        'member-123',
        'book-1',
        { title: 'Updated Title' }
      );
    });

    it('should delete a book', async () => {
      const { result } = renderHook(() => useBookOperations());

      await result.current.removeBook('book-1');

      expect(firestoreModule.deleteBook).toHaveBeenCalledWith(
        'family-123',
        'member-123',
        'book-1'
      );
    });

    it('should update book status', async () => {
      const { result } = renderHook(() => useBookOperations());

      await result.current.updateBookStatus('book-1', 'read');

      expect(firestoreModule.updateBook).toHaveBeenCalledWith(
        'family-123',
        'member-123',
        'book-1',
        { status: 'read' }
      );
    });

    it('should throw error when no family is loaded', async () => {
      useFamilyStore.setState({ family: null });

      const { result } = renderHook(() => useBookOperations());

      await expect(
        result.current.addBook({ title: 'Test', author: 'Test', status: 'reading' })
      ).rejects.toThrow('No family loaded');
    });

    it('should throw error when no member is selected', async () => {
      useFamilyStore.setState({ selectedMemberId: null });

      const { result } = renderHook(() => useBookOperations());

      await expect(
        result.current.addBook({ title: 'Test', author: 'Test', status: 'reading' })
      ).rejects.toThrow('No member selected');
    });
  });
});

