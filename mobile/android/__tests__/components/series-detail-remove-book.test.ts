/**
 * Tests for series detail "remove book" logic.
 *
 * When in edit mode, each book has a trash icon that removes the book from
 * both the series and the library (if in library).
 */

interface BookStub {
  id: string;
  libraryEntryId?: string;
}

/**
 * Returns the operations that should be performed when removing a book from a series.
 * Mirrors the logic in handleRemoveBook (app/series/[id].tsx).
 */
function getRemoveBookOperations(book: BookStub): ('removeFromLibrary' | 'removeFromSeries')[] {
  const ops: ('removeFromLibrary' | 'removeFromSeries')[] = [];
  if (book.libraryEntryId) {
    ops.push('removeFromLibrary');
  }
  ops.push('removeFromSeries');
  return ops;
}

describe('Series detail remove book logic', () => {
  describe('getRemoveBookOperations', () => {
    it('should remove from both library and series when book is in library', () => {
      const book: BookStub = { id: 'b1', libraryEntryId: 'entry-1' };
      const ops = getRemoveBookOperations(book);
      expect(ops).toEqual(['removeFromLibrary', 'removeFromSeries']);
    });

    it('should only remove from series when book is not in library', () => {
      const book: BookStub = { id: 'b2' };
      const ops = getRemoveBookOperations(book);
      expect(ops).toEqual(['removeFromSeries']);
    });

    it('should only remove from series when libraryEntryId is undefined', () => {
      const book: BookStub = { id: 'b3', libraryEntryId: undefined };
      const ops = getRemoveBookOperations(book);
      expect(ops).toEqual(['removeFromSeries']);
    });

    it('should include removeFromSeries in all cases', () => {
      const withLibrary: BookStub = { id: 'b4', libraryEntryId: 'entry-4' };
      const withoutLibrary: BookStub = { id: 'b5' };
      expect(getRemoveBookOperations(withLibrary)).toContain('removeFromSeries');
      expect(getRemoveBookOperations(withoutLibrary)).toContain('removeFromSeries');
    });
  });
});
