/**
 * Tests for series next order computation.
 * Used when manually adding books to a series - default Book # = books.length + 1.
 */

import { computeNextSeriesOrder } from '../../lib/series-next-order';

describe('computeNextSeriesOrder', () => {
  it('should return 1 when books array is empty', () => {
    expect(computeNextSeriesOrder([])).toBe(1);
  });

  it('should return 1 when books is undefined', () => {
    expect(computeNextSeriesOrder(undefined)).toBe(1);
  });

  it('should return 1 when books is null', () => {
    expect(computeNextSeriesOrder(null)).toBe(1);
  });

  it('should return books.length + 1 for non-empty array', () => {
    expect(computeNextSeriesOrder([{ id: '1' }])).toBe(2);
    expect(computeNextSeriesOrder([{}, {}, {}])).toBe(4);
    expect(computeNextSeriesOrder(Array(9).fill(null))).toBe(10);
  });

  it('should use array length for sparse arrays', () => {
    const sparse: unknown[] = [];
    sparse[4] = 'book'; // length becomes 5
    expect(computeNextSeriesOrder(sparse)).toBe(6);
  });
});
