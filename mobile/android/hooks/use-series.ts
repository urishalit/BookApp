import { useEffect, useCallback, useState, useMemo } from 'react';
import { useFamilyStore } from '@/stores/family-store';
import {
  createSeries,
  updateSeries,
  deleteSeries,
  getSeriesById,
  onSeriesSnapshot,
  onBooksSnapshot,
} from '@/lib/firestore';
import type { Series, Book, CreateSeries } from '@/types/models';

interface SeriesState {
  series: Series[];
  isLoading: boolean;
  error: string | null;
}

/**
 * Hook to manage series for the selected family member.
 * Sets up a real-time listener for the member's series.
 */
export function useSeriesListener() {
  const family = useFamilyStore((s) => s.family);
  const selectedMemberId = useFamilyStore((s) => s.selectedMemberId);

  const [state, setState] = useState<SeriesState>({
    series: [],
    isLoading: false,
    error: null,
  });

  useEffect(() => {
    if (!family || !selectedMemberId) {
      setState({ series: [], isLoading: false, error: null });
      return;
    }

    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    const unsubscribe = onSeriesSnapshot(family.id, selectedMemberId, (series) => {
      setState({ series, isLoading: false, error: null });
    });

    return () => {
      unsubscribe();
    };
  }, [family, selectedMemberId]);

  return state;
}

/**
 * Extended series data with book counts and progress
 */
export interface SeriesWithProgress extends Series {
  booksInSeries: Book[];
  booksRead: number;
  booksOwned: number;
  progressPercent: number;
}

/**
 * Hook for accessing series with book progress
 */
export function useSeries() {
  const { series, isLoading, error } = useSeriesListener();
  const family = useFamilyStore((s) => s.family);
  const selectedMemberId = useFamilyStore((s) => s.selectedMemberId);
  
  const [books, setBooks] = useState<Book[]>([]);

  // Subscribe to books to calculate series progress
  useEffect(() => {
    if (!family || !selectedMemberId) {
      setBooks([]);
      return;
    }

    const unsubscribe = onBooksSnapshot(family.id, selectedMemberId, (allBooks) => {
      setBooks(allBooks);
    });

    return () => {
      unsubscribe();
    };
  }, [family, selectedMemberId]);

  // Calculate series with progress
  const seriesWithProgress: SeriesWithProgress[] = useMemo(() => {
    return series.map((s) => {
      const booksInSeries = books.filter((book) => book.seriesId === s.id);
      const booksRead = booksInSeries.filter((book) => book.status === 'read').length;
      const booksOwned = booksInSeries.length;
      const progressPercent = s.totalBooks > 0 
        ? Math.round((booksRead / s.totalBooks) * 100) 
        : 0;

      return {
        ...s,
        booksInSeries,
        booksRead,
        booksOwned,
        progressPercent,
      };
    });
  }, [series, books]);

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
 */
export function useSeriesOperations() {
  const family = useFamilyStore((s) => s.family);
  const selectedMemberId = useFamilyStore((s) => s.selectedMemberId);

  const addSeries = useCallback(
    async (data: Omit<CreateSeries, 'memberId'>) => {
      if (!family) throw new Error('No family loaded');
      if (!selectedMemberId) throw new Error('No member selected');

      const seriesId = await createSeries(family.id, selectedMemberId, data);
      return seriesId;
    },
    [family, selectedMemberId]
  );

  const editSeries = useCallback(
    async (seriesId: string, data: Partial<Series>) => {
      if (!family) throw new Error('No family loaded');
      if (!selectedMemberId) throw new Error('No member selected');

      await updateSeries(family.id, selectedMemberId, seriesId, data);
    },
    [family, selectedMemberId]
  );

  const removeSeries = useCallback(
    async (seriesId: string) => {
      if (!family) throw new Error('No family loaded');
      if (!selectedMemberId) throw new Error('No member selected');

      await deleteSeries(family.id, selectedMemberId, seriesId);
    },
    [family, selectedMemberId]
  );

  const fetchSeries = useCallback(
    async (seriesId: string): Promise<Series | null> => {
      if (!family) throw new Error('No family loaded');
      if (!selectedMemberId) throw new Error('No member selected');

      return getSeriesById(family.id, selectedMemberId, seriesId);
    },
    [family, selectedMemberId]
  );

  return {
    addSeries,
    editSeries,
    removeSeries,
    fetchSeries,
  };
}

/**
 * Hook to get a single series by ID with its books
 */
export function useSeriesDetail(seriesId: string | undefined) {
  const { series } = useSeries();
  
  const seriesDetail = useMemo(() => {
    if (!seriesId) return null;
    return series.find((s) => s.id === seriesId) ?? null;
  }, [series, seriesId]);

  // Sort books by series order
  const sortedBooks = useMemo(() => {
    if (!seriesDetail) return [];
    return [...seriesDetail.booksInSeries].sort((a, b) => {
      const orderA = a.seriesOrder ?? Infinity;
      const orderB = b.seriesOrder ?? Infinity;
      return orderA - orderB;
    });
  }, [seriesDetail]);

  return {
    series: seriesDetail,
    books: sortedBooks,
    isLoading: false,
  };
}

