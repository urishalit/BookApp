import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useBookSearch } from '../../hooks/use-book-search';
import * as googleBooks from '../../lib/google-books';

// Mock the google-books module
jest.mock('../../lib/google-books');

const mockSearchBooks = googleBooks.searchBooks as jest.MockedFunction<
  typeof googleBooks.searchBooks
>;

const mockBookData: googleBooks.GoogleBookData[] = [
  {
    googleBooksId: 'book-1',
    title: 'Test Book',
    author: 'Test Author',
    thumbnailUrl: 'https://example.com/thumb.jpg',
    description: 'A test book description',
    pageCount: 200,
    publishedDate: '2020-01-01',
  },
];

describe('useBookSearch', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockSearchBooks.mockResolvedValue(mockBookData);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should initialize with empty state', () => {
    const { result } = renderHook(() => useBookSearch());

    expect(result.current.query).toBe('');
    expect(result.current.results).toEqual([]);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.hasSearched).toBe(false);
  });

  it('should debounce search queries', async () => {
    const { result } = renderHook(() => useBookSearch(300));

    act(() => {
      result.current.setQuery('test');
    });

    // Query should be updated immediately
    expect(result.current.query).toBe('test');

    // But search should not have been called yet
    expect(mockSearchBooks).not.toHaveBeenCalled();

    // Fast-forward past the debounce time
    await act(async () => {
      jest.advanceTimersByTime(300);
    });

    // Now search should have been called
    await waitFor(() => {
      expect(mockSearchBooks).toHaveBeenCalledWith('test', { maxResults: 20 });
    });
  });

  it('should clear search results', async () => {
    const { result } = renderHook(() => useBookSearch(100));

    // Perform a search
    act(() => {
      result.current.setQuery('test');
    });

    await act(async () => {
      jest.advanceTimersByTime(100);
    });

    await waitFor(() => {
      expect(result.current.results).toEqual(mockBookData);
    });

    // Clear search
    act(() => {
      result.current.clearSearch();
    });

    expect(result.current.query).toBe('');
    expect(result.current.results).toEqual([]);
    expect(result.current.hasSearched).toBe(false);
  });

  it('should perform immediate search with searchNow', async () => {
    const { result } = renderHook(() => useBookSearch(1000));

    await act(async () => {
      result.current.searchNow('immediate search');
    });

    // Search should be called immediately without waiting for debounce
    await waitFor(() => {
      expect(mockSearchBooks).toHaveBeenCalledWith('immediate search', {
        maxResults: 20,
      });
    });
  });

  it('should not search for empty queries', async () => {
    const { result } = renderHook(() => useBookSearch(100));

    act(() => {
      result.current.setQuery('');
    });

    await act(async () => {
      jest.advanceTimersByTime(100);
    });

    expect(mockSearchBooks).not.toHaveBeenCalled();
  });

  it('should handle search errors', async () => {
    mockSearchBooks.mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useBookSearch(100));

    act(() => {
      result.current.setQuery('test');
    });

    await act(async () => {
      jest.advanceTimersByTime(100);
    });

    await waitFor(() => {
      expect(result.current.error).toBe('Network error');
      expect(result.current.isLoading).toBe(false);
      expect(result.current.hasSearched).toBe(true);
    });
  });

  it('should set hasSearched to true after search completes', async () => {
    const { result } = renderHook(() => useBookSearch(100));

    expect(result.current.hasSearched).toBe(false);

    act(() => {
      result.current.setQuery('test');
    });

    await act(async () => {
      jest.advanceTimersByTime(100);
    });

    await waitFor(() => {
      expect(result.current.hasSearched).toBe(true);
    });
  });

  it('should return search results from the API', async () => {
    const { result } = renderHook(() => useBookSearch(100));

    act(() => {
      result.current.setQuery('test book');
    });

    await act(async () => {
      jest.advanceTimersByTime(100);
    });

    await waitFor(() => {
      expect(result.current.results).toEqual(mockBookData);
      expect(result.current.results[0].title).toBe('Test Book');
    });
  });
});

