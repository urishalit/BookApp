import { useState, useEffect, useCallback, useRef } from 'react';
import { searchBooks, GoogleBookData } from '@/lib/google-books';

interface SearchState {
  results: GoogleBookData[];
  isLoading: boolean;
  error: string | null;
  hasSearched: boolean;
}

/**
 * Hook for searching books with debouncing
 * 
 * @param debounceMs - Debounce delay in milliseconds (default: 400ms)
 * @returns Search state and control functions
 */
export function useBookSearch(debounceMs: number = 400) {
  const [query, setQuery] = useState('');
  const [state, setState] = useState<SearchState>({
    results: [],
    isLoading: false,
    error: null,
    hasSearched: false,
  });

  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Perform the actual search
  const performSearch = useCallback(async (searchQuery: string) => {
    // Cancel any in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    if (!searchQuery.trim()) {
      setState({
        results: [],
        isLoading: false,
        error: null,
        hasSearched: false,
      });
      return;
    }

    // Create new abort controller for this request
    abortControllerRef.current = new AbortController();

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const results = await searchBooks(searchQuery, { maxResults: 20 });
      
      // Only update if this request wasn't aborted
      setState({
        results,
        isLoading: false,
        error: null,
        hasSearched: true,
      });
    } catch (error) {
      // Ignore abort errors
      if (error instanceof Error && error.name === 'AbortError') {
        return;
      }

      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Search failed',
        hasSearched: true,
      }));
    }
  }, []);

  // Update query with debouncing
  const updateQuery = useCallback((newQuery: string) => {
    setQuery(newQuery);

    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Set up new debounced search
    debounceTimerRef.current = setTimeout(() => {
      performSearch(newQuery);
    }, debounceMs);
  }, [debounceMs, performSearch]);

  // Immediate search (bypasses debounce)
  const searchNow = useCallback((searchQuery?: string) => {
    const queryToSearch = searchQuery ?? query;
    
    // Clear debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (searchQuery !== undefined) {
      setQuery(searchQuery);
    }

    performSearch(queryToSearch);
  }, [query, performSearch]);

  // Clear search results
  const clearSearch = useCallback(() => {
    setQuery('');
    setState({
      results: [],
      isLoading: false,
      error: null,
      hasSearched: false,
    });

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    query,
    setQuery: updateQuery,
    searchNow,
    clearSearch,
    ...state,
  };
}

