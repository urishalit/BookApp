/**
 * Tests for series detail "lazy add" logic.
 *
 * When a series is already in the user's library (at least one book owned),
 * tapping a book that isn't in the library should auto-add it silently.
 * When the series is NOT in the library, a prompt should be shown.
 */

interface BookStub {
  id: string;
  isInLibrary: boolean;
  libraryEntryId?: string;
}

/**
 * Determines the action to take when a book in a series is tapped.
 * Mirrors the logic in handleBookPress (app/series/[id].tsx).
 */
function getBookPressAction(
  book: BookStub,
  seriesIsInLibrary: boolean
): 'navigate' | 'auto-add' | 'prompt' {
  if (book.isInLibrary && book.libraryEntryId) return 'navigate';
  if (seriesIsInLibrary) return 'auto-add';
  return 'prompt';
}

/**
 * Determines whether a series is in the library.
 * A series is considered in library when at least one book is owned by the member.
 */
function computeSeriesIsInLibrary(books: BookStub[]): boolean {
  return books.some((b) => b.isInLibrary);
}

describe('Series detail lazy add logic', () => {
  describe('getBookPressAction', () => {
    it('should navigate when book is already in library', () => {
      const book: BookStub = { id: 'b1', isInLibrary: true, libraryEntryId: 'entry-1' };
      expect(getBookPressAction(book, true)).toBe('navigate');
      expect(getBookPressAction(book, false)).toBe('navigate');
    });

    it('should auto-add when book is NOT in library but series IS in library', () => {
      const book: BookStub = { id: 'b2', isInLibrary: false };
      expect(getBookPressAction(book, true)).toBe('auto-add');
    });

    it('should prompt when book is NOT in library and series is NOT in library', () => {
      const book: BookStub = { id: 'b3', isInLibrary: false };
      expect(getBookPressAction(book, false)).toBe('prompt');
    });

    it('should auto-add when isInLibrary is true but libraryEntryId is missing (edge case)', () => {
      // isInLibrary true but no libraryEntryId - treat as not truly in library
      const book: BookStub = { id: 'b4', isInLibrary: true, libraryEntryId: undefined };
      expect(getBookPressAction(book, true)).toBe('auto-add');
    });
  });

  describe('computeSeriesIsInLibrary', () => {
    it('should return true when at least one book is in library', () => {
      const books: BookStub[] = [
        { id: 'b1', isInLibrary: true, libraryEntryId: 'e1' },
        { id: 'b2', isInLibrary: false },
        { id: 'b3', isInLibrary: false },
      ];
      expect(computeSeriesIsInLibrary(books)).toBe(true);
    });

    it('should return false when no books are in library', () => {
      const books: BookStub[] = [
        { id: 'b1', isInLibrary: false },
        { id: 'b2', isInLibrary: false },
      ];
      expect(computeSeriesIsInLibrary(books)).toBe(false);
    });

    it('should return false for empty books array', () => {
      expect(computeSeriesIsInLibrary([])).toBe(false);
    });

    it('should return true when all books are in library', () => {
      const books: BookStub[] = [
        { id: 'b1', isInLibrary: true, libraryEntryId: 'e1' },
        { id: 'b2', isInLibrary: true, libraryEntryId: 'e2' },
      ];
      expect(computeSeriesIsInLibrary(books)).toBe(true);
    });
  });
});
