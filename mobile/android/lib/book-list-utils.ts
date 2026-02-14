import type { MemberBook } from '@/types/models';
import type { SeriesWithProgress } from '@/hooks/use-series';
import type { BookStatus } from '@/types/models';

/** Union type for list items: either a standalone book or a collapsed series */
export type BookListItem =
  | { type: 'book'; book: MemberBook }
  | { type: 'series'; series: SeriesWithProgress; books: MemberBook[] };

/**
 * Groups books by series and creates a combined list of items.
 * Books with a seriesId are collapsed into a single series item.
 * Books without a seriesId are shown as individual book items.
 *
 * Series status trumps book status: when statusFilter is set, a series appears only in the tab
 * matching its series.status, regardless of individual book statuses. A series with status
 * 'reading' won't appear in Read or To read tabs even if some books are read or to-read.
 *
 * @param allBooks - All books in the member's library (unfiltered)
 * @param seriesWithProgress - Array of series with complete book data (for accurate progress)
 * @param statusFilter - Optional status filter; when set, series are filtered by series.status
 * @returns Array of BookListItems sorted with series first (alphabetically),
 *          then standalone books (by addedAt descending)
 */
export function groupBooksBySeries(
  allBooks: MemberBook[],
  seriesWithProgress: SeriesWithProgress[],
  statusFilter?: BookStatus | 'all'
): BookListItem[] {
  const items: BookListItem[] = [];
  const seriesIdsToShow = new Set<string>();
  let standaloneBooks: MemberBook[];

  if (statusFilter && statusFilter !== 'all') {
    // Series status trumps: series appear only when series.status matches the filter
    standaloneBooks = allBooks.filter((b) => !b.seriesId && b.status === statusFilter);
    for (const s of seriesWithProgress) {
      if (s.status === statusFilter && s.booksOwned > 0) {
        seriesIdsToShow.add(s.id);
      }
    }
  } else {
    // No filter: include all standalone books and all series with owned books
    standaloneBooks = allBooks.filter((b) => !b.seriesId);
    for (const book of allBooks) {
      if (book.seriesId) seriesIdsToShow.add(book.seriesId);
    }
  }

  // Add series items. Use COMPLETE booksInSeries from seriesWithProgress for accurate progress.
  for (const seriesId of seriesIdsToShow) {
    const seriesData = seriesWithProgress.find((s) => s.id === seriesId);
    if (seriesData) {
      // Pass ALL books in series, not just filtered ones
      items.push({ type: 'series', series: seriesData, books: seriesData.booksInSeries });
    } else {
      // Fallback: if series metadata not found, show books in that series individually
      const seriesBooks = allBooks.filter((b) => b.seriesId === seriesId);
      for (const book of seriesBooks) {
        items.push({ type: 'book', book });
      }
    }
  }

  // Add standalone books
  for (const book of standaloneBooks) {
    items.push({ type: 'book', book });
  }

  // Sort: series first (by name), then standalone books (by addedAt desc)
  items.sort((a, b) => {
    if (a.type === 'series' && b.type === 'series') {
      return a.series.name.localeCompare(b.series.name);
    }
    if (a.type === 'series') return -1;
    if (b.type === 'series') return 1;
    // Both are books - sort by addedAt descending
    const aTime = a.book.addedAt?.toMillis?.() ?? 0;
    const bTime = b.book.addedAt?.toMillis?.() ?? 0;
    return bTime - aTime;
  });

  return items;
}

/**
 * Get a unique key for a BookListItem
 */
export function getBookListItemKey(item: BookListItem): string {
  return item.type === 'series' ? `series-${item.series.id}` : `book-${item.book.id}`;
}

