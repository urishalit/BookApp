/**
 * Compute the next series order number when adding a book to a series.
 * Formula: number of books in series + 1.
 * Used when manually adding books to a series.
 */
export function computeNextSeriesOrder(books: unknown[] | undefined | null): number {
  return (books?.length ?? 0) + 1;
}
