/**
 * Google Books API client
 * 
 * Provides search and book data fetching from the Google Books API.
 * Works without an API key (rate limited) or with one for higher quotas.
 */

const GOOGLE_BOOKS_API_BASE = 'https://www.googleapis.com/books/v1';

// Optional API key - set via environment variable for higher rate limits
const API_KEY = process.env.EXPO_PUBLIC_GOOGLE_BOOKS_API_KEY || '';

/**
 * Google Books Volume item from the API
 */
export interface GoogleBooksVolume {
  id: string;
  selfLink: string;
  volumeInfo: {
    title: string;
    subtitle?: string;
    authors?: string[];
    publisher?: string;
    publishedDate?: string;
    description?: string;
    industryIdentifiers?: Array<{
      type: 'ISBN_10' | 'ISBN_13' | 'OTHER';
      identifier: string;
    }>;
    pageCount?: number;
    categories?: string[];
    averageRating?: number;
    ratingsCount?: number;
    maturityRating?: string;
    imageLinks?: {
      smallThumbnail?: string;
      thumbnail?: string;
      small?: string;
      medium?: string;
      large?: string;
      extraLarge?: string;
    };
    language?: string;
    previewLink?: string;
    infoLink?: string;
  };
}

/**
 * Search results from Google Books API
 */
export interface GoogleBooksSearchResult {
  kind: string;
  totalItems: number;
  items?: GoogleBooksVolume[];
}

/**
 * Simplified book data for use in the app
 */
export interface GoogleBookData {
  googleBooksId: string;
  title: string;
  author: string;
  thumbnailUrl?: string;
  description?: string;
  pageCount?: number;
  publishedDate?: string;
  publisher?: string;
  isbn?: string;
  categories?: string[];
}

/**
 * Build URL with API key if available
 */
function buildUrl(path: string, params: Record<string, string>): string {
  const url = new URL(`${GOOGLE_BOOKS_API_BASE}${path}`);
  
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.append(key, value);
  });
  
  if (API_KEY) {
    url.searchParams.append('key', API_KEY);
  }
  
  return url.toString();
}

/**
 * Get the best available thumbnail URL from image links
 */
function getBestThumbnail(imageLinks?: GoogleBooksVolume['volumeInfo']['imageLinks']): string | undefined {
  if (!imageLinks) return undefined;
  
  // Prefer higher resolution images, fall back to smaller ones
  // Also convert http to https for security
  const url = imageLinks.medium 
    || imageLinks.small 
    || imageLinks.thumbnail 
    || imageLinks.smallThumbnail;
    
  return url?.replace('http://', 'https://');
}

/**
 * Get ISBN-13 or ISBN-10 from industry identifiers
 */
function getIsbn(identifiers?: GoogleBooksVolume['volumeInfo']['industryIdentifiers']): string | undefined {
  if (!identifiers) return undefined;
  
  const isbn13 = identifiers.find(id => id.type === 'ISBN_13');
  if (isbn13) return isbn13.identifier;
  
  const isbn10 = identifiers.find(id => id.type === 'ISBN_10');
  return isbn10?.identifier;
}

/**
 * Transform a Google Books Volume to our simplified format
 */
export function transformVolume(volume: GoogleBooksVolume): GoogleBookData {
  const { volumeInfo } = volume;
  
  return {
    googleBooksId: volume.id,
    title: volumeInfo.title + (volumeInfo.subtitle ? `: ${volumeInfo.subtitle}` : ''),
    author: volumeInfo.authors?.join(', ') || 'Unknown Author',
    thumbnailUrl: getBestThumbnail(volumeInfo.imageLinks),
    description: volumeInfo.description,
    pageCount: volumeInfo.pageCount,
    publishedDate: volumeInfo.publishedDate,
    publisher: volumeInfo.publisher,
    isbn: getIsbn(volumeInfo.industryIdentifiers),
    categories: volumeInfo.categories,
  };
}

/**
 * Search for books using the Google Books API
 * 
 * @param query - Search query (title, author, ISBN, etc.)
 * @param options - Search options
 * @returns Array of book data
 */
export async function searchBooks(
  query: string,
  options: {
    maxResults?: number;
    startIndex?: number;
    orderBy?: 'relevance' | 'newest';
    langRestrict?: string;
  } = {}
): Promise<GoogleBookData[]> {
  if (!query.trim()) {
    return [];
  }

  const {
    maxResults = 20,
    startIndex = 0,
    orderBy = 'relevance',
    langRestrict,
  } = options;

  const params: Record<string, string> = {
    q: query,
    maxResults: String(maxResults),
    startIndex: String(startIndex),
    orderBy,
  };

  if (langRestrict) {
    params.langRestrict = langRestrict;
  }

  const url = buildUrl('/volumes', params);

  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`Google Books API error: ${response.status} ${response.statusText}`);
  }

  const data: GoogleBooksSearchResult = await response.json();

  if (!data.items) {
    return [];
  }

  return data.items.map(transformVolume);
}

/**
 * Get detailed information about a specific book by its Google Books ID
 * 
 * @param volumeId - Google Books volume ID
 * @returns Book data or null if not found
 */
export async function getBookById(volumeId: string): Promise<GoogleBookData | null> {
  const url = buildUrl(`/volumes/${volumeId}`, {});

  const response = await fetch(url);
  
  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`Google Books API error: ${response.status} ${response.statusText}`);
  }

  const volume: GoogleBooksVolume = await response.json();
  
  return transformVolume(volume);
}

/**
 * Search for books by ISBN
 * 
 * @param isbn - ISBN-10 or ISBN-13
 * @returns Array of matching books (usually 1)
 */
export async function searchByIsbn(isbn: string): Promise<GoogleBookData[]> {
  // Clean the ISBN (remove dashes, spaces)
  const cleanIsbn = isbn.replace(/[-\s]/g, '');
  return searchBooks(`isbn:${cleanIsbn}`, { maxResults: 5 });
}

/**
 * Search for books by author
 * 
 * @param author - Author name
 * @param options - Search options
 * @returns Array of books by the author
 */
export async function searchByAuthor(
  author: string,
  options: { maxResults?: number } = {}
): Promise<GoogleBookData[]> {
  return searchBooks(`inauthor:"${author}"`, options);
}

/**
 * Search for books by title
 * 
 * @param title - Book title
 * @param options - Search options
 * @returns Array of matching books
 */
export async function searchByTitle(
  title: string,
  options: { maxResults?: number } = {}
): Promise<GoogleBookData[]> {
  return searchBooks(`intitle:"${title}"`, options);
}

