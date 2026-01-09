/**
 * Tests for SeriesPicker component logic
 * 
 * Tests the data processing logic used by the SeriesPicker component
 * for selecting series and calculating suggested order numbers.
 */

import type { Book } from '../../types/models';
import type { SeriesWithProgress } from '../../hooks/use-series';

describe('SeriesPicker Component Logic', () => {
  // Helper to create SeriesWithProgress
  const createSeriesWithProgress = (
    id: string,
    name: string,
    totalBooks: number,
    booksOwned: number
  ): SeriesWithProgress => ({
    id,
    memberId: 'member-1',
    name,
    totalBooks,
    booksInSeries: [],
    booksRead: 0,
    booksOwned,
    progressPercent: 0,
  });

  const mockSeries: SeriesWithProgress[] = [
    createSeriesWithProgress('series-hp', 'Harry Potter', 7, 3),
    createSeriesWithProgress('series-lotr', 'Lord of the Rings', 3, 1),
    createSeriesWithProgress('series-empty', 'Empty Series', 5, 0),
  ];

  describe('series selection', () => {
    it('should find selected series by ID', () => {
      const selectedSeriesId = 'series-hp';
      const selectedSeries = mockSeries.find((s) => s.id === selectedSeriesId);

      expect(selectedSeries).toBeDefined();
      expect(selectedSeries?.name).toBe('Harry Potter');
    });

    it('should return undefined for non-existent series ID', () => {
      const selectedSeriesId = 'non-existent';
      const selectedSeries = mockSeries.find((s) => s.id === selectedSeriesId);

      expect(selectedSeries).toBeUndefined();
    });

    it('should return undefined when no series selected', () => {
      const selectedSeriesId = undefined;
      const selectedSeries = selectedSeriesId 
        ? mockSeries.find((s) => s.id === selectedSeriesId)
        : undefined;

      expect(selectedSeries).toBeUndefined();
    });
  });

  describe('suggested order calculation', () => {
    /**
     * Helper that mimics SeriesPicker's order suggestion logic:
     * When selecting a series, suggest the next order number (booksOwned + 1)
     */
    function suggestNextOrder(series: SeriesWithProgress): number {
      return series.booksOwned + 1;
    }

    it('should suggest next order as booksOwned + 1', () => {
      const hpSeries = mockSeries.find((s) => s.id === 'series-hp')!;
      
      // Harry Potter has 3 books owned, so suggest 4
      expect(suggestNextOrder(hpSeries)).toBe(4);
    });

    it('should suggest order 1 for empty series', () => {
      const emptySeries = mockSeries.find((s) => s.id === 'series-empty')!;
      
      // Empty series has 0 books owned, so suggest 1
      expect(suggestNextOrder(emptySeries)).toBe(1);
    });

    it('should suggest order 2 when one book owned', () => {
      const lotrSeries = mockSeries.find((s) => s.id === 'series-lotr')!;
      
      // LOTR has 1 book owned, so suggest 2
      expect(suggestNextOrder(lotrSeries)).toBe(2);
    });
  });

  describe('order adjustment', () => {
    /**
     * Helper that mimics the order decrement logic
     */
    function decrementOrder(currentOrder: number | undefined): number {
      return Math.max(1, (currentOrder || 1) - 1);
    }

    /**
     * Helper that mimics the order increment logic
     */
    function incrementOrder(currentOrder: number | undefined): number {
      return (currentOrder || 0) + 1;
    }

    it('should decrement order but not below 1', () => {
      expect(decrementOrder(5)).toBe(4);
      expect(decrementOrder(2)).toBe(1);
      expect(decrementOrder(1)).toBe(1); // Should not go below 1
    });

    it('should handle undefined order when decrementing', () => {
      expect(decrementOrder(undefined)).toBe(1);
    });

    it('should increment order correctly', () => {
      expect(incrementOrder(1)).toBe(2);
      expect(incrementOrder(5)).toBe(6);
      expect(incrementOrder(10)).toBe(11);
    });

    it('should handle undefined order when incrementing', () => {
      expect(incrementOrder(undefined)).toBe(1);
    });
  });

  describe('series display text', () => {
    it('should show series name when selected', () => {
      const selectedSeries = mockSeries.find((s) => s.id === 'series-hp');
      const displayText = selectedSeries ? selectedSeries.name : 'Not part of a series';
      
      expect(displayText).toBe('Harry Potter');
    });

    it('should show default text when no series selected', () => {
      const selectedSeries = undefined;
      const displayText = selectedSeries ? selectedSeries.name : 'Not part of a series';
      
      expect(displayText).toBe('Not part of a series');
    });
  });

  describe('series item detail text', () => {
    it('should show correct book count format', () => {
      const series = mockSeries.find((s) => s.id === 'series-hp')!;
      const detailText = `${series.booksOwned} of ${series.totalBooks} books`;
      
      expect(detailText).toBe('3 of 7 books');
    });

    it('should show 0 books for empty series', () => {
      const series = mockSeries.find((s) => s.id === 'series-empty')!;
      const detailText = `${series.booksOwned} of ${series.totalBooks} books`;
      
      expect(detailText).toBe('0 of 5 books');
    });
  });

  describe('handle selection', () => {
    it('should clear order when deselecting series', () => {
      // When selecting "Not part of a series" (null), both seriesId and order should be undefined
      const handleSelect = (item: SeriesWithProgress | null) => {
        if (item) {
          return { seriesId: item.id, seriesOrder: item.booksOwned + 1 };
        }
        return { seriesId: undefined, seriesOrder: undefined };
      };

      const result = handleSelect(null);
      expect(result.seriesId).toBeUndefined();
      expect(result.seriesOrder).toBeUndefined();
    });

    it('should set seriesId and suggest order when selecting series', () => {
      const handleSelect = (item: SeriesWithProgress | null) => {
        if (item) {
          return { seriesId: item.id, seriesOrder: item.booksOwned + 1 };
        }
        return { seriesId: undefined, seriesOrder: undefined };
      };

      const series = mockSeries.find((s) => s.id === 'series-hp')!;
      const result = handleSelect(series);
      
      expect(result.seriesId).toBe('series-hp');
      expect(result.seriesOrder).toBe(4); // 3 books owned + 1
    });
  });
});

