import { useEffect, useCallback, useState, useMemo } from 'react';
import { useFamilyStore } from '@/stores/family-store';
import {
  findOrCreateFamilyBook,
  addToMemberLibrary,
  getMemberLibrary,
  updateMemberLibraryEntry,
  removeFromMemberLibrary,
  onMemberLibrarySnapshot,
  onFamilyBooksSnapshot,
  getFamilyBook,
  updateFamilyBook,
  getSeriesBooksFromCatalog,
  addSeriesToMemberLibrary,
  createFamilyBook,
  updateSeries,
} from '@/lib/firestore';
import { normalizeApiCategories } from '@/constants/genres';
import type { MemberBook, MemberLibraryEntry, FamilyBook, BookStatus } from '@/types/models';
import type { GoogleBookData } from '@/lib/google-books';

/**
 * Get the next status in the cycle: to-read → reading → read → to-read
 */
export function getNextStatus(current: BookStatus): BookStatus {
  const cycle: BookStatus[] = ['to-read', 'reading', 'read'];
  const currentIndex = cycle.indexOf(current);
  return cycle[(currentIndex + 1) % cycle.length];
}

interface BooksState {
  books: MemberBook[];
  isLoading: boolean;
  error: string | null;
}

interface LibraryState {
  libraryEntries: MemberLibraryEntry[];
  familyBooks: FamilyBook[];
  isLoading: boolean;
}

/**
 * Hook to manage books for the selected family member.
 * Sets up real-time listeners for member's library and family books,
 * then joins them together.
 */
export function useBooksListener() {
  const family = useFamilyStore((s) => s.family);
  const selectedMemberId = useFamilyStore((s) => s.selectedMemberId);
  
  const [libraryState, setLibraryState] = useState<LibraryState>({
    libraryEntries: [],
    familyBooks: [],
    isLoading: false,
  });

  // Subscribe to member's library entries
  useEffect(() => {
    if (!family || !selectedMemberId) {
      setLibraryState({ libraryEntries: [], familyBooks: [], isLoading: false });
      return;
    }

    setLibraryState((prev) => ({ ...prev, isLoading: true }));

    // Subscribe to library entries
    const unsubscribeLibrary = onMemberLibrarySnapshot(family.id, selectedMemberId, (entries) => {
      setLibraryState((prev) => ({ ...prev, libraryEntries: entries, isLoading: false }));
    });

    // Subscribe to family books
    const unsubscribeBooks = onFamilyBooksSnapshot(family.id, (books) => {
      setLibraryState((prev) => ({ ...prev, familyBooks: books }));
    });

    return () => {
      unsubscribeLibrary();
      unsubscribeBooks();
    };
  }, [family, selectedMemberId]);

  // Join library entries with family books
  const books: MemberBook[] = useMemo(() => {
    const booksMap = new Map(libraryState.familyBooks.map(b => [b.id, b]));
    
    return libraryState.libraryEntries
      .map((entry) => {
        const book = booksMap.get(entry.bookId);
        if (!book) return null;
        
        return {
          libraryEntryId: entry.id,
          status: entry.status,
          addedAt: entry.addedAt,
          id: book.id,
          title: book.title,
          author: book.author,
          thumbnailUrl: book.thumbnailUrl,
          googleBooksId: book.googleBooksId,
          genres: book.genres,
          seriesId: book.seriesId,
          seriesOrder: book.seriesOrder,
        } as MemberBook;
      })
      .filter((book): book is MemberBook => book !== null);
  }, [libraryState.libraryEntries, libraryState.familyBooks]);

  return {
    books,
    familyBooks: libraryState.familyBooks,
    isLoading: libraryState.isLoading,
    error: null,
  };
}

/**
 * Hook to get all unique genres from family books
 * Useful for autocomplete suggestions
 */
export function useExistingGenres(): string[] {
  const { familyBooks } = useBooksListener();
  
  return useMemo(() => {
    const genreSet = new Set<string>();
    for (const book of familyBooks) {
      if (book.genres) {
        for (const genre of book.genres) {
          genreSet.add(genre.toLowerCase());
        }
      }
    }
    return Array.from(genreSet).sort();
  }, [familyBooks]);
}

/**
 * Hook for accessing books with optional status filtering
 */
export function useBooks(statusFilter?: BookStatus | 'all') {
  const { books, isLoading, error } = useBooksListener();

  const filteredBooks = statusFilter && statusFilter !== 'all'
    ? books.filter((book) => book.status === statusFilter)
    : books;

  // Group books by status for quick counts
  const booksByStatus = {
    reading: books.filter((b) => b.status === 'reading'),
    'to-read': books.filter((b) => b.status === 'to-read'),
    read: books.filter((b) => b.status === 'read'),
  };

  return {
    books: filteredBooks,
    allBooks: books,
    booksByStatus,
    isLoading,
    error,
    counts: {
      all: books.length,
      reading: booksByStatus.reading.length,
      'to-read': booksByStatus['to-read'].length,
      read: booksByStatus.read.length,
    },
  };
}

/**
 * Input data for adding a book
 */
interface AddBookData {
  title: string;
  author: string;
  status?: BookStatus;
  thumbnailUrl?: string;
  googleBooksId?: string;
  genres?: string[];
  seriesId?: string;
  seriesOrder?: number;
  /** When provided (e.g. batch add), use this member instead of the globally selected one */
  memberId?: string;
}

/**
 * Hook for book CRUD operations
 */
export function useBookOperations() {
  const family = useFamilyStore((s) => s.family);
  const selectedMemberId = useFamilyStore((s) => s.selectedMemberId);

  /**
   * Add a book to a member's library.
   * 1. Find or create the book in the family catalog
   * 2. Add a library entry for the member with the specified status
   */
  const addBook = useCallback(
    async (data: AddBookData): Promise<{ bookId: string; libraryEntryId: string }> => {
      const effectiveMemberId = data.memberId ?? selectedMemberId;
      if (!family) throw new Error('No family loaded');
      if (!effectiveMemberId) throw new Error('No member selected');

      const status = data.status || 'to-read';

      // Find or create the book in the family catalog
      const { bookId, isNew } = await findOrCreateFamilyBook(family.id, {
        title: data.title,
        author: data.author,
        thumbnailUrl: data.thumbnailUrl,
        googleBooksId: data.googleBooksId,
        genres: data.genres,
        seriesId: data.seriesId,
        seriesOrder: data.seriesOrder,
        addedBy: effectiveMemberId,
      });

      // Add to member's library
      const libraryEntryId = await addToMemberLibrary(family.id, effectiveMemberId, bookId, status);

      return { bookId, libraryEntryId };
    },
    [family, selectedMemberId]
  );

  /**
   * Update a book's status in the member's library
   */
  const updateBookStatus = useCallback(
    async (libraryEntryId: string, status: BookStatus) => {
      if (!family) throw new Error('No family loaded');
      if (!selectedMemberId) throw new Error('No member selected');

      await updateMemberLibraryEntry(family.id, selectedMemberId, libraryEntryId, { status });
    },
    [family, selectedMemberId]
  );

  /**
   * Add or update a book's status in the member's library.
   * If the book is not in the library, adds it first with the given status.
   * This is useful for series views where we show all books but some may not be in the library.
   * 
   * @param familyBookId - The ID of the book in the family catalog
   * @param status - The status to set
   * @param libraryEntryId - The library entry ID if the book is already in the library (optional)
   * @returns The library entry ID (existing or newly created)
   */
  const addOrUpdateBookStatus = useCallback(
    async (
      familyBookId: string,
      status: BookStatus,
      libraryEntryId?: string
    ): Promise<string> => {
      if (!family) throw new Error('No family loaded');
      if (!selectedMemberId) throw new Error('No member selected');

      if (libraryEntryId) {
        // Book is already in library, just update status
        await updateMemberLibraryEntry(family.id, selectedMemberId, libraryEntryId, { status });
        return libraryEntryId;
      } else {
        // Book is not in library, add it with the new status
        const newEntryId = await addToMemberLibrary(family.id, selectedMemberId, familyBookId, status);
        return newEntryId;
      }
    },
    [family, selectedMemberId]
  );

  /**
   * Remove a book from the member's library
   */
  const removeBook = useCallback(
    async (libraryEntryId: string) => {
      if (!family) throw new Error('No family loaded');
      if (!selectedMemberId) throw new Error('No member selected');

      await removeFromMemberLibrary(family.id, selectedMemberId, libraryEntryId);
    },
    [family, selectedMemberId]
  );

  /**
   * Update a family book's metadata (e.g., add to series)
   */
  const updateBookMetadata = useCallback(
    async (bookId: string, data: Partial<FamilyBook>) => {
      if (!family) throw new Error('No family loaded');

      await updateFamilyBook(family.id, bookId, data);
    },
    [family]
  );

  /**
   * Get a family book by ID
   */
  const fetchBook = useCallback(
    async (bookId: string): Promise<FamilyBook | null> => {
      if (!family) throw new Error('No family loaded');

      return getFamilyBook(family.id, bookId);
    },
    [family]
  );

  /**
   * Add all books from a series to the member's library
   */
  const addSeriesToLibrary = useCallback(
    async (seriesId: string): Promise<{ added: number; skipped: number }> => {
      if (!family) throw new Error('No family loaded');
      if (!selectedMemberId) throw new Error('No member selected');

      return addSeriesToMemberLibrary(family.id, selectedMemberId, seriesId, 'to-read');
    },
    [family, selectedMemberId]
  );

  /**
   * Get all books in a series from the family catalog
   */
  const getSeriesBooks = useCallback(
    async (seriesId: string): Promise<FamilyBook[]> => {
      if (!family) throw new Error('No family loaded');

      return getSeriesBooksFromCatalog(family.id, seriesId);
    },
    [family]
  );

  /**
   * Update genres for all books in a series.
   * This replaces the genres on ALL books in the series with the new genre set.
   */
  const updateSeriesBooksGenres = useCallback(
    async (seriesId: string, genres: string[]): Promise<void> => {
      if (!family) throw new Error('No family loaded');

      // Get all books in the series
      const seriesBooks = await getSeriesBooksFromCatalog(family.id, seriesId);

      // Update each book's genres
      await Promise.all(
        seriesBooks.map((book) =>
          updateFamilyBook(family.id, book.id, {
            genres: genres.length > 0 ? genres : undefined,
          })
        )
      );
    },
    [family]
  );

  /**
   * Add multiple books to a series from Google Books search results.
   * Books are added to the family catalog (not member's library).
   * Series totalBooks count is updated automatically.
   */
  const addBooksToSeries = useCallback(
    async (seriesId: string, books: GoogleBookData[], startingOrder?: number): Promise<void> => {
      if (!family) throw new Error('No family loaded');
      if (!selectedMemberId) throw new Error('No member selected');

      // Get existing books in series to determine starting order
      const existingBooks = await getSeriesBooksFromCatalog(family.id, seriesId);
      const maxOrder = existingBooks.reduce((max, book) => {
        return Math.max(max, book.seriesOrder || 0);
      }, 0);
      
      const startOrder = startingOrder ?? maxOrder + 1;

      // Create family book entries for each selected book
      const bookPromises = books.map(async (book, index) => {
        const genres = book.categories ? normalizeApiCategories(book.categories) : undefined;
        
        // Check if book already exists in family catalog
        const { bookId, isNew } = await findOrCreateFamilyBook(family.id, {
          title: book.title,
          author: book.author,
          thumbnailUrl: book.thumbnailUrl,
          googleBooksId: book.googleBooksId,
          genres,
          seriesId,
          seriesOrder: startOrder + index,
          addedBy: selectedMemberId,
        });

        // If book already existed, update its series info
        if (!isNew) {
          await updateFamilyBook(family.id, bookId, {
            seriesId,
            seriesOrder: startOrder + index,
          });
        }

        return bookId;
      });

      await Promise.all(bookPromises);

      // Update series totalBooks count
      const allBooksInSeries = await getSeriesBooksFromCatalog(family.id, seriesId);
      await updateSeries(family.id, seriesId, {
        totalBooks: allBooksInSeries.length,
      });
    },
    [family, selectedMemberId]
  );

  return {
    addBook,
    updateBookStatus,
    addOrUpdateBookStatus,
    removeBook,
    updateBookMetadata,
    fetchBook,
    addSeriesToLibrary,
    getSeriesBooks,
    updateSeriesBooksGenres,
    addBooksToSeries,
  };
}
