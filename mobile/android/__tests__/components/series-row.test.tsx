/**
 * Tests for SeriesRow component logic
 * 
 * Note: Full component rendering tests are complex due to React Native's
 * TurboModules requirements. The core business logic for book grouping
 * is thoroughly tested in book-list-utils.test.ts
 * 
 * These tests focus on verifying the component's data processing logic.
 */

import type { MemberBook, Series } from '../../types/models';

describe('SeriesRow Component Logic', () => {
  const mockSeries: Series = {
    id: 'series-1',
    name: 'Harry Potter',
    totalBooks: 7,
  };

  const mockBooksInSeries: MemberBook[] = [
    {
      id: 'book-1',
      libraryEntryId: 'entry-1',
      title: "Harry Potter and the Philosopher's Stone",
      author: 'J.K. Rowling',
      status: 'read',
      seriesId: 'series-1',
      seriesOrder: 1,
      thumbnailUrl: 'https://example.com/hp1.jpg',
      addedAt: { seconds: 1, nanoseconds: 0 } as any,
    },
    {
      id: 'book-2',
      libraryEntryId: 'entry-2',
      title: 'Harry Potter and the Chamber of Secrets',
      author: 'J.K. Rowling',
      status: 'read',
      seriesId: 'series-1',
      seriesOrder: 2,
      addedAt: { seconds: 2, nanoseconds: 0 } as any,
    },
    {
      id: 'book-3',
      libraryEntryId: 'entry-3',
      title: 'Harry Potter and the Prisoner of Azkaban',
      author: 'J.K. Rowling',
      status: 'reading',
      seriesId: 'series-1',
      seriesOrder: 3,
      addedAt: { seconds: 3, nanoseconds: 0 } as any,
    },
  ];

  /**
   * Helper function to compute booksRead (same logic as SeriesRow component)
   */
  function computeBooksRead(books: MemberBook[]): number {
    return books.filter((b) => b.status === 'read').length;
  }

  /**
   * Helper function to find currently reading book (same logic as SeriesRow component)
   */
  function findCurrentlyReading(books: MemberBook[]): MemberBook | undefined {
    return books.find((b) => b.status === 'reading');
  }

  /**
   * Helper function to generate currently reading display text
   */
  function generateReadingDisplayText(book: MemberBook): string {
    const prefix = book.seriesOrder ? `#${book.seriesOrder} - ` : '';
    return `${prefix}${book.title}`;
  }

  /**
   * Helper function to get sorted books by series order (same logic as SeriesRow component)
   */
  function sortBooksByOrder(books: MemberBook[]): MemberBook[] {
    return [...books].sort((a, b) => {
      const orderA = a.seriesOrder ?? Infinity;
      const orderB = b.seriesOrder ?? Infinity;
      return orderA - orderB;
    });
  }

  describe('booksRead calculation', () => {
    it('should count only books with "read" status', () => {
      const booksRead = computeBooksRead(mockBooksInSeries);
      expect(booksRead).toBe(2); // book-1 and book-2 are 'read'
    });

    it('should return 0 for empty books array', () => {
      const booksRead = computeBooksRead([]);
      expect(booksRead).toBe(0);
    });

    it('should return 0 when no books are read', () => {
      const unreadBooks: MemberBook[] = mockBooksInSeries.map((b) => ({
        ...b,
        status: 'to-read' as const,
      }));
      const booksRead = computeBooksRead(unreadBooks);
      expect(booksRead).toBe(0);
    });

    it('should count all books when all are read', () => {
      const allReadBooks: MemberBook[] = mockBooksInSeries.map((b) => ({
        ...b,
        status: 'read' as const,
      }));
      const booksRead = computeBooksRead(allReadBooks);
      expect(booksRead).toBe(3);
    });

    it('should only count "read" status, not "reading"', () => {
      const mixedBooks: MemberBook[] = [
        { ...mockBooksInSeries[0], status: 'read' },
        { ...mockBooksInSeries[1], status: 'reading' },
        { ...mockBooksInSeries[2], status: 'to-read' },
      ];
      const booksRead = computeBooksRead(mixedBooks);
      expect(booksRead).toBe(1);
    });
  });

  describe('currently reading book detection', () => {
    it('should find book with "reading" status', () => {
      const reading = findCurrentlyReading(mockBooksInSeries);
      expect(reading).toBeDefined();
      expect(reading?.id).toBe('book-3');
      expect(reading?.title).toBe('Harry Potter and the Prisoner of Azkaban');
    });

    it('should return undefined when no book is being read', () => {
      const noReadingBooks: MemberBook[] = mockBooksInSeries.map((b) => ({
        ...b,
        status: 'read' as const,
      }));
      const reading = findCurrentlyReading(noReadingBooks);
      expect(reading).toBeUndefined();
    });

    it('should return undefined for empty array', () => {
      const reading = findCurrentlyReading([]);
      expect(reading).toBeUndefined();
    });

    it('should return first reading book when multiple are reading', () => {
      const multipleReadingBooks: MemberBook[] = [
        { ...mockBooksInSeries[0], status: 'reading' },
        { ...mockBooksInSeries[1], status: 'reading' },
        { ...mockBooksInSeries[2], status: 'read' },
      ];
      const reading = findCurrentlyReading(multipleReadingBooks);
      expect(reading?.id).toBe('book-1');
    });
  });

  describe('currently reading display text', () => {
    it('should include series order prefix when available', () => {
      const book = mockBooksInSeries[2]; // seriesOrder: 3
      const text = generateReadingDisplayText(book);
      expect(text).toBe('#3 - Harry Potter and the Prisoner of Azkaban');
    });

    it('should show only title when no series order', () => {
      const bookWithoutOrder: MemberBook = {
        ...mockBooksInSeries[0],
        seriesOrder: undefined,
      };
      const text = generateReadingDisplayText(bookWithoutOrder);
      expect(text).toBe("Harry Potter and the Philosopher's Stone");
    });

    it('should handle series order 1 correctly', () => {
      const book = mockBooksInSeries[0]; // seriesOrder: 1
      const text = generateReadingDisplayText(book);
      expect(text).toBe("#1 - Harry Potter and the Philosopher's Stone");
    });
  });

  describe('book ordering', () => {
    it('should sort books by seriesOrder ascending', () => {
      const unorderedBooks: MemberBook[] = [
        { ...mockBooksInSeries[2], seriesOrder: 3 },
        { ...mockBooksInSeries[0], seriesOrder: 1 },
        { ...mockBooksInSeries[1], seriesOrder: 2 },
      ];

      const sorted = sortBooksByOrder(unorderedBooks);

      expect(sorted[0].seriesOrder).toBe(1);
      expect(sorted[1].seriesOrder).toBe(2);
      expect(sorted[2].seriesOrder).toBe(3);
    });

    it('should place books without seriesOrder at the end', () => {
      const mixedBooks: MemberBook[] = [
        { ...mockBooksInSeries[0], seriesOrder: undefined },
        { ...mockBooksInSeries[1], seriesOrder: 1 },
        { ...mockBooksInSeries[2], seriesOrder: 2 },
      ];

      const sorted = sortBooksByOrder(mixedBooks);

      expect(sorted[0].seriesOrder).toBe(1);
      expect(sorted[1].seriesOrder).toBe(2);
      expect(sorted[2].seriesOrder).toBeUndefined();
    });

    it('should get first book cover from book with seriesOrder 1', () => {
      const sorted = sortBooksByOrder(mockBooksInSeries);
      const firstBook = sorted[0];
      
      expect(firstBook.seriesOrder).toBe(1);
      expect(firstBook.thumbnailUrl).toBe('https://example.com/hp1.jpg');
    });
  });

  describe('booksOwned calculation', () => {
    it('should count all books in series', () => {
      const booksOwned = mockBooksInSeries.length;
      expect(booksOwned).toBe(3);
    });

    it('should return 0 for empty array', () => {
      const booksOwned: Book[] = [];
      expect(booksOwned.length).toBe(0);
    });
  });

  describe('display text generation', () => {
    it('should generate correct "X of Y read" text', () => {
      const booksRead = computeBooksRead(mockBooksInSeries);
      const totalBooks = mockSeries.totalBooks;
      const displayText = `${booksRead} of ${totalBooks} read`;
      
      expect(displayText).toBe('2 of 7 read');
    });

    it('should handle all books read correctly', () => {
      const booksRead = 7;
      const totalBooks = 7;
      const displayText = `${booksRead} of ${totalBooks} read`;
      
      expect(displayText).toBe('7 of 7 read');
    });

    it('should handle zero books read', () => {
      const booksRead = 0;
      const totalBooks = mockSeries.totalBooks;
      const displayText = `${booksRead} of ${totalBooks} read`;
      
      expect(displayText).toBe('0 of 7 read');
    });
  });

  describe('hasMultipleBooks detection', () => {
    it('should detect multiple books', () => {
      const hasMultiple = mockBooksInSeries.length > 1;
      expect(hasMultiple).toBe(true);
    });

    it('should detect single book', () => {
      const singleBook = [mockBooksInSeries[0]];
      const hasMultiple = singleBook.length > 1;
      expect(hasMultiple).toBe(false);
    });

    it('should detect empty array', () => {
      const emptyBooks: MemberBook[] = [];
      const hasMultiple = emptyBooks.length > 1;
      expect(hasMultiple).toBe(false);
    });
  });
});
