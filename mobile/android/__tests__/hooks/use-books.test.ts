import { renderHook, act } from '@testing-library/react-native';
import { useFamilyStore } from '../../stores/family-store';
import type { MemberBook, MemberLibraryEntry, FamilyBook, Family } from '../../types/models';

// Must mock before importing the hook
jest.mock('../../lib/firestore', () => ({
  onMemberLibrarySnapshot: jest.fn((familyId, memberId, callback) => {
    return jest.fn();
  }),
  onFamilyBooksSnapshot: jest.fn((familyId, callback) => {
    return jest.fn();
  }),
  findOrCreateFamilyBook: jest.fn(() => Promise.resolve({ bookId: 'new-book-id', isNew: true })),
  addToMemberLibrary: jest.fn(() => Promise.resolve('library-entry-id')),
  updateMemberLibraryEntry: jest.fn(() => Promise.resolve()),
  removeFromMemberLibrary: jest.fn(() => Promise.resolve()),
  updateFamilyBook: jest.fn(() => Promise.resolve()),
  getFamilyBook: jest.fn(() => Promise.resolve(null)),
  getSeriesBooksFromCatalog: jest.fn(() => Promise.resolve([])),
  addSeriesToMemberLibrary: jest.fn(() => Promise.resolve({ added: 3, skipped: 0 })),
  createFamilyBook: jest.fn(() => Promise.resolve('new-book-id')),
  updateSeries: jest.fn(() => Promise.resolve()),
}));

import { useBooks, useBookOperations, useBooksListener, getNextStatus } from '../../hooks/use-books';
import * as firestoreModule from '../../lib/firestore';

describe('getNextStatus', () => {
  it('should cycle from to-read to reading', () => {
    expect(getNextStatus('to-read')).toBe('reading');
  });

  it('should cycle from reading to read', () => {
    expect(getNextStatus('reading')).toBe('read');
  });

  it('should cycle from read back to to-read', () => {
    expect(getNextStatus('read')).toBe('to-read');
  });

  it('should complete full cycle correctly', () => {
    let status: 'to-read' | 'reading' | 'read' = 'to-read';
    status = getNextStatus(status); // to-read -> reading
    expect(status).toBe('reading');
    status = getNextStatus(status); // reading -> read
    expect(status).toBe('read');
    status = getNextStatus(status); // read -> to-read
    expect(status).toBe('to-read');
  });
});

describe('useBooks Hook', () => {
  const mockFamily: Family = {
    id: 'family-123',
    name: 'Test Family',
    ownerId: 'user-123',
    createdAt: { seconds: 0, nanoseconds: 0 } as any,
  };

  const mockFamilyBooks: FamilyBook[] = [
    {
      id: 'book-1',
      title: 'Book One',
      author: 'Author One',
      addedBy: 'member-123',
      addedAt: { seconds: 1, nanoseconds: 0 } as any,
    },
    {
      id: 'book-2',
      title: 'Book Two',
      author: 'Author Two',
      addedBy: 'member-123',
      addedAt: { seconds: 2, nanoseconds: 0 } as any,
    },
    {
      id: 'book-3',
      title: 'Book Three',
      author: 'Author Three',
      addedBy: 'member-123',
      addedAt: { seconds: 3, nanoseconds: 0 } as any,
    },
    {
      id: 'book-4',
      title: 'Book Four',
      author: 'Author Four',
      addedBy: 'member-123',
      addedAt: { seconds: 4, nanoseconds: 0 } as any,
    },
  ];

  const mockLibraryEntries: MemberLibraryEntry[] = [
    {
      id: 'entry-1',
      bookId: 'book-1',
      status: 'reading',
      addedAt: { seconds: 1, nanoseconds: 0 } as any,
    },
    {
      id: 'entry-2',
      bookId: 'book-2',
      status: 'to-read',
      addedAt: { seconds: 2, nanoseconds: 0 } as any,
    },
    {
      id: 'entry-3',
      bookId: 'book-3',
      status: 'read',
      addedAt: { seconds: 3, nanoseconds: 0 } as any,
    },
    {
      id: 'entry-4',
      bookId: 'book-4',
      status: 'reading',
      addedAt: { seconds: 4, nanoseconds: 0 } as any,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
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

    it('should subscribe to library and family books when family and member are set', () => {
      useFamilyStore.setState({
        family: mockFamily,
        selectedMemberId: 'member-123',
      });

      renderHook(() => useBooksListener());

      expect(firestoreModule.onMemberLibrarySnapshot).toHaveBeenCalledWith(
        'family-123',
        'member-123',
        expect.any(Function)
      );
      expect(firestoreModule.onFamilyBooksSnapshot).toHaveBeenCalledWith(
        'family-123',
        expect.any(Function)
      );
    });

    it('should unsubscribe when unmounted', () => {
      const mockUnsubscribeLibrary = jest.fn();
      const mockUnsubscribeBooks = jest.fn();
      (firestoreModule.onMemberLibrarySnapshot as jest.Mock).mockReturnValue(mockUnsubscribeLibrary);
      (firestoreModule.onFamilyBooksSnapshot as jest.Mock).mockReturnValue(mockUnsubscribeBooks);

      useFamilyStore.setState({
        family: mockFamily,
        selectedMemberId: 'member-123',
      });

      const { unmount } = renderHook(() => useBooksListener());
      unmount();

      expect(mockUnsubscribeLibrary).toHaveBeenCalled();
      expect(mockUnsubscribeBooks).toHaveBeenCalled();
    });
  });

  describe('useBooks - filtering', () => {
    beforeEach(() => {
      // Setup mocks to simulate data flow
      (firestoreModule.onMemberLibrarySnapshot as jest.Mock).mockImplementation(
        (familyId, memberId, callback) => {
          callback(mockLibraryEntries);
          return jest.fn();
        }
      );
      (firestoreModule.onFamilyBooksSnapshot as jest.Mock).mockImplementation(
        (familyId, callback) => {
          callback(mockFamilyBooks);
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

      const { bookId, libraryEntryId } = await result.current.addBook({
        title: 'New Book',
        author: 'New Author',
        status: 'to-read',
      });

      expect(bookId).toBe('new-book-id');
      expect(libraryEntryId).toBe('library-entry-id');
      expect(firestoreModule.findOrCreateFamilyBook).toHaveBeenCalledWith(
        'family-123',
        expect.objectContaining({
          title: 'New Book',
          author: 'New Author',
          addedBy: 'member-123',
        })
      );
      expect(firestoreModule.addToMemberLibrary).toHaveBeenCalledWith(
        'family-123',
        'member-123',
        'new-book-id',
        'to-read'
      );
    });

    it('should use memberId from data when provided (e.g. batch add)', async () => {
      const { result } = renderHook(() => useBookOperations());

      await result.current.addBook({
        title: 'Batch Book',
        author: 'Batch Author',
        status: 'reading',
        memberId: 'member-456',
      });

      expect(firestoreModule.findOrCreateFamilyBook).toHaveBeenCalledWith(
        'family-123',
        expect.objectContaining({
          title: 'Batch Book',
          author: 'Batch Author',
          addedBy: 'member-456',
        })
      );
      expect(firestoreModule.addToMemberLibrary).toHaveBeenCalledWith(
        'family-123',
        'member-456',
        'new-book-id',
        'reading'
      );
    });

    it('should update book status', async () => {
      const { result } = renderHook(() => useBookOperations());

      await result.current.updateBookStatus('entry-1', 'read');

      expect(firestoreModule.updateMemberLibraryEntry).toHaveBeenCalledWith(
        'family-123',
        'member-123',
        'entry-1',
        { status: 'read' }
      );
    });

    it('should remove a book from library', async () => {
      const { result } = renderHook(() => useBookOperations());

      await result.current.removeBook('entry-1');

      expect(firestoreModule.removeFromMemberLibrary).toHaveBeenCalledWith(
        'family-123',
        'member-123',
        'entry-1'
      );
    });

    it('should update book metadata', async () => {
      const { result } = renderHook(() => useBookOperations());

      await result.current.updateBookMetadata('book-1', {
        seriesId: 'series-hp',
        seriesOrder: 2,
      });

      expect(firestoreModule.updateFamilyBook).toHaveBeenCalledWith(
        'family-123',
        'book-1',
        { seriesId: 'series-hp', seriesOrder: 2 }
      );
    });

    it('should update book cover (thumbnailUrl)', async () => {
      const { result } = renderHook(() => useBookOperations());

      await result.current.updateBookMetadata('book-1', {
        thumbnailUrl: 'https://example.com/new-cover.jpg',
      });

      expect(firestoreModule.updateFamilyBook).toHaveBeenCalledWith(
        'family-123',
        'book-1',
        { thumbnailUrl: 'https://example.com/new-cover.jpg' }
      );
    });

    it('should update book title and author', async () => {
      const { result } = renderHook(() => useBookOperations());

      await result.current.updateBookMetadata('book-1', {
        title: 'Updated Title',
        author: 'Updated Author',
      });

      expect(firestoreModule.updateFamilyBook).toHaveBeenCalledWith(
        'family-123',
        'book-1',
        { title: 'Updated Title', author: 'Updated Author' }
      );
    });

    it('should add series to library', async () => {
      const { result } = renderHook(() => useBookOperations());

      const { added, skipped } = await result.current.addSeriesToLibrary('series-123');

      expect(added).toBe(3);
      expect(skipped).toBe(0);
      expect(firestoreModule.addSeriesToMemberLibrary).toHaveBeenCalledWith(
        'family-123',
        'member-123',
        'series-123',
        'to-read'
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

    describe('addOrUpdateBookStatus', () => {
      it('should update status when libraryEntryId is provided', async () => {
        const { result } = renderHook(() => useBookOperations());

        const returnedId = await result.current.addOrUpdateBookStatus(
          'book-1',
          'read',
          'entry-1'
        );

        expect(returnedId).toBe('entry-1');
        expect(firestoreModule.updateMemberLibraryEntry).toHaveBeenCalledWith(
          'family-123',
          'member-123',
          'entry-1',
          { status: 'read' }
        );
        expect(firestoreModule.addToMemberLibrary).not.toHaveBeenCalled();
      });

      it('should add book to library when libraryEntryId is not provided', async () => {
        (firestoreModule.addToMemberLibrary as jest.Mock).mockResolvedValue('new-entry-id');

        const { result } = renderHook(() => useBookOperations());

        const returnedId = await result.current.addOrUpdateBookStatus(
          'book-1',
          'reading',
          undefined
        );

        expect(returnedId).toBe('new-entry-id');
        expect(firestoreModule.addToMemberLibrary).toHaveBeenCalledWith(
          'family-123',
          'member-123',
          'book-1',
          'reading'
        );
        expect(firestoreModule.updateMemberLibraryEntry).not.toHaveBeenCalled();
      });

      it('should throw error when no family is loaded', async () => {
        useFamilyStore.setState({ family: null });

        const { result } = renderHook(() => useBookOperations());

        await expect(
          result.current.addOrUpdateBookStatus('book-1', 'read', undefined)
        ).rejects.toThrow('No family loaded');
      });

      it('should throw error when no member is selected', async () => {
        useFamilyStore.setState({ selectedMemberId: null });

        const { result } = renderHook(() => useBookOperations());

        await expect(
          result.current.addOrUpdateBookStatus('book-1', 'read', undefined)
        ).rejects.toThrow('No member selected');
      });
    });

    describe('updateSeriesBooksGenres', () => {
      const mockSeriesBooks: FamilyBook[] = [
        {
          id: 'book-1',
          title: 'Book One',
          author: 'Author',
          seriesId: 'series-1',
          seriesOrder: 1,
          addedBy: 'user-123',
          addedAt: { seconds: 0, nanoseconds: 0 } as any,
        },
        {
          id: 'book-2',
          title: 'Book Two',
          author: 'Author',
          seriesId: 'series-1',
          seriesOrder: 2,
          addedBy: 'user-123',
          addedAt: { seconds: 0, nanoseconds: 0 } as any,
        },
      ];

      beforeEach(() => {
        (firestoreModule.getSeriesBooksFromCatalog as jest.Mock).mockResolvedValue(mockSeriesBooks);
        (firestoreModule.updateFamilyBook as jest.Mock).mockResolvedValue(undefined);
      });

      it('should update genres for all books in series', async () => {
        const { result } = renderHook(() => useBookOperations());

        await result.current.updateSeriesBooksGenres('series-1', ['fantasy', 'adventure']);

        expect(firestoreModule.getSeriesBooksFromCatalog).toHaveBeenCalledWith('family-123', 'series-1');
        expect(firestoreModule.updateFamilyBook).toHaveBeenCalledTimes(2);
        expect(firestoreModule.updateFamilyBook).toHaveBeenCalledWith(
          'family-123',
          'book-1',
          { genres: ['fantasy', 'adventure'] }
        );
        expect(firestoreModule.updateFamilyBook).toHaveBeenCalledWith(
          'family-123',
          'book-2',
          { genres: ['fantasy', 'adventure'] }
        );
      });

      it('should set genres to undefined when empty array is passed', async () => {
        const { result } = renderHook(() => useBookOperations());

        await result.current.updateSeriesBooksGenres('series-1', []);

        expect(firestoreModule.updateFamilyBook).toHaveBeenCalledWith(
          'family-123',
          'book-1',
          { genres: undefined }
        );
        expect(firestoreModule.updateFamilyBook).toHaveBeenCalledWith(
          'family-123',
          'book-2',
          { genres: undefined }
        );
      });

      it('should handle series with no books', async () => {
        (firestoreModule.getSeriesBooksFromCatalog as jest.Mock).mockResolvedValue([]);

        const { result } = renderHook(() => useBookOperations());

        await result.current.updateSeriesBooksGenres('empty-series', ['fantasy']);

        expect(firestoreModule.getSeriesBooksFromCatalog).toHaveBeenCalledWith('family-123', 'empty-series');
        expect(firestoreModule.updateFamilyBook).not.toHaveBeenCalled();
      });

      it('should throw error when no family is loaded', async () => {
        useFamilyStore.setState({ family: null });

        const { result } = renderHook(() => useBookOperations());

        await expect(
          result.current.updateSeriesBooksGenres('series-1', ['fantasy'])
        ).rejects.toThrow('No family loaded');
      });
    });

    describe('addBooksToSeries', () => {
      const mockGoogleBooks: any[] = [
        {
          googleBooksId: 'gb-1',
          title: 'Book One',
          author: 'Author One',
          thumbnailUrl: 'https://example.com/cover1.jpg',
          categories: ['Fiction', 'Fantasy'],
        },
        {
          googleBooksId: 'gb-2',
          title: 'Book Two',
          author: 'Author Two',
          thumbnailUrl: 'https://example.com/cover2.jpg',
          categories: ['Fiction'],
        },
      ];

      const mockExistingBooks: FamilyBook[] = [
        {
          id: 'existing-1',
          title: 'Existing Book',
          author: 'Author',
          seriesId: 'series-1',
          seriesOrder: 1,
          addedBy: 'member-123',
          addedAt: { seconds: 0, nanoseconds: 0 } as any,
        },
      ];

      beforeEach(() => {
        (firestoreModule.getSeriesBooksFromCatalog as jest.Mock).mockResolvedValue(mockExistingBooks);
        (firestoreModule.findOrCreateFamilyBook as jest.Mock).mockResolvedValue({ bookId: 'new-book-id', isNew: true });
        (firestoreModule.updateFamilyBook as jest.Mock).mockResolvedValue(undefined);
        (firestoreModule.updateSeries as jest.Mock).mockResolvedValue(undefined);
      });

      it('should add books to series with correct order', async () => {
        // Mock getSeriesBooksFromCatalog to return updated count after books are added
        (firestoreModule.getSeriesBooksFromCatalog as jest.Mock)
          .mockResolvedValueOnce(mockExistingBooks) // First call: get existing books
          .mockResolvedValueOnce([...mockExistingBooks, { id: 'new-1' }, { id: 'new-2' }]); // Second call: after adding

        const { result } = renderHook(() => useBookOperations());

        await result.current.addBooksToSeries('series-1', mockGoogleBooks);

        // Should get existing books to determine starting order
        expect(firestoreModule.getSeriesBooksFromCatalog).toHaveBeenCalledWith('family-123', 'series-1');

        // Should create/find books for each selected book
        expect(firestoreModule.findOrCreateFamilyBook).toHaveBeenCalledTimes(2);
        expect(firestoreModule.findOrCreateFamilyBook).toHaveBeenCalledWith(
          'family-123',
          expect.objectContaining({
            title: 'Book One',
            author: 'Author One',
            googleBooksId: 'gb-1',
            seriesId: 'series-1',
            seriesOrder: 2, // Starting after existing book (order 1)
          })
        );
        expect(firestoreModule.findOrCreateFamilyBook).toHaveBeenCalledWith(
          'family-123',
          expect.objectContaining({
            title: 'Book Two',
            author: 'Author Two',
            googleBooksId: 'gb-2',
            seriesId: 'series-1',
            seriesOrder: 3,
          })
        );

        // Should update series totalBooks count (called twice: once to get existing, once to update)
        expect(firestoreModule.getSeriesBooksFromCatalog).toHaveBeenCalledTimes(2);
        expect(firestoreModule.updateSeries).toHaveBeenCalledWith(
          'family-123',
          'series-1',
          { totalBooks: 3 } // 1 existing + 2 new
        );
      });

      it('should update existing books with series info if not new', async () => {
        (firestoreModule.findOrCreateFamilyBook as jest.Mock)
          .mockResolvedValueOnce({ bookId: 'existing-book-id', isNew: false });

        const { result } = renderHook(() => useBookOperations());

        await result.current.addBooksToSeries('series-1', [mockGoogleBooks.slice(0, 1)]);

        // Should update existing book with series info
        expect(firestoreModule.updateFamilyBook).toHaveBeenCalledWith(
          'family-123',
          'existing-book-id',
          {
            seriesId: 'series-1',
            seriesOrder: 2,
          }
        );
      });

      it('should use provided starting order', async () => {
        const { result } = renderHook(() => useBookOperations());

        await result.current.addBooksToSeries('series-1', mockGoogleBooks, 10);

        expect(firestoreModule.findOrCreateFamilyBook).toHaveBeenCalledWith(
          'family-123',
          expect.objectContaining({
            seriesOrder: 10,
          })
        );
        expect(firestoreModule.findOrCreateFamilyBook).toHaveBeenCalledWith(
          'family-123',
          expect.objectContaining({
            seriesOrder: 11,
          })
        );
      });

      it('should normalize genres from Google Books categories', async () => {
        const { result } = renderHook(() => useBookOperations());

        await result.current.addBooksToSeries('series-1', [mockGoogleBooks[0]]);

        expect(firestoreModule.findOrCreateFamilyBook).toHaveBeenCalledWith(
          'family-123',
          expect.objectContaining({
            genres: expect.arrayContaining(['fiction', 'fantasy']),
          })
        );
      });

      it('should handle books without categories', async () => {
        const bookWithoutCategories = {
          ...mockGoogleBooks[0],
          categories: undefined,
        };

        const { result } = renderHook(() => useBookOperations());

        await result.current.addBooksToSeries('series-1', [bookWithoutCategories]);

        expect(firestoreModule.findOrCreateFamilyBook).toHaveBeenCalledWith(
          'family-123',
          expect.objectContaining({
            genres: undefined,
          })
        );
      });

      it('should throw error when no family is loaded', async () => {
        useFamilyStore.setState({ family: null });

        const { result } = renderHook(() => useBookOperations());

        await expect(
          result.current.addBooksToSeries('series-1', mockGoogleBooks)
        ).rejects.toThrow('No family loaded');
      });

      it('should throw error when no member is selected', async () => {
        useFamilyStore.setState({ selectedMemberId: null });

        const { result } = renderHook(() => useBookOperations());

        await expect(
          result.current.addBooksToSeries('series-1', mockGoogleBooks)
        ).rejects.toThrow('No member selected');
      });
    });
  });
});
