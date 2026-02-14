/**
 * Series status derivation utilities.
 * When no stored status exists, derive from book statuses with special rule:
 * If some books read and unread remain, treat as "reading" even if no book is currently "reading".
 */

import type { BookStatus, SeriesStatus } from '@/types/models';

export interface BookWithStatus {
  status: BookStatus;
}

/**
 * Derive series status from books when no stored status exists.
 * Rule: Some read + more unread + none currently reading → still "reading"
 */
export function deriveSeriesStatus(
  booksInSeries: BookWithStatus[],
  storedStatus: SeriesStatus | null
): SeriesStatus {
  if (storedStatus !== null) return storedStatus;

  const booksRead = booksInSeries.filter((b) => b.status === 'read').length;
  const anyReading = booksInSeries.some((b) => b.status === 'reading');
  const totalOwned = booksInSeries.length;
  const allRead = totalOwned > 0 && booksRead === totalOwned;

  if (allRead) return 'read';
  if (anyReading) return 'reading';
  // User's rule: some read, more unread, none currently reading → still "reading"
  if (booksRead > 0 && booksRead < totalOwned) return 'reading';
  return 'to-read';
}
