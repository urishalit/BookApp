import type { Book, Series } from '@/types/models';
import type { SeriesWithProgress } from '@/hooks/use-series';

/** Union type for list items: either a standalone book or a collapsed series */
export type BookListItem =
  | { type: 'book'; book: Book }
  | { type: 'series'; series: Series; books: Book[] };

/**
 * Groups books by series and creates a combined list of items.
 * Books with a seriesId are collapsed into a single series item.
 * Books without a seriesId are shown as individual book items.
 * 
 * @param filteredBooks - Array of books matching current filter (for display purposes)
 * @param seriesWithProgress - Array of series with complete book data (for accurate progress)
 * @returns Array of BookListItems sorted with series first (alphabetically), 
 *          then standalone books (by addedAt descending)
 */
export function groupBooksBySeries(
  filteredBooks: Book[],
  seriesWithProgress: SeriesWithProgress[]
): BookListItem[] {
  const items: BookListItem[] = [];
  const seriesIdsWithMatchingBooks = new Set<string>();
  const standaloneBooks: Book[] = [];

  // Separate books into series groups and standalone
  for (const book of filteredBooks) {
    if (book.seriesId) {
      seriesIdsWithMatchingBooks.add(book.seriesId);
    } else {
      standaloneBooks.push(book);
    }
  }

  // Add series items that have at least one book matching the filter
  // Use COMPLETE booksInSeries from seriesWithProgress for accurate progress
  for (const seriesId of seriesIdsWithMatchingBooks) {
    const seriesData = seriesWithProgress.find((s) => s.id === seriesId);
    if (seriesData) {
      // Pass ALL books in series, not just filtered ones
      items.push({ type: 'series', series: seriesData, books: seriesData.booksInSeries });
    } else {
      // Fallback: if series metadata not found, show filtered books individually
      const filteredSeriesBooks = filteredBooks.filter((b) => b.seriesId === seriesId);
      for (const book of filteredSeriesBooks) {
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

