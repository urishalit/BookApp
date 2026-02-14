/**
 * Utilities for the batch add wizard (one form per photo).
 */

/**
 * Returns the photo URI at the given index, or undefined if out of bounds.
 */
export function getCurrentPhoto(photoUris: string[], index: number): string | undefined {
  return photoUris[index];
}

/**
 * Returns whether there is a next photo after the current index.
 */
export function hasNextPhoto(photoUris: string[], index: number): boolean {
  return index < photoUris.length - 1;
}

/**
 * Returns the next index (current + 1).
 */
export function getNextIndex(index: number): number {
  return index + 1;
}
