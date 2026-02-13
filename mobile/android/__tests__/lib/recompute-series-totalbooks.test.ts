/**
 * Tests for computeSeriesTotalBooksFromBooks logic (used by recomputeSeriesTotalBooks).
 */

import {
  computeSeriesTotalBooksFromBooks,
  recomputeSeriesTotalBooks,
} from '../../lib/firestore';

describe('computeSeriesTotalBooksFromBooks', () => {
  it('should return 0 for empty series', () => {
    expect(computeSeriesTotalBooksFromBooks([])).toBe(0);
  });

  it('should return max(seriesOrder) when books have orders 1, 3, 5', () => {
    const books = [
      { seriesOrder: 1 },
      { seriesOrder: 3 },
      { seriesOrder: 5 },
    ];
    expect(computeSeriesTotalBooksFromBooks(books)).toBe(5);
  });

  it('should handle books with undefined seriesOrder', () => {
    const books = [
      { seriesOrder: 2 },
      {},
      { seriesOrder: 4 },
    ] as { seriesOrder?: number }[];
    expect(computeSeriesTotalBooksFromBooks(books)).toBe(4);
  });

  it('should return the only order when single book', () => {
    expect(computeSeriesTotalBooksFromBooks([{ seriesOrder: 7 }])).toBe(7);
  });
});

describe('recomputeSeriesTotalBooks', () => {
  it('should run without error and update series', async () => {
    await recomputeSeriesTotalBooks('family-123', 'series-123');
    expect(async () => {
      await recomputeSeriesTotalBooks('family-123', 'series-123');
    }).not.toThrow();
  });
});
