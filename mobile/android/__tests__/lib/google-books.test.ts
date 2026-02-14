import {
  searchBooks,
  getBookById,
  searchByIsbn,
  searchByAuthor,
  searchByTitle,
  transformVolume,
  extractYearFromPublishedDate,
  GoogleBooksVolume,
} from '../../lib/google-books';

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Sample Google Books API response
const mockVolume: GoogleBooksVolume = {
  id: 'book-123',
  selfLink: 'https://www.googleapis.com/books/v1/volumes/book-123',
  volumeInfo: {
    title: 'The Great Gatsby',
    subtitle: 'A Novel',
    authors: ['F. Scott Fitzgerald'],
    publisher: 'Scribner',
    publishedDate: '1925-04-10',
    description: 'A story about the American Dream',
    industryIdentifiers: [
      { type: 'ISBN_13', identifier: '9780743273565' },
      { type: 'ISBN_10', identifier: '0743273567' },
    ],
    pageCount: 180,
    categories: ['Fiction', 'Classic Literature'],
    averageRating: 4.5,
    ratingsCount: 5000,
    imageLinks: {
      thumbnail: 'http://books.google.com/thumb.jpg',
      smallThumbnail: 'http://books.google.com/small.jpg',
      medium: 'http://books.google.com/medium.jpg',
    },
    language: 'en',
  },
};

const mockSearchResponse = {
  kind: 'books#volumes',
  totalItems: 1,
  items: [mockVolume],
};

describe('Google Books API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('transformVolume', () => {
    it('should transform a Google Books Volume to GoogleBookData', () => {
      const result = transformVolume(mockVolume);

      expect(result).toEqual({
        googleBooksId: 'book-123',
        title: 'The Great Gatsby: A Novel',
        author: 'F. Scott Fitzgerald',
        thumbnailUrl: 'https://books.google.com/medium.jpg',
        description: 'A story about the American Dream',
        pageCount: 180,
        publishedDate: '1925-04-10',
        publisher: 'Scribner',
        isbn: '9780743273565',
        categories: ['Fiction', 'Classic Literature'],
      });
    });

    it('should handle missing optional fields', () => {
      const minimalVolume: GoogleBooksVolume = {
        id: 'book-456',
        selfLink: 'https://example.com',
        volumeInfo: {
          title: 'Unknown Book',
        },
      };

      const result = transformVolume(minimalVolume);

      expect(result).toEqual({
        googleBooksId: 'book-456',
        title: 'Unknown Book',
        author: 'Unknown Author',
        thumbnailUrl: undefined,
        description: undefined,
        pageCount: undefined,
        publishedDate: undefined,
        publisher: undefined,
        isbn: undefined,
        categories: undefined,
      });
    });

    it('should join multiple authors with commas', () => {
      const multiAuthorVolume: GoogleBooksVolume = {
        id: 'book-789',
        selfLink: 'https://example.com',
        volumeInfo: {
          title: 'Collaborative Work',
          authors: ['Author One', 'Author Two', 'Author Three'],
        },
      };

      const result = transformVolume(multiAuthorVolume);

      expect(result.author).toBe('Author One, Author Two, Author Three');
    });

    it('should prefer ISBN-13 over ISBN-10', () => {
      const result = transformVolume(mockVolume);

      expect(result.isbn).toBe('9780743273565');
    });

    it('should fall back to ISBN-10 when ISBN-13 is missing', () => {
      const volumeWithIsbn10: GoogleBooksVolume = {
        id: 'book-101',
        selfLink: 'https://example.com',
        volumeInfo: {
          title: 'Old Book',
          industryIdentifiers: [{ type: 'ISBN_10', identifier: '0123456789' }],
        },
      };

      const result = transformVolume(volumeWithIsbn10);

      expect(result.isbn).toBe('0123456789');
    });

    it('should convert http to https in thumbnail URLs', () => {
      const result = transformVolume(mockVolume);

      expect(result.thumbnailUrl).toMatch(/^https:\/\//);
    });

    it('should prefer medium size thumbnail over smaller sizes', () => {
      const result = transformVolume(mockVolume);

      expect(result.thumbnailUrl).toBe('https://books.google.com/medium.jpg');
    });
  });

  describe('searchBooks', () => {
    it('should return empty array for empty query', async () => {
      const results = await searchBooks('');

      expect(results).toEqual([]);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should call Google Books API with correct parameters', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockSearchResponse),
      });

      await searchBooks('gatsby');

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const calledUrl = mockFetch.mock.calls[0][0];
      expect(calledUrl).toContain('https://www.googleapis.com/books/v1/volumes');
      expect(calledUrl).toContain('q=gatsby');
      expect(calledUrl).toContain('maxResults=20');
    });

    it('should return transformed book data', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockSearchResponse),
      });

      const results = await searchBooks('gatsby');

      expect(results).toHaveLength(1);
      expect(results[0].googleBooksId).toBe('book-123');
      expect(results[0].title).toBe('The Great Gatsby: A Novel');
    });

    it('should return empty array when no items found', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ kind: 'books#volumes', totalItems: 0 }),
      });

      const results = await searchBooks('xyznonexistent');

      expect(results).toEqual([]);
    });

    it('should throw error on API failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      await expect(searchBooks('test')).rejects.toThrow(
        'Google Books API error: 500 Internal Server Error'
      );
    });

    it('should pass custom options to API', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockSearchResponse),
      });

      await searchBooks('test', {
        maxResults: 10,
        startIndex: 20,
        orderBy: 'newest',
        langRestrict: 'en',
      });

      const calledUrl = mockFetch.mock.calls[0][0];
      expect(calledUrl).toContain('maxResults=10');
      expect(calledUrl).toContain('startIndex=20');
      expect(calledUrl).toContain('orderBy=newest');
      expect(calledUrl).toContain('langRestrict=en');
    });
  });

  describe('getBookById', () => {
    it('should fetch a specific book by ID', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockVolume),
      });

      const result = await getBookById('book-123');

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const calledUrl = mockFetch.mock.calls[0][0];
      expect(calledUrl).toContain('/volumes/book-123');
      expect(result?.googleBooksId).toBe('book-123');
    });

    it('should return null for non-existent book', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      const result = await getBookById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('searchByIsbn', () => {
    it('should search with isbn: prefix', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockSearchResponse),
      });

      await searchByIsbn('978-0-7432-7356-5');

      const calledUrl = mockFetch.mock.calls[0][0];
      expect(calledUrl).toContain('q=isbn%3A9780743273565');
    });

    it('should strip dashes and spaces from ISBN', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockSearchResponse),
      });

      await searchByIsbn('978 0 7432 7356 5');

      const calledUrl = mockFetch.mock.calls[0][0];
      expect(calledUrl).toContain('isbn%3A9780743273565');
    });
  });

  describe('searchByAuthor', () => {
    it('should search with inauthor: prefix', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockSearchResponse),
      });

      await searchByAuthor('Fitzgerald');

      const calledUrl = mockFetch.mock.calls[0][0];
      expect(calledUrl).toContain('inauthor');
      expect(calledUrl).toContain('Fitzgerald');
    });
  });

  describe('searchByTitle', () => {
    it('should search with intitle: prefix', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockSearchResponse),
      });

      await searchByTitle('Gatsby');

      const calledUrl = mockFetch.mock.calls[0][0];
      expect(calledUrl).toContain('intitle');
      expect(calledUrl).toContain('Gatsby');
    });
  });

  describe('extractYearFromPublishedDate', () => {
    it('should extract year from full date (YYYY-MM-DD)', () => {
      expect(extractYearFromPublishedDate('2020-01-15')).toBe(2020);
    });

    it('should extract year from partial date (YYYY-MM)', () => {
      expect(extractYearFromPublishedDate('2019-06')).toBe(2019);
    });

    it('should extract year from year-only string', () => {
      expect(extractYearFromPublishedDate('1925')).toBe(1925);
    });

    it('should return undefined for undefined input', () => {
      expect(extractYearFromPublishedDate(undefined)).toBeUndefined();
    });

    it('should return undefined for empty string', () => {
      expect(extractYearFromPublishedDate('')).toBeUndefined();
    });

    it('should return undefined for invalid string (non-numeric prefix)', () => {
      expect(extractYearFromPublishedDate('invalid-date')).toBeUndefined();
    });

    it('should return undefined for year out of valid range (< 1)', () => {
      expect(extractYearFromPublishedDate('0000')).toBeUndefined();
    });

    it('should accept year 9999 as valid', () => {
      expect(extractYearFromPublishedDate('9999')).toBe(9999);
    });

    it('should accept year 1 as valid', () => {
      expect(extractYearFromPublishedDate('1-01-01')).toBe(1);
    });

    it('should handle string array (Expo Router params)', () => {
      expect(extractYearFromPublishedDate(['2020-01-15'])).toBe(2020);
      expect(extractYearFromPublishedDate(['2019'])).toBe(2019);
    });
  });
});

