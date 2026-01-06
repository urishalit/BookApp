import { useEffect, useCallback, useState } from 'react';
import { useFamilyStore } from '@/stores/family-store';
import {
  createBook,
  updateBook,
  deleteBook,
  getBook,
  onBooksSnapshot,
} from '@/lib/firestore';
import type { Book, BookStatus, CreateBook } from '@/types/models';

interface BooksState {
  books: Book[];
  isLoading: boolean;
  error: string | null;
}

/**
 * Hook to manage books for the selected family member.
 * Sets up a real-time listener for the member's books.
 */
export function useBooksListener() {
  const family = useFamilyStore((s) => s.family);
  const selectedMemberId = useFamilyStore((s) => s.selectedMemberId);
  
  const [state, setState] = useState<BooksState>({
    books: [],
    isLoading: false,
    error: null,
  });

  useEffect(() => {
    if (!family || !selectedMemberId) {
      setState({ books: [], isLoading: false, error: null });
      return;
    }

    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    const unsubscribe = onBooksSnapshot(family.id, selectedMemberId, (books) => {
      setState({ books, isLoading: false, error: null });
    });

    return () => {
      unsubscribe();
    };
  }, [family, selectedMemberId]);

  return state;
}

/**
 * Hook for accessing books with optional status filtering
 */
export function useBooks(statusFilter?: BookStatus | 'all') {
  const { books, isLoading, error } = useBooksListener();

  const filteredBooks = statusFilter && statusFilter !== 'all'
    ? books.filter((book) => book.status === statusFilter)
    : books;

  // Group books by status for quick counts
  const booksByStatus = {
    reading: books.filter((b) => b.status === 'reading'),
    'to-read': books.filter((b) => b.status === 'to-read'),
    read: books.filter((b) => b.status === 'read'),
  };

  return {
    books: filteredBooks,
    allBooks: books,
    booksByStatus,
    isLoading,
    error,
    counts: {
      all: books.length,
      reading: booksByStatus.reading.length,
      'to-read': booksByStatus['to-read'].length,
      read: booksByStatus.read.length,
    },
  };
}

/**
 * Hook for book CRUD operations
 */
export function useBookOperations() {
  const family = useFamilyStore((s) => s.family);
  const selectedMemberId = useFamilyStore((s) => s.selectedMemberId);

  const addBook = useCallback(
    async (data: Omit<CreateBook, 'memberId' | 'addedAt'>) => {
      if (!family) throw new Error('No family loaded');
      if (!selectedMemberId) throw new Error('No member selected');

      const bookId = await createBook(family.id, selectedMemberId, data);
      return bookId;
    },
    [family, selectedMemberId]
  );

  const editBook = useCallback(
    async (bookId: string, data: Partial<Book>) => {
      if (!family) throw new Error('No family loaded');
      if (!selectedMemberId) throw new Error('No member selected');

      await updateBook(family.id, selectedMemberId, bookId, data);
    },
    [family, selectedMemberId]
  );

  const removeBook = useCallback(
    async (bookId: string) => {
      if (!family) throw new Error('No family loaded');
      if (!selectedMemberId) throw new Error('No member selected');

      await deleteBook(family.id, selectedMemberId, bookId);
    },
    [family, selectedMemberId]
  );

  const updateBookStatus = useCallback(
    async (bookId: string, status: BookStatus) => {
      if (!family) throw new Error('No family loaded');
      if (!selectedMemberId) throw new Error('No member selected');

      await updateBook(family.id, selectedMemberId, bookId, { status });
    },
    [family, selectedMemberId]
  );

  const fetchBook = useCallback(
    async (bookId: string): Promise<Book | null> => {
      if (!family) throw new Error('No family loaded');
      if (!selectedMemberId) throw new Error('No member selected');

      return getBook(family.id, selectedMemberId, bookId);
    },
    [family, selectedMemberId]
  );

  return {
    addBook,
    editBook,
    removeBook,
    updateBookStatus,
    fetchBook,
  };
}

