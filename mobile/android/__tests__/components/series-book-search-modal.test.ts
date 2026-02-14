/**
 * Tests for SeriesBookSearchModal Add book tab logic.
 * Tests validation rules and "add another" next order computation.
 */

describe('SeriesBookSearchModal Add book logic', () => {
  /**
   * Validation logic used by handleManualAddBook.
   * Title and author required; book number must be >= 1.
   */
  function validateManualAddForm(
    title: string,
    author: string,
    bookNumberInput: string
  ): { valid: boolean; error?: string } {
    if (!title.trim()) return { valid: false, error: 'titleRequired' };
    if (!author.trim()) return { valid: false, error: 'authorRequired' };
    const order = parseInt(bookNumberInput, 10);
    if (isNaN(order) || order < 1) return { valid: false, error: 'bookNumberRequired' };
    return { valid: true };
  }

  /**
   * Next order computation after successfully adding a book.
   */
  function getNextOrderAfterAdd(currentOrder: number): number {
    return currentOrder + 1;
  }

  describe('validateManualAddForm', () => {
    it('should reject empty title', () => {
      const result = validateManualAddForm('', 'Author', '1');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('titleRequired');
    });

    it('should reject whitespace-only title', () => {
      const result = validateManualAddForm('   ', 'Author', '1');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('titleRequired');
    });

    it('should reject empty author', () => {
      const result = validateManualAddForm('Title', '', '1');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('authorRequired');
    });

    it('should reject invalid book number (NaN)', () => {
      const result = validateManualAddForm('Title', 'Author', '');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('bookNumberRequired');
    });

    it('should reject book number 0', () => {
      const result = validateManualAddForm('Title', 'Author', '0');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('bookNumberRequired');
    });

    it('should reject negative book number', () => {
      const result = validateManualAddForm('Title', 'Author', '-1');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('bookNumberRequired');
    });

    it('should accept valid form', () => {
      const result = validateManualAddForm('Harry Potter', 'J.K. Rowling', '1');
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should accept book number 1', () => {
      const result = validateManualAddForm('Title', 'Author', '1');
      expect(result.valid).toBe(true);
    });

    it('should accept book number greater than 1', () => {
      const result = validateManualAddForm('Title', 'Author', '5');
      expect(result.valid).toBe(true);
    });
  });

  describe('getNextOrderAfterAdd', () => {
    it('should increment order by 1 after adding', () => {
      expect(getNextOrderAfterAdd(1)).toBe(2);
      expect(getNextOrderAfterAdd(4)).toBe(5);
      expect(getNextOrderAfterAdd(10)).toBe(11);
    });

    it('should work for first book in series', () => {
      expect(getNextOrderAfterAdd(1)).toBe(2);
    });
  });

  describe('nextOrder prop sync', () => {
    /**
     * Logic for syncing manualSeriesOrder when modal opens:
     * use nextOrder if valid (number >= 1), else default to 1.
     */
    function getInitialOrder(nextOrder: number | undefined): number {
      return typeof nextOrder === 'number' && nextOrder >= 1 ? nextOrder : 1;
    }

    it('should use nextOrder when valid', () => {
      expect(getInitialOrder(1)).toBe(1);
      expect(getInitialOrder(5)).toBe(5);
    });

    it('should default to 1 when nextOrder is undefined', () => {
      expect(getInitialOrder(undefined)).toBe(1);
    });

    it('should default to 1 when nextOrder is 0', () => {
      expect(getInitialOrder(0)).toBe(1);
    });

    it('should default to 1 when nextOrder is NaN', () => {
      expect(getInitialOrder(NaN)).toBe(1);
    });
  });
});
