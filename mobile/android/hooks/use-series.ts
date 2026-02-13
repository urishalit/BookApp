import { useEffect, useCallback, useState, useMemo } from 'react';
import { useFamilyStore } from '@/stores/family-store';
import {
  createSeries,
  updateSeries,
  deleteSeries,
  getSeriesById,
  onSeriesSnapshot,
  getSeriesBooksFromCatalog,
  addSeriesToMemberLibrary,
  onFamilyBooksSnapshot,
  computeSeriesTotalBooksFromBooks,
} from '@/lib/firestore';
import { useBooksListener } from '@/hooks/use-books';
import type { Series, MemberBook, FamilyBook, CreateSeries, SeriesBookDisplay } from '@/types/models';

interface SeriesState {
  series: Series[];
  isLoading: boolean;
  error: string | null;
}

/**
 * Hook to manage series for the family.
 * Sets up a real-time listener for the family's series (shared across all members).
 */
export function useSeriesListener() {
  const family = useFamilyStore((s) => s.family);

  const [state, setState] = useState<SeriesState>({
    series: [],
    isLoading: false,
    error: null,
  });

  useEffect(() => {
    if (!family) {
      setState({ series: [], isLoading: false, error: null });
      return;
    }

    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    const unsubscribe = onSeriesSnapshot(family.id, (series) => {
      setState({ series, isLoading: false, error: null });
    });

    return () => {
      unsubscribe();
    };
  }, [family]);

  return state;
}

/**
 * Extended series data with book counts and progress
 */
export interface SeriesWithProgress extends Series {
  booksInSeries: MemberBook[];
  booksRead: number;
  booksOwned: number;
  progressPercent: number;
  isInLibrary: boolean; // Whether the member has any books from this series
}

/**
 * Hook for accessing series with book progress for the selected member
 * Series are shared across family, but progress is calculated per member
 */
export function useSeries() {
  const family = useFamilyStore((s) => s.family);
  const { series, isLoading, error } = useSeriesListener();
  const { books } = useBooksListener();

  const [familyBooks, setFamilyBooks] = useState<FamilyBook[]>([]);
  useEffect(() => {
    if (!family) {
      setFamilyBooks([]);
      return;
    }
    const unsubscribe = onFamilyBooksSnapshot(family.id, setFamilyBooks);
    return unsubscribe;
  }, [family]);

  // Calculate series with progress for selected member
  // totalBooks is computed from family books (max seriesOrder) for correct display
  const seriesWithProgress: SeriesWithProgress[] = useMemo(() => {
    return series.map((s) => {
      const familyBooksInSeries = familyBooks.filter((b) => b.seriesId === s.id);
      const totalBooks = computeSeriesTotalBooksFromBooks(familyBooksInSeries);

      // Only count books from the selected member's library
      const booksInSeries = books.filter((book) => book.seriesId === s.id);
      const booksRead = booksInSeries.filter((book) => book.status === 'read').length;
      const booksOwned = booksInSeries.length;
      const progressPercent =
        totalBooks > 0 ? Math.round((booksRead / totalBooks) * 100) : 0;

      return {
        ...s,
        totalBooks,
        booksInSeries,
        booksRead,
        booksOwned,
        progressPercent,
        isInLibrary: booksOwned > 0,
      };
    });
  }, [series, books, familyBooks]);

  return {
    series: seriesWithProgress,
    allSeries: series,
    isLoading,
    error,
    totalSeries: series.length,
  };
}

/**
 * Hook for series CRUD operations
 * Series are shared across family members
 */
export function useSeriesOperations() {
  const family = useFamilyStore((s) => s.family);
  const selectedMemberId = useFamilyStore((s) => s.selectedMemberId);

  const addSeries = useCallback(
    async (data: Omit<CreateSeries, 'createdBy'>) => {
      if (!family) throw new Error('No family loaded');

      // Pass selectedMemberId as createdBy for tracking (optional)
      const seriesId = await createSeries(family.id, data, selectedMemberId ?? undefined);
      return seriesId;
    },
    [family, selectedMemberId]
  );

  const editSeries = useCallback(
    async (seriesId: string, data: Partial<Series>) => {
      if (!family) throw new Error('No family loaded');

      await updateSeries(family.id, seriesId, data);
    },
    [family]
  );

  const removeSeries = useCallback(
    async (seriesId: string) => {
      if (!family) throw new Error('No family loaded');

      await deleteSeries(family.id, seriesId);
    },
    [family]
  );

  const fetchSeries = useCallback(
    async (seriesId: string): Promise<Series | null> => {
      if (!family) throw new Error('No family loaded');

      return getSeriesById(family.id, seriesId);
    },
    [family]
  );

  /**
   * Add a series to the member's library.
   * This adds all books in the series with "to-read" status.
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

  return {
    addSeries,
    editSeries,
    removeSeries,
    fetchSeries,
    addSeriesToLibrary,
    getSeriesBooks,
  };
}

/**
 * Hook to get a single series by ID with ALL books in the series.
 * Shows all books from the family catalog for this series,
 * with the member's library status overlaid (or 'to-read' if not in library).
 */
export function useSeriesDetail(seriesId: string | undefined) {
  const family = useFamilyStore((s) => s.family);
  const { series } = useSeries();
  const { books: memberBooks } = useBooksListener();
  
  // State for all family books in this series
  const [familyBooksInSeries, setFamilyBooksInSeries] = useState<FamilyBook[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Subscribe to family books and filter by series
  useEffect(() => {
    if (!family || !seriesId) {
      setFamilyBooksInSeries([]);
      return;
    }

    setIsLoading(true);

    const unsubscribe = onFamilyBooksSnapshot(family.id, (allBooks) => {
      const booksInSeries = allBooks.filter((book) => book.seriesId === seriesId);
      setFamilyBooksInSeries(booksInSeries);
      setIsLoading(false);
    });

    return () => {
      unsubscribe();
    };
  }, [family, seriesId]);
  
  const seriesDetail = useMemo(() => {
    if (!seriesId) return null;
    const found = series.find((s) => s.id === seriesId) ?? null;
    if (!found) return null;
    const derivedTotalBooks = computeSeriesTotalBooksFromBooks(familyBooksInSeries);
    return { ...found, totalBooks: derivedTotalBooks };
  }, [series, seriesId, familyBooksInSeries]);

  // Create a map of member's library entries by book ID for quick lookup
  const memberLibraryMap = useMemo(() => {
    const map = new Map<string, MemberBook>();
    for (const book of memberBooks) {
      map.set(book.id, book);
    }
    return map;
  }, [memberBooks]);

  // Merge family books with member's library status
  const displayBooks: SeriesBookDisplay[] = useMemo(() => {
    return familyBooksInSeries
      .map((familyBook): SeriesBookDisplay => {
        const memberBook = memberLibraryMap.get(familyBook.id);
        
        return {
          // Book metadata from family catalog
          id: familyBook.id,
          title: familyBook.title,
          author: familyBook.author,
          thumbnailUrl: familyBook.thumbnailUrl,
          googleBooksId: familyBook.googleBooksId,
          genres: familyBook.genres,
          seriesId: familyBook.seriesId,
          seriesOrder: familyBook.seriesOrder,
          year: familyBook.year,
          // Library status (from member's library or default)
          libraryEntryId: memberBook?.libraryEntryId,
          status: memberBook?.status ?? 'to-read',
          isInLibrary: !!memberBook,
        };
      })
      .sort((a, b) => {
        const orderA = a.seriesOrder ?? Infinity;
        const orderB = b.seriesOrder ?? Infinity;
        return orderA - orderB;
      });
  }, [familyBooksInSeries, memberLibraryMap]);

  return {
    series: seriesDetail,
    books: displayBooks,
    isLoading,
  };
}
