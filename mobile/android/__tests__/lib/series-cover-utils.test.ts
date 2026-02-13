/**
 * Tests for series cover resolution utilities.
 * Verifies getSeriesCoverFromBooks returns the first book with a cover, sorted by seriesOrder.
 */

import { getSeriesCoverFromBooks } from '../../lib/series-cover-utils';

describe('getSeriesCoverFromBooks', () => {
  it('should return first book with cover when sorted by seriesOrder', () => {
    const books = [
      { seriesOrder: 1, thumbnailUrl: 'https://example.com/book1.jpg' },
      { seriesOrder: 2, thumbnailUrl: undefined },
      { seriesOrder: 3, thumbnailUrl: 'https://example.com/book3.jpg' },
    ];
    expect(getSeriesCoverFromBooks(books)).toBe('https://example.com/book1.jpg');
  });

  it('should return second book when first has no cover', () => {
    const books = [
      { seriesOrder: 1, thumbnailUrl: undefined },
      { seriesOrder: 2, thumbnailUrl: 'https://example.com/book2.jpg' },
      { seriesOrder: 3, thumbnailUrl: 'https://example.com/book3.jpg' },
    ];
    expect(getSeriesCoverFromBooks(books)).toBe('https://example.com/book2.jpg');
  });

  it('should return undefined for empty array', () => {
    expect(getSeriesCoverFromBooks([])).toBeUndefined();
  });

  it('should return undefined when no books have covers', () => {
    const books = [
      { seriesOrder: 1, thumbnailUrl: undefined },
      { seriesOrder: 2, thumbnailUrl: undefined },
    ];
    expect(getSeriesCoverFromBooks(books)).toBeUndefined();
  });

  it('should respect seriesOrder when unsorted', () => {
    const books = [
      { seriesOrder: 3, thumbnailUrl: 'https://example.com/book3.jpg' },
      { seriesOrder: 1, thumbnailUrl: 'https://example.com/book1.jpg' },
      { seriesOrder: 2, thumbnailUrl: 'https://example.com/book2.jpg' },
    ];
    expect(getSeriesCoverFromBooks(books)).toBe('https://example.com/book1.jpg');
  });

  it('should handle books without seriesOrder (treat as last)', () => {
    const books = [
      { seriesOrder: undefined, thumbnailUrl: 'https://example.com/no-order.jpg' },
      { seriesOrder: 1, thumbnailUrl: 'https://example.com/book1.jpg' },
    ];
    expect(getSeriesCoverFromBooks(books)).toBe('https://example.com/book1.jpg');
  });
});
