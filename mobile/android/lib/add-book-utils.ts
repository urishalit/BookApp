/**
 * Utilities for the add-book flow, including single vs batch mode routing.
 */

export type AddMode = 'single' | 'batch';

/**
 * Returns the route path for the given add mode.
 * - 'single' → /book/add
 * - 'batch' → /book/add-batch
 */
export function getRouteForAddMode(mode: AddMode): string {
  return mode === 'single' ? '/book/add' : '/book/add-batch';
}
