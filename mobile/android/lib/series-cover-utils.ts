/**
 * Utilities for resolving series cover images.
 * Series cover can come from: (1) stored series.thumbnailUrl, or
 * (2) first book with a cover, sorted by seriesOrder.
 */

export interface BookWithCover {
  seriesOrder?: number;
  thumbnailUrl?: string;
}

/**
 * Get the cover URL from the first book that has a cover, sorted by seriesOrder.
 * Returns undefined if no books have covers.
 */
export function getSeriesCoverFromBooks(
  books: BookWithCover[]
): string | undefined {
  const sorted = [...books].sort(
    (a, b) => (a.seriesOrder ?? Infinity) - (b.seriesOrder ?? Infinity)
  );
  return sorted.find((b) => b.thumbnailUrl)?.thumbnailUrl;
}
