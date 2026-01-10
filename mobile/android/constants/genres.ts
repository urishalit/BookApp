/**
 * Genre lookup table and utilities
 * 
 * Genres are dynamic strings - any string can be a genre.
 * This lookup table provides translations and colors for common genres.
 * Unknown genres display as-is with a default color.
 */

import type { TFunction } from 'i18next';

/**
 * Genre display info
 */
export interface GenreDisplay {
  name: string;
  color: string;
}

/**
 * Lookup entry for known genres
 */
interface GenreLookupEntry {
  translationKey: string;
  color: string;
}

/**
 * Lookup table for common genres
 * Keys are normalized (lowercase, trimmed)
 */
export const GENRE_LOOKUP: Record<string, GenreLookupEntry> = {
  // Fiction categories
  'fiction': { translationKey: 'genres.fiction', color: '#4CAF50' },
  'literary fiction': { translationKey: 'genres.fiction', color: '#4CAF50' },
  
  // Non-fiction
  'non-fiction': { translationKey: 'genres.nonFiction', color: '#2196F3' },
  'nonfiction': { translationKey: 'genres.nonFiction', color: '#2196F3' },
  
  // Fantasy
  'fantasy': { translationKey: 'genres.fantasy', color: '#9C27B0' },
  'epic fantasy': { translationKey: 'genres.fantasy', color: '#9C27B0' },
  'urban fantasy': { translationKey: 'genres.fantasy', color: '#9C27B0' },
  
  // Science Fiction
  'science fiction': { translationKey: 'genres.sciFi', color: '#00BCD4' },
  'sci-fi': { translationKey: 'genres.sciFi', color: '#00BCD4' },
  'scifi': { translationKey: 'genres.sciFi', color: '#00BCD4' },
  
  // Mystery & Thriller
  'mystery': { translationKey: 'genres.mystery', color: '#607D8B' },
  'detective': { translationKey: 'genres.mystery', color: '#607D8B' },
  'thriller': { translationKey: 'genres.thriller', color: '#F44336' },
  'suspense': { translationKey: 'genres.thriller', color: '#F44336' },
  
  // Romance
  'romance': { translationKey: 'genres.romance', color: '#E91E63' },
  'love stories': { translationKey: 'genres.romance', color: '#E91E63' },
  
  // Biography & History
  'biography': { translationKey: 'genres.biography', color: '#FF9800' },
  'biography & autobiography': { translationKey: 'genres.biography', color: '#FF9800' },
  'autobiography': { translationKey: 'genres.biography', color: '#FF9800' },
  'history': { translationKey: 'genres.history', color: '#795548' },
  
  // Children & Young Adult
  'children': { translationKey: 'genres.children', color: '#FFEB3B' },
  "children's": { translationKey: 'genres.children', color: '#FFEB3B' },
  'juvenile fiction': { translationKey: 'genres.children', color: '#FFEB3B' },
  'juvenile nonfiction': { translationKey: 'genres.children', color: '#FFEB3B' },
  'young adult': { translationKey: 'genres.youngAdult', color: '#FF5722' },
  'young adult fiction': { translationKey: 'genres.youngAdult', color: '#FF5722' },
  'ya': { translationKey: 'genres.youngAdult', color: '#FF5722' },
  
  // Horror
  'horror': { translationKey: 'genres.horror', color: '#424242' },
  
  // Adventure & Action
  'adventure': { translationKey: 'genres.adventure', color: '#8BC34A' },
  'action & adventure': { translationKey: 'genres.adventure', color: '#8BC34A' },
  
  // Comics & Graphic Novels
  'comics': { translationKey: 'genres.comics', color: '#FF6F00' },
  'graphic novels': { translationKey: 'genres.comics', color: '#FF6F00' },
  'manga': { translationKey: 'genres.comics', color: '#FF6F00' },
  
  // Poetry & Drama
  'poetry': { translationKey: 'genres.poetry', color: '#7E57C2' },
  'drama': { translationKey: 'genres.drama', color: '#5C6BC0' },
  
  // Self-help & Business
  'self-help': { translationKey: 'genres.selfHelp', color: '#26A69A' },
  'business': { translationKey: 'genres.business', color: '#78909C' },
  'business & economics': { translationKey: 'genres.business', color: '#78909C' },
};

/**
 * Default color for unknown genres
 */
export const DEFAULT_GENRE_COLOR = '#9E9E9E';

/**
 * List of common genres for quick-select UI
 * These are the most commonly used genres shown as buttons
 */
export const COMMON_GENRES = [
  'fiction',
  'non-fiction',
  'fantasy',
  'science fiction',
  'mystery',
  'thriller',
  'romance',
  'biography',
  'history',
  'children',
  'young adult',
  'horror',
  'adventure',
  'comics',
] as const;

/**
 * Normalize a genre string for lookup
 */
export function normalizeGenre(genre: string): string {
  return genre.toLowerCase().trim();
}

/**
 * Get display info for a genre (translated name + color)
 * Falls back to showing genre as-is with default color if not in lookup
 */
export function getGenreDisplay(genre: string, t: TFunction): GenreDisplay {
  const normalized = normalizeGenre(genre);
  const lookup = GENRE_LOOKUP[normalized];
  
  if (lookup) {
    return {
      name: t(lookup.translationKey),
      color: lookup.color,
    };
  }
  
  // Unknown genre: show as-is with default color
  return {
    name: genre,
    color: DEFAULT_GENRE_COLOR,
  };
}

/**
 * Get color for a genre (without needing translation function)
 */
export function getGenreColor(genre: string): string {
  const normalized = normalizeGenre(genre);
  return GENRE_LOOKUP[normalized]?.color ?? DEFAULT_GENRE_COLOR;
}

/**
 * Map Google Books API categories to normalized genres
 * Google Books returns categories like "Fiction / Fantasy / Epic"
 */
export function normalizeApiCategory(category: string): string {
  // Split by " / " and take the most specific part
  const parts = category.split(' / ').map(p => p.trim());
  const fullNormalized = normalizeGenre(category);
  
  // First, check keywords in the full category string
  // Handle compound categories like "Juvenile Fiction", "Young Adult Fiction"
  if (fullNormalized.includes('juvenile') || fullNormalized.includes("children's")) {
    return 'children';
  }
  if (fullNormalized.includes('young adult')) {
    return 'young adult';
  }
  
  // Try each part from most specific to least, looking for lookup matches
  for (let i = parts.length - 1; i >= 0; i--) {
    const normalized = normalizeGenre(parts[i]);
    if (GENRE_LOOKUP[normalized]) {
      return normalized;
    }
  }
  
  // Return the first part as-is (most general category)
  return parts[0].toLowerCase();
}

/**
 * Process categories from Google Books API
 * Normalizes and deduplicates genres
 */
export function normalizeApiCategories(categories: string[]): string[] {
  const normalized = new Set<string>();
  
  for (const category of categories) {
    const genre = normalizeApiCategory(category);
    normalized.add(genre);
  }
  
  return Array.from(normalized);
}

/**
 * Get genres sorted by frequency (for series aggregation)
 */
export function getGenresByFrequency(bookGenres: (string[] | undefined)[]): string[] {
  const counts = new Map<string, number>();
  
  for (const genres of bookGenres) {
    if (!genres) continue;
    for (const genre of genres) {
      const normalized = normalizeGenre(genre);
      counts.set(normalized, (counts.get(normalized) || 0) + 1);
    }
  }
  
  // Sort by count (descending), then alphabetically
  return Array.from(counts.entries())
    .sort((a, b) => {
      if (b[1] !== a[1]) return b[1] - a[1];
      return a[0].localeCompare(b[0]);
    })
    .map(([genre]) => genre);
}

