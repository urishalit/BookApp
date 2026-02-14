/**
 * Tests for add-book-utils.ts (getRouteForAddMode)
 *
 * Verifies that the add-mode choice maps correctly to routes.
 * Mutation: invert return values → test should fail.
 */

import { getRouteForAddMode } from '@/lib/add-book-utils';

describe('getRouteForAddMode', () => {
  it('should return /book/add for single mode', () => {
    expect(getRouteForAddMode('single')).toBe('/book/add');
  });

  it('should return /book/add-batch for batch mode', () => {
    expect(getRouteForAddMode('batch')).toBe('/book/add-batch');
  });
});
