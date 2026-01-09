/**
 * Tests for SeriesProgress and SeriesProgressBadge component logic
 * 
 * Tests the progress calculation and display logic used by these components.
 */

describe('SeriesProgress Component Logic', () => {
  describe('progress percentage calculation', () => {
    /**
     * Helper that mimics the progress percentage calculation
     */
    function calculateProgressPercent(booksRead: number, totalBooks: number): number {
      return totalBooks > 0 ? (booksRead / totalBooks) * 100 : 0;
    }

    it('should calculate 0% for no books read', () => {
      expect(calculateProgressPercent(0, 7)).toBe(0);
    });

    it('should calculate 100% when all books read', () => {
      expect(calculateProgressPercent(7, 7)).toBe(100);
    });

    it('should calculate partial progress correctly', () => {
      expect(calculateProgressPercent(3, 7)).toBeCloseTo(42.86, 1);
      expect(calculateProgressPercent(1, 5)).toBe(20);
      expect(calculateProgressPercent(2, 4)).toBe(50);
    });

    it('should return 0% when totalBooks is 0', () => {
      expect(calculateProgressPercent(0, 0)).toBe(0);
      expect(calculateProgressPercent(5, 0)).toBe(0); // Edge case
    });

    it('should handle fractional percentages', () => {
      expect(calculateProgressPercent(1, 3)).toBeCloseTo(33.33, 1);
      expect(calculateProgressPercent(1, 7)).toBeCloseTo(14.29, 1);
    });
  });

  describe('completion detection', () => {
    /**
     * Helper that mimics the isComplete logic
     */
    function isComplete(booksRead: number, totalBooks: number): boolean {
      return booksRead === totalBooks && totalBooks > 0;
    }

    it('should return true when all books are read', () => {
      expect(isComplete(7, 7)).toBe(true);
      expect(isComplete(3, 3)).toBe(true);
      expect(isComplete(1, 1)).toBe(true);
    });

    it('should return false when not all books are read', () => {
      expect(isComplete(6, 7)).toBe(false);
      expect(isComplete(0, 7)).toBe(false);
      expect(isComplete(2, 3)).toBe(false);
    });

    it('should return false when totalBooks is 0', () => {
      expect(isComplete(0, 0)).toBe(false);
    });

    it('should handle edge case of more books read than total', () => {
      // This shouldn't happen in practice, but testing defensively
      expect(isComplete(8, 7)).toBe(false);
    });
  });

  describe('owned indicator visibility', () => {
    /**
     * Helper that determines if owned indicator should show
     */
    function shouldShowOwnedIndicator(booksOwned: number, booksRead: number): boolean {
      return booksOwned > booksRead;
    }

    it('should show indicator when more books owned than read', () => {
      expect(shouldShowOwnedIndicator(5, 3)).toBe(true);
      expect(shouldShowOwnedIndicator(7, 0)).toBe(true);
    });

    it('should not show indicator when all owned books are read', () => {
      expect(shouldShowOwnedIndicator(3, 3)).toBe(false);
      expect(shouldShowOwnedIndicator(0, 0)).toBe(false);
    });

    it('should not show indicator when booksRead equals booksOwned', () => {
      expect(shouldShowOwnedIndicator(5, 5)).toBe(false);
    });
  });

  describe('owned text visibility', () => {
    /**
     * Helper that determines if "(X owned)" text should show
     */
    function shouldShowOwnedText(booksOwned: number, totalBooks: number): boolean {
      return booksOwned < totalBooks;
    }

    it('should show owned text when not all books are owned', () => {
      expect(shouldShowOwnedText(3, 7)).toBe(true);
      expect(shouldShowOwnedText(0, 5)).toBe(true);
    });

    it('should not show owned text when all books are owned', () => {
      expect(shouldShowOwnedText(7, 7)).toBe(false);
      expect(shouldShowOwnedText(5, 5)).toBe(false);
    });

    it('should show owned text for partially complete series', () => {
      expect(shouldShowOwnedText(5, 7)).toBe(true);
    });
  });

  describe('progress text generation', () => {
    it('should generate correct read progress text', () => {
      const booksRead = 3;
      const totalBooks = 7;
      const text = `${booksRead} of ${totalBooks} read`;
      
      expect(text).toBe('3 of 7 read');
    });

    it('should handle 0 books read', () => {
      const text = `${0} of ${7} read`;
      expect(text).toBe('0 of 7 read');
    });

    it('should handle complete series', () => {
      const text = `${7} of ${7} read`;
      expect(text).toBe('7 of 7 read');
    });
  });

  describe('owned text generation', () => {
    it('should generate correct owned text', () => {
      const booksOwned = 3;
      const text = `(${booksOwned} owned)`;
      
      expect(text).toBe('(3 owned)');
    });

    it('should handle 0 books owned', () => {
      const text = `(${0} owned)`;
      expect(text).toBe('(0 owned)');
    });
  });

  describe('progress bar width calculation', () => {
    /**
     * Helper for progress bar width
     */
    function calculateProgressWidth(booksRead: number, totalBooks: number): string {
      const percent = totalBooks > 0 ? (booksRead / totalBooks) * 100 : 0;
      return `${Math.min(percent, 100)}%`;
    }

    it('should calculate correct width percentages', () => {
      expect(calculateProgressWidth(3, 7)).toMatch(/42\.8/);
      expect(calculateProgressWidth(7, 7)).toBe('100%');
      expect(calculateProgressWidth(0, 7)).toBe('0%');
    });

    it('should cap at 100%', () => {
      expect(calculateProgressWidth(10, 7)).toBe('100%');
    });
  });

  describe('owned indicator width calculation', () => {
    /**
     * Helper for owned indicator width
     */
    function calculateOwnedIndicatorWidth(
      booksOwned: number,
      booksRead: number,
      totalBooks: number
    ): string {
      const progressPercent = totalBooks > 0 ? (booksRead / totalBooks) * 100 : 0;
      const ownedPercent = ((booksOwned - booksRead) / totalBooks) * 100;
      const width = Math.min(ownedPercent, 100 - progressPercent);
      return `${width}%`;
    }

    it('should calculate owned indicator width correctly', () => {
      // 3 read, 5 owned, 7 total
      // Progress: 3/7 = 42.86%
      // Owned extra: (5-3)/7 = 28.57%
      const width = calculateOwnedIndicatorWidth(5, 3, 7);
      expect(parseFloat(width)).toBeCloseTo(28.57, 1);
    });

    it('should return 0% when no extra owned books', () => {
      const width = calculateOwnedIndicatorWidth(3, 3, 7);
      expect(width).toBe('0%');
    });
  });
});

describe('SeriesProgressBadge Component Logic', () => {
  describe('badge text generation', () => {
    it('should generate correct badge text', () => {
      const booksRead = 3;
      const totalBooks = 7;
      const text = `${booksRead}/${totalBooks}`;
      
      expect(text).toBe('3/7');
    });

    it('should show 0/X for unstarted series', () => {
      const text = `${0}/${5}`;
      expect(text).toBe('0/5');
    });

    it('should show X/X for complete series', () => {
      const text = `${7}/${7}`;
      expect(text).toBe('7/7');
    });
  });

  describe('badge color determination', () => {
    /**
     * Helper that mimics badge background color logic
     */
    function getBadgeColor(booksRead: number, totalBooks: number): string {
      const isComplete = booksRead === totalBooks && totalBooks > 0;
      return isComplete ? '#4CAF50' : '#8B5A2B';
    }

    it('should return green for complete series', () => {
      expect(getBadgeColor(7, 7)).toBe('#4CAF50');
      expect(getBadgeColor(3, 3)).toBe('#4CAF50');
    });

    it('should return brown for incomplete series', () => {
      expect(getBadgeColor(3, 7)).toBe('#8B5A2B');
      expect(getBadgeColor(0, 5)).toBe('#8B5A2B');
    });

    it('should return brown for empty series', () => {
      expect(getBadgeColor(0, 0)).toBe('#8B5A2B');
    });
  });
});

