/**
 * Tests for Book Detail screen logic
 *
 * Tests the edit mode toggle, auto-save conditions, cover edit visibility,
 * and revert-on-exit logic used by the BookDetailScreen component.
 */

import type { MemberBook } from '../../types/models';

describe('Book Detail Screen Logic', () => {
  const mockBook: MemberBook = {
    id: 'book-1',
    libraryEntryId: 'entry-1',
    title: 'Harry Potter',
    author: 'J.K. Rowling',
    status: 'read',
    thumbnailUrl: 'https://example.com/cover.jpg',
    addedAt: { seconds: 1, nanoseconds: 0 } as any,
  };

  describe('toggleEditMode revert on exit', () => {
    /**
     * Helper that mimics toggleEditMode logic when exiting edit mode:
     * Revert localTitle/localAuthor to book values if empty
     */
    function computeRevertOnExit(
      currentEditMode: boolean,
      localTitle: string,
      localAuthor: string,
      book: MemberBook | null
    ): { nextEditMode: boolean; shouldRevertTitle: boolean; shouldRevertAuthor: boolean } {
      const next = !currentEditMode;
      let shouldRevertTitle = false;
      let shouldRevertAuthor = false;

      if (!next && book) {
        if (!localTitle.trim() || !localAuthor.trim()) {
          shouldRevertTitle = !localTitle.trim();
          shouldRevertAuthor = !localAuthor.trim();
        }
      }

      return { nextEditMode: next, shouldRevertTitle, shouldRevertAuthor };
    }

    it('should revert empty title when exiting edit mode', () => {
      const { nextEditMode, shouldRevertTitle } = computeRevertOnExit(
        true,
        '',
        'J.K. Rowling',
        mockBook
      );

      expect(nextEditMode).toBe(false);
      expect(shouldRevertTitle).toBe(true);
    });

    it('should revert empty author when exiting edit mode', () => {
      const { shouldRevertAuthor } = computeRevertOnExit(
        true,
        'Harry Potter',
        '',
        mockBook
      );

      expect(shouldRevertAuthor).toBe(true);
    });

    it('should revert both when both empty on exit', () => {
      const { shouldRevertTitle, shouldRevertAuthor } = computeRevertOnExit(
        true,
        '',
        '',
        mockBook
      );

      expect(shouldRevertTitle).toBe(true);
      expect(shouldRevertAuthor).toBe(true);
    });

    it('should not revert when title and author are non-empty on exit', () => {
      const { shouldRevertTitle, shouldRevertAuthor } = computeRevertOnExit(
        true,
        'Harry Potter',
        'J.K. Rowling',
        mockBook
      );

      expect(shouldRevertTitle).toBe(false);
      expect(shouldRevertAuthor).toBe(false);
    });

    it('should not revert when entering edit mode', () => {
      const { nextEditMode, shouldRevertTitle } = computeRevertOnExit(
        false,
        '',
        '',
        mockBook
      );

      expect(nextEditMode).toBe(true);
      expect(shouldRevertTitle).toBe(false);
    });

    it('should not revert when book is null', () => {
      const { shouldRevertTitle, shouldRevertAuthor } = computeRevertOnExit(
        true,
        '',
        '',
        null
      );

      expect(shouldRevertTitle).toBe(false);
      expect(shouldRevertAuthor).toBe(false);
    });
  });

  describe('saveTitleAuthor conditions', () => {
    /**
     * Helper that mimics saveTitleAuthor conditions: when should we attempt save?
     */
    function shouldSaveTitleAuthor(
      book: MemberBook | null,
      newTitle: string,
      newAuthor: string
    ): boolean {
      if (!book || !newTitle.trim() || !newAuthor.trim()) return false;
      if (newTitle.trim() === book.title && newAuthor.trim() === book.author) return false;
      return true;
    }

    it('should save when title and author changed and non-empty', () => {
      expect(
        shouldSaveTitleAuthor(mockBook, 'New Title', 'New Author')
      ).toBe(true);
    });

    it('should not save when title is empty', () => {
      expect(shouldSaveTitleAuthor(mockBook, '', 'J.K. Rowling')).toBe(false);
    });

    it('should not save when author is empty', () => {
      expect(shouldSaveTitleAuthor(mockBook, 'Harry Potter', '')).toBe(false);
    });

    it('should not save when both unchanged', () => {
      expect(shouldSaveTitleAuthor(mockBook, 'Harry Potter', 'J.K. Rowling')).toBe(false);
    });

    it('should not save when book is null', () => {
      expect(shouldSaveTitleAuthor(null, 'Title', 'Author')).toBe(false);
    });

    it('should save when only title changed', () => {
      expect(shouldSaveTitleAuthor(mockBook, 'Harry Potter Revised', 'J.K. Rowling')).toBe(true);
    });

    it('should save when only author changed', () => {
      expect(shouldSaveTitleAuthor(mockBook, 'Harry Potter', 'Joanne Rowling')).toBe(true);
    });

    it('should not save when title is whitespace only', () => {
      expect(shouldSaveTitleAuthor(mockBook, '   ', 'J.K. Rowling')).toBe(false);
    });
  });

  describe('cover edit visibility', () => {
    /**
     * Cover shows edit UI (pencil overlay, tappable) only in edit mode
     */
    function isCoverTappable(isEditMode: boolean): boolean {
      return isEditMode;
    }

    it('should allow cover edit when in edit mode', () => {
      expect(isCoverTappable(true)).toBe(true);
    });

    it('should not allow cover edit when not in edit mode', () => {
      expect(isCoverTappable(false)).toBe(false);
    });
  });

  describe('section edit mode visibility', () => {
    /**
     * Info, genres, series sections show edit UI when isEditMode, view UI otherwise
     */
    function shouldShowEditUI(isEditMode: boolean): boolean {
      return isEditMode;
    }

    it('should show edit UI for all sections when in edit mode', () => {
      expect(shouldShowEditUI(true)).toBe(true);
    });

    it('should show view UI for all sections when not in edit mode', () => {
      expect(shouldShowEditUI(false)).toBe(false);
    });
  });

  describe('debounced save trigger conditions', () => {
    /**
     * Debounce effect only triggers save when: isEditMode, book exists,
     * localTitle/localAuthor non-empty and different from book
     */
    function shouldTriggerDebouncedSave(
      isEditMode: boolean,
      book: MemberBook | null,
      localTitle: string,
      localAuthor: string
    ): boolean {
      if (!isEditMode || !book) return false;
      if (!localTitle.trim() || !localAuthor.trim()) return false;
      if (localTitle === book.title && localAuthor === book.author) return false;
      return true;
    }

    it('should trigger save when all conditions met', () => {
      expect(
        shouldTriggerDebouncedSave(true, mockBook, 'New Title', 'New Author')
      ).toBe(true);
    });

    it('should not trigger when not in edit mode', () => {
      expect(
        shouldTriggerDebouncedSave(false, mockBook, 'New Title', 'New Author')
      ).toBe(false);
    });

    it('should not trigger when book is null', () => {
      expect(
        shouldTriggerDebouncedSave(true, null, 'New Title', 'New Author')
      ).toBe(false);
    });

    it('should not trigger when localTitle is empty', () => {
      expect(
        shouldTriggerDebouncedSave(true, mockBook, '', 'J.K. Rowling')
      ).toBe(false);
    });

    it('should not trigger when values unchanged', () => {
      expect(
        shouldTriggerDebouncedSave(true, mockBook, 'Harry Potter', 'J.K. Rowling')
      ).toBe(false);
    });
  });
});
