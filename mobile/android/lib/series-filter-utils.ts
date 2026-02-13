/**
 * Pure filtering utilities for series lists.
 * Supports tab-based filtering (in library / not in library) and search.
 */

export type LibraryTab = 'inLibrary' | 'notInLibrary';

export interface SeriesFilterInput {
  id: string;
  name: string;
  isInLibrary: boolean;
}

/**
 * Filters series by tab (in library vs not in library) and optional search query.
 * When searchQuery is non-empty, search matches across both tabs.
 */
export function filterSeries<T extends SeriesFilterInput>(
  series: T[],
  activeTab: LibraryTab,
  searchQuery: string
): T[] {
  const trimmedQuery = searchQuery.trim().toLowerCase();

  if (trimmedQuery) {
    // Search across both tabs - filter by name match only
    return series.filter((s) =>
      s.name.toLowerCase().includes(trimmedQuery)
    );
  }

  // Filter by tab
  if (activeTab === 'inLibrary') {
    return series.filter((s) => s.isInLibrary);
  }
  return series.filter((s) => !s.isInLibrary);
}
