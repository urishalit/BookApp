import { groupBooksBySeries, getBookListItemKey, BookListItem } from '../../lib/book-list-utils';
import type { MemberBook } from '../../types/models';
import type { SeriesWithProgress } from '../../hooks/use-series';

describe('book-list-utils', () => {
  // Mock timestamp with toMillis method
  const createMockTimestamp = (millis: number) => ({
    seconds: Math.floor(millis / 1000),
    nanoseconds: 0,
    toMillis: () => millis,
  });

  const createBook = (overrides: Partial<MemberBook> & { id: string }): MemberBook => ({
    libraryEntryId: `entry-${overrides.id}`,
    title: 'Test Book',
    author: 'Test Author',
    status: 'to-read',
    addedAt: createMockTimestamp(Date.now()) as any,
    ...overrides,
  });

  // Helper to create SeriesWithProgress with books
  const createSeriesWithProgress = (
    id: string,
    name: string,
    totalBooks: number,
    booksInSeries: MemberBook[] = []
  ): SeriesWithProgress => ({
    id,
    name,
    totalBooks,
    booksInSeries,
    booksRead: booksInSeries.filter((b) => b.status === 'read').length,
    booksOwned: booksInSeries.length,
    progressPercent: totalBooks > 0
      ? Math.round((booksInSeries.filter((b) => b.status === 'read').length / totalBooks) * 100)
      : 0,
    isInLibrary: booksInSeries.length > 0,
    status:
      booksInSeries.length === 0
        ? 'to-read'
        : booksInSeries.every((b) => b.status === 'read')
          ? 'read'
          : booksInSeries.some((b) => b.status === 'reading') || booksInSeries.some((b) => b.status === 'read')
            ? 'reading'
            : 'to-read',
  });

  // Books for Harry Potter series
  const hpBooks: MemberBook[] = [
    createBook({ id: 'hp-1', title: 'HP Book 1', seriesId: 'series-hp', seriesOrder: 1, status: 'read' }),
    createBook({ id: 'hp-2', title: 'HP Book 2', seriesId: 'series-hp', seriesOrder: 2, status: 'read' }),
    createBook({ id: 'hp-3', title: 'HP Book 3', seriesId: 'series-hp', seriesOrder: 3, status: 'reading' }),
  ];

  // Books for LOTR series
  const lotrBooks: MemberBook[] = [
    createBook({ id: 'lotr-1', title: 'LOTR Book 1', seriesId: 'series-lotr', seriesOrder: 1, status: 'read' }),
  ];

  const mockSeriesWithProgress: SeriesWithProgress[] = [
    createSeriesWithProgress('series-hp', 'Harry Potter', 7, hpBooks),
    createSeriesWithProgress('series-lotr', 'Lord of the Rings', 3, lotrBooks),
  ];

  describe('groupBooksBySeries', () => {
    it('should return empty array when no books provided', () => {
      const result = groupBooksBySeries([], mockSeriesWithProgress);
      expect(result).toEqual([]);
    });

    it('should return standalone books as individual items when no series', () => {
      const books: MemberBook[] = [
        createBook({ id: 'book-1', title: 'Standalone Book 1' }),
        createBook({ id: 'book-2', title: 'Standalone Book 2' }),
      ];

      const result = groupBooksBySeries(books, mockSeriesWithProgress);

      expect(result).toHaveLength(2);
      expect(result.every((item) => item.type === 'book')).toBe(true);
    });

    it('should group books with same seriesId into a single series item', () => {
      // All books from series; series should include all books from seriesWithProgress
      const result = groupBooksBySeries(hpBooks, mockSeriesWithProgress);

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('series');
      if (result[0].type === 'series') {
        expect(result[0].series.id).toBe('series-hp');
        // Should include ALL books from series, not just filtered
        expect(result[0].books).toHaveLength(3);
      }
    });

    it('should use complete booksInSeries from seriesWithProgress, not filtered books', () => {
      // Pass all books; series item uses complete booksInSeries from seriesWithProgress
      const result = groupBooksBySeries(hpBooks, mockSeriesWithProgress);

      expect(result).toHaveLength(1);
      if (result[0].type === 'series') {
        // Should have ALL 3 books, not just the 1 "reading" book
        expect(result[0].books).toHaveLength(3);
        // Verify we can count read books correctly
        const readCount = result[0].books.filter((b) => b.status === 'read').length;
        expect(readCount).toBe(2);
      }
    });

    it('should separate different series into different items', () => {
      const books: MemberBook[] = [
        createBook({ id: 'hp-1', title: 'HP Book 1', seriesId: 'series-hp' }),
        createBook({ id: 'lotr-1', title: 'LOTR Book 1', seriesId: 'series-lotr' }),
      ];

      const result = groupBooksBySeries(books, mockSeriesWithProgress);

      expect(result).toHaveLength(2);
      expect(result.every((item) => item.type === 'series')).toBe(true);
    });

    it('should mix series and standalone books correctly', () => {
      const books: MemberBook[] = [
        createBook({ id: 'hp-1', title: 'HP Book 1', seriesId: 'series-hp' }),
        createBook({ id: 'standalone', title: 'Standalone Book' }),
      ];

      const result = groupBooksBySeries(books, mockSeriesWithProgress);

      expect(result).toHaveLength(2);
      const seriesItems = result.filter((item) => item.type === 'series');
      const bookItems = result.filter((item) => item.type === 'book');
      expect(seriesItems).toHaveLength(1);
      expect(bookItems).toHaveLength(1);
    });

    it('should fall back to individual books when series metadata not found', () => {
      const books: MemberBook[] = [
        createBook({ id: 'book-1', title: 'Unknown Series Book 1', seriesId: 'series-unknown' }),
        createBook({ id: 'book-2', title: 'Unknown Series Book 2', seriesId: 'series-unknown' }),
      ];

      const result = groupBooksBySeries(books, mockSeriesWithProgress);

      // Should fall back to individual book items since series-unknown doesn't exist
      expect(result).toHaveLength(2);
      expect(result.every((item) => item.type === 'book')).toBe(true);
    });

    it('should sort series before standalone books', () => {
      const books: MemberBook[] = [
        createBook({ id: 'standalone', title: 'Standalone First', addedAt: createMockTimestamp(3000) as any }),
        createBook({ id: 'hp-1', title: 'HP Book', seriesId: 'series-hp', addedAt: createMockTimestamp(1000) as any }),
      ];

      const result = groupBooksBySeries(books, mockSeriesWithProgress);

      expect(result[0].type).toBe('series');
      expect(result[1].type).toBe('book');
    });

    it('should sort series alphabetically by name', () => {
      const books: MemberBook[] = [
        createBook({ id: 'lotr-1', seriesId: 'series-lotr' }), // Lord of the Rings
        createBook({ id: 'hp-1', seriesId: 'series-hp' }), // Harry Potter
      ];

      const result = groupBooksBySeries(books, mockSeriesWithProgress);

      expect(result).toHaveLength(2);
      expect(result[0].type).toBe('series');
      expect(result[1].type).toBe('series');
      if (result[0].type === 'series' && result[1].type === 'series') {
        // Harry Potter comes before Lord of the Rings alphabetically
        expect(result[0].series.name).toBe('Harry Potter');
        expect(result[1].series.name).toBe('Lord of the Rings');
      }
    });

    it('should sort standalone books by addedAt descending (newest first)', () => {
      const books: MemberBook[] = [
        createBook({ id: 'book-1', title: 'Oldest', addedAt: createMockTimestamp(1000) as any }),
        createBook({ id: 'book-2', title: 'Middle', addedAt: createMockTimestamp(2000) as any }),
        createBook({ id: 'book-3', title: 'Newest', addedAt: createMockTimestamp(3000) as any }),
      ];

      const result = groupBooksBySeries(books, mockSeriesWithProgress);

      expect(result).toHaveLength(3);
      expect(result[0].type).toBe('book');
      expect(result[1].type).toBe('book');
      expect(result[2].type).toBe('book');
      if (result[0].type === 'book' && result[1].type === 'book' && result[2].type === 'book') {
        expect(result[0].book.title).toBe('Newest');
        expect(result[1].book.title).toBe('Middle');
        expect(result[2].book.title).toBe('Oldest');
      }
    });

    it('should handle books without addedAt.toMillis gracefully', () => {
      const books: MemberBook[] = [
        createBook({ id: 'book-1', title: 'No toMillis', addedAt: { seconds: 1, nanoseconds: 0 } as any }),
        createBook({ id: 'book-2', title: 'With toMillis', addedAt: createMockTimestamp(2000) as any }),
      ];

      // Should not throw
      expect(() => groupBooksBySeries(books, mockSeriesWithProgress)).not.toThrow();

      const result = groupBooksBySeries(books, mockSeriesWithProgress);
      expect(result).toHaveLength(2);
    });

    it('should show series when it has books in library (all mode)', () => {
      const result = groupBooksBySeries(hpBooks, mockSeriesWithProgress);

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('series');
      if (result[0].type === 'series') {
        expect(result[0].books).toHaveLength(3);
      }
    });

    it('should include series with status reading when filter is reading, even if no book is reading', () => {
      const seriesReadingStatus: SeriesWithProgress[] = [
        { ...mockSeriesWithProgress[0], status: 'reading' as const },
      ];

      const result = groupBooksBySeries(hpBooks, seriesReadingStatus, 'reading');

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('series');
      if (result[0].type === 'series') {
        expect(result[0].series.id).toBe('series-hp');
        expect(result[0].series.status).toBe('reading');
      }
    });

    it('series status trumps: series with status reading does NOT appear in Read tab', () => {
      // HP series has 2 read + 1 reading; user set series status to "reading"
      const seriesWithReadingStatus: SeriesWithProgress[] = [
        { ...mockSeriesWithProgress[0], status: 'reading' as const },
      ];

      const result = groupBooksBySeries(hpBooks, seriesWithReadingStatus, 'read');

      // Series should NOT appear in Read tab despite having read books
      expect(result).toHaveLength(0);
    });

    it('series status trumps: series with status read does NOT appear in Reading tab', () => {
      const seriesWithReadStatus: SeriesWithProgress[] = [
        { ...mockSeriesWithProgress[0], status: 'read' as const },
      ];

      const result = groupBooksBySeries(hpBooks, seriesWithReadStatus, 'reading');

      expect(result).toHaveLength(0);
    });
  });

  describe('getBookListItemKey', () => {
    it('should return book key for book items', () => {
      const bookItem: BookListItem = {
        type: 'book',
        book: createBook({ id: 'book-123' }),
      };

      expect(getBookListItemKey(bookItem)).toBe('book-book-123');
    });

    it('should return series key for series items', () => {
      const seriesItem: BookListItem = {
        type: 'series',
        series: mockSeriesWithProgress[0],
        books: [],
      };

      expect(getBookListItemKey(seriesItem)).toBe('series-series-hp');
    });

    it('should generate unique keys for different items', () => {
      const items: BookListItem[] = [
        { type: 'book', book: createBook({ id: 'book-1' }) },
        { type: 'book', book: createBook({ id: 'book-2' }) },
        { type: 'series', series: mockSeriesWithProgress[0], books: [] },
        { type: 'series', series: mockSeriesWithProgress[1], books: [] },
      ];

      const keys = items.map(getBookListItemKey);
      const uniqueKeys = new Set(keys);

      expect(uniqueKeys.size).toBe(items.length);
    });
  });
});
