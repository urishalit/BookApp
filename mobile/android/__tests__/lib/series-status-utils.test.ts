/**
 * Tests for series status derivation.
 */

import { deriveSeriesStatus } from '../../lib/series-status-utils';
import type { BookStatus } from '../../types/models';

describe('deriveSeriesStatus', () => {
  it('should return stored status when provided', () => {
    const books = [
      { status: 'to-read' as BookStatus },
      { status: 'read' as BookStatus },
    ];
    expect(deriveSeriesStatus(books, 'stopped')).toBe('stopped');
    expect(deriveSeriesStatus(books, 'read')).toBe('read');
  });

  it('should return read when all books read', () => {
    const books = [
      { status: 'read' as BookStatus },
      { status: 'read' as BookStatus },
    ];
    expect(deriveSeriesStatus(books, null)).toBe('read');
  });

  it('should return reading when any book is reading', () => {
    const books = [
      { status: 'read' as BookStatus },
      { status: 'reading' as BookStatus },
    ];
    expect(deriveSeriesStatus(books, null)).toBe('reading');
  });

  it('should return reading when some read and unread remain (user rule)', () => {
    const books = [
      { status: 'read' as BookStatus },
      { status: 'to-read' as BookStatus },
    ];
    expect(deriveSeriesStatus(books, null)).toBe('reading');
  });

  it('should return to-read when no books read and none reading', () => {
    const books = [
      { status: 'to-read' as BookStatus },
      { status: 'to-read' as BookStatus },
    ];
    expect(deriveSeriesStatus(books, null)).toBe('to-read');
  });

  it('should return to-read for empty array', () => {
    expect(deriveSeriesStatus([], null)).toBe('to-read');
  });
});
