import type { SeriesStatus } from '@/types/models';

/**
 * Pure filtering utilities for series lists.
 * Supports tab-based filtering (in library / not in library), status filter, and search.
 */

export type LibraryTab = 'inLibrary' | 'notInLibrary';

export interface SeriesFilterInput {
  id: string;
  name: string;
  isInLibrary: boolean;
}

export interface SeriesFilterInputWithStatus extends SeriesFilterInput {
  status: SeriesStatus;
}

/**
 * Filters series by tab (in library vs not in library), optional status, and search query.
 * When searchQuery is non-empty, search matches across both tabs.
 * When statusFilter is set, filters by series.status (only applies to in-library series).
 */
export function filterSeries<T extends SeriesFilterInput & { status?: SeriesStatus }>(
  series: T[],
  activeTab: LibraryTab,
  searchQuery: string,
  statusFilter?: SeriesStatus | 'all'
): T[] {
  const trimmedQuery = searchQuery.trim().toLowerCase();

  let result: T[];

  if (trimmedQuery) {
    // Search across both tabs - filter by name match only
    result = series.filter((s) =>
      s.name.toLowerCase().includes(trimmedQuery)
    );
  } else if (activeTab === 'inLibrary') {
    result = series.filter((s) => s.isInLibrary);
  } else {
    result = series.filter((s) => !s.isInLibrary);
  }

  // Apply status filter when on in-library tab and status is available
  if (
    activeTab === 'inLibrary' &&
    statusFilter &&
    statusFilter !== 'all' &&
    result.some((s) => 'status' in s)
  ) {
    result = result.filter((s) => 'status' in s && s.status === statusFilter);
  }

  return result;
}
