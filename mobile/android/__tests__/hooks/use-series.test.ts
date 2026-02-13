import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useSeries, useSeriesOperations, useSeriesDetail, SeriesWithProgress } from '@/hooks/use-series';
import { useFamilyStore } from '@/stores/family-store';
import * as firestore from '@/lib/firestore';
import type { Series, MemberBook, MemberLibraryEntry, FamilyBook, Family } from '@/types/models';

// Mock the firestore module
jest.mock('@/lib/firestore', () => {
  const actual = jest.requireActual<typeof import('@/lib/firestore')>('@/lib/firestore');
  return {
    ...actual,
    createSeries: jest.fn(),
    updateSeries: jest.fn(),
    deleteSeries: jest.fn(),
    getSeriesById: jest.fn(),
    onSeriesSnapshot: jest.fn(),
    onMemberLibrarySnapshot: jest.fn(),
    onFamilyBooksSnapshot: jest.fn(),
    getSeriesBooksFromCatalog: jest.fn(),
    addSeriesToMemberLibrary: jest.fn(),
  };
});

// Mock the family store
jest.mock('@/stores/family-store', () => ({
  useFamilyStore: jest.fn(),
}));

const mockFamily: Family = {
  id: 'family-1',
  name: 'Test Family',
  ownerId: 'user-1',
  createdAt: { toDate: () => new Date() } as any,
};

const mockSeries: Series[] = [
  { id: 'series-1', name: 'Harry Potter', totalBooks: 7 },
  { id: 'series-2', name: 'Percy Jackson', totalBooks: 5 },
];

const mockFamilyBooks: FamilyBook[] = [
  { id: 'book-1', title: 'Book 1', author: 'Author', addedBy: 'member-1', seriesId: 'series-1', seriesOrder: 1, addedAt: {} as any },
  { id: 'book-2', title: 'Book 2', author: 'Author', addedBy: 'member-1', seriesId: 'series-1', seriesOrder: 2, addedAt: {} as any },
  { id: 'book-3', title: 'Book 3', author: 'Author', addedBy: 'member-1', seriesId: 'series-1', seriesOrder: 3, addedAt: {} as any },
];

const mockLibraryEntries: MemberLibraryEntry[] = [
  { id: 'entry-1', bookId: 'book-1', status: 'read', addedAt: {} as any },
  { id: 'entry-2', bookId: 'book-2', status: 'reading', addedAt: {} as any },
  { id: 'entry-3', bookId: 'book-3', status: 'to-read', addedAt: {} as any },
];

describe('use-series hooks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default mock implementation for family store
    (useFamilyStore as unknown as jest.Mock).mockImplementation((selector) => {
      const state = {
        family: mockFamily,
        selectedMemberId: 'member-1',
      };
      return selector(state);
    });

    // Default mock implementation for onSeriesSnapshot
    (firestore.onSeriesSnapshot as jest.Mock).mockImplementation((_familyId, callback) => {
      callback(mockSeries);
      return jest.fn();
    });

    // Default mock implementation for family books snapshot
    (firestore.onFamilyBooksSnapshot as jest.Mock).mockImplementation((_familyId, callback) => {
      callback(mockFamilyBooks);
      return jest.fn();
    });

    // Default mock implementation for member library snapshot
    (firestore.onMemberLibrarySnapshot as jest.Mock).mockImplementation((_familyId, _memberId, callback) => {
      callback(mockLibraryEntries);
      return jest.fn();
    });
  });

  describe('useSeries', () => {
    it('should return series with progress calculated', async () => {
      const { result } = renderHook(() => useSeries());

      await waitFor(() => {
        expect(result.current.series.length).toBe(2);
      });

      const harryPotterSeries = result.current.series.find(s => s.id === 'series-1');
      expect(harryPotterSeries).toBeDefined();
      expect(harryPotterSeries?.booksOwned).toBe(3);
      expect(harryPotterSeries?.booksRead).toBe(1);
      // totalBooks is computed from family books (max seriesOrder=3), so 1/3 = 33%
      expect(harryPotterSeries?.progressPercent).toBe(33);
      expect(harryPotterSeries?.totalBooks).toBe(3);
      expect(harryPotterSeries?.isInLibrary).toBe(true);
    });

    it('should return series with zero progress when no member selected', async () => {
      (useFamilyStore as unknown as jest.Mock).mockImplementation((selector) => {
        const state = {
          family: mockFamily,
          selectedMemberId: null,
        };
        return selector(state);
      });

      // No library entries when no member selected
      (firestore.onMemberLibrarySnapshot as jest.Mock).mockImplementation(() => jest.fn());
      (firestore.onFamilyBooksSnapshot as jest.Mock).mockImplementation(() => jest.fn());

      const { result } = renderHook(() => useSeries());

      await waitFor(() => {
        expect(result.current.series.length).toBe(2);
      });

      // Series are visible but progress is 0 since no member selected
      expect(result.current.totalSeries).toBe(2);
      result.current.series.forEach((s) => {
        expect(s.booksOwned).toBe(0);
        expect(s.booksRead).toBe(0);
        expect(s.booksInSeries).toEqual([]);
        expect(s.isInLibrary).toBe(false);
      });
    });

    it('should correctly count books in series', async () => {
      const { result } = renderHook(() => useSeries());

      await waitFor(() => {
        expect(result.current.series.length).toBe(2);
      });

      // Harry Potter series should have 3 books owned
      const hp = result.current.series.find(s => s.name === 'Harry Potter');
      expect(hp?.booksOwned).toBe(3);
      expect(hp?.booksInSeries.length).toBe(3);

      // Percy Jackson series should have 0 books owned
      const pj = result.current.series.find(s => s.name === 'Percy Jackson');
      expect(pj?.booksOwned).toBe(0);
      expect(pj?.booksInSeries.length).toBe(0);
    });
  });

  describe('useSeriesOperations', () => {
    it('should add series correctly', async () => {
      (firestore.createSeries as jest.Mock).mockResolvedValue('new-series-id');

      const { result } = renderHook(() => useSeriesOperations());

      await act(async () => {
        const seriesId = await result.current.addSeries({
          name: 'New Series',
          totalBooks: 3,
        });
        expect(seriesId).toBe('new-series-id');
      });

      expect(firestore.createSeries).toHaveBeenCalledWith(
        'family-1',
        { name: 'New Series', totalBooks: 3 },
        'member-1'
      );
    });

    it('should throw error when no family loaded', async () => {
      (useFamilyStore as unknown as jest.Mock).mockImplementation((selector) => {
        const state = {
          family: null,
          selectedMemberId: 'member-1',
        };
        return selector(state);
      });

      const { result } = renderHook(() => useSeriesOperations());

      await expect(
        result.current.addSeries({ name: 'Test', totalBooks: 3 })
      ).rejects.toThrow('No family loaded');
    });

    it('should add series without member selected (no createdBy)', async () => {
      (useFamilyStore as unknown as jest.Mock).mockImplementation((selector) => {
        const state = {
          family: mockFamily,
          selectedMemberId: null,
        };
        return selector(state);
      });
      (firestore.createSeries as jest.Mock).mockResolvedValue('new-series-id');

      const { result } = renderHook(() => useSeriesOperations());

      await act(async () => {
        const seriesId = await result.current.addSeries({
          name: 'Shared Series',
          totalBooks: 5,
        });
        expect(seriesId).toBe('new-series-id');
      });

      expect(firestore.createSeries).toHaveBeenCalledWith(
        'family-1',
        { name: 'Shared Series', totalBooks: 5 },
        undefined
      );
    });

    it('should edit series correctly', async () => {
      const { result } = renderHook(() => useSeriesOperations());

      await act(async () => {
        await result.current.editSeries('series-1', { name: 'Updated Name' });
      });

      expect(firestore.updateSeries).toHaveBeenCalledWith(
        'family-1',
        'series-1',
        { name: 'Updated Name' }
      );
    });

    it('should delete series correctly', async () => {
      const { result } = renderHook(() => useSeriesOperations());

      await act(async () => {
        await result.current.removeSeries('series-1');
      });

      expect(firestore.deleteSeries).toHaveBeenCalledWith(
        'family-1',
        'series-1'
      );
    });

    it('should fetch series correctly', async () => {
      (firestore.getSeriesById as jest.Mock).mockResolvedValue(mockSeries[0]);

      const { result } = renderHook(() => useSeriesOperations());

      let series;
      await act(async () => {
        series = await result.current.fetchSeries('series-1');
      });

      expect(series).toEqual(mockSeries[0]);
      expect(firestore.getSeriesById).toHaveBeenCalledWith(
        'family-1',
        'series-1'
      );
    });

    it('should add series to library', async () => {
      (firestore.addSeriesToMemberLibrary as jest.Mock).mockResolvedValue({ added: 5, skipped: 0 });

      const { result } = renderHook(() => useSeriesOperations());

      let res;
      await act(async () => {
        res = await result.current.addSeriesToLibrary('series-1');
      });

      expect(res).toEqual({ added: 5, skipped: 0 });
      expect(firestore.addSeriesToMemberLibrary).toHaveBeenCalledWith(
        'family-1',
        'member-1',
        'series-1',
        'to-read'
      );
    });
  });

  describe('useSeriesDetail', () => {
    it('should return series detail with sorted books', async () => {
      const { result } = renderHook(() => useSeriesDetail('series-1'));

      await waitFor(() => {
        expect(result.current.series).toBeDefined();
      });

      expect(result.current.series?.name).toBe('Harry Potter');
      expect(result.current.books.length).toBe(3);
      
      // Books should be sorted by seriesOrder
      expect(result.current.books[0].seriesOrder).toBe(1);
      expect(result.current.books[1].seriesOrder).toBe(2);
      expect(result.current.books[2].seriesOrder).toBe(3);
    });

    it('should return null for non-existent series', async () => {
      const { result } = renderHook(() => useSeriesDetail('non-existent'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.series).toBeNull();
      expect(result.current.books).toEqual([]);
    });

    it('should return null when seriesId is undefined', () => {
      const { result } = renderHook(() => useSeriesDetail(undefined));

      expect(result.current.series).toBeNull();
      expect(result.current.books).toEqual([]);
    });

    it('should show all family books in series with member status overlaid', async () => {
      // Family has 4 books in series, but member only has 2 in their library
      const familyBooksWithExtra: FamilyBook[] = [
        { id: 'book-1', title: 'Book 1', author: 'Author', addedBy: 'member-1', seriesId: 'series-1', seriesOrder: 1, addedAt: {} as any },
        { id: 'book-2', title: 'Book 2', author: 'Author', addedBy: 'member-1', seriesId: 'series-1', seriesOrder: 2, addedAt: {} as any },
        { id: 'book-3', title: 'Book 3', author: 'Author', addedBy: 'member-2', seriesId: 'series-1', seriesOrder: 3, addedAt: {} as any },
        { id: 'book-4', title: 'Book 4', author: 'Author', addedBy: 'member-2', seriesId: 'series-1', seriesOrder: 4, addedAt: {} as any },
      ];

      // Member only has books 1 and 2 in their library
      const memberLibrary: MemberLibraryEntry[] = [
        { id: 'entry-1', bookId: 'book-1', status: 'read', addedAt: {} as any },
        { id: 'entry-2', bookId: 'book-2', status: 'reading', addedAt: {} as any },
      ];

      (firestore.onFamilyBooksSnapshot as jest.Mock).mockImplementation((_familyId, callback) => {
        callback(familyBooksWithExtra);
        return jest.fn();
      });

      (firestore.onMemberLibrarySnapshot as jest.Mock).mockImplementation((_familyId, _memberId, callback) => {
        callback(memberLibrary);
        return jest.fn();
      });

      const { result } = renderHook(() => useSeriesDetail('series-1'));

      await waitFor(() => {
        expect(result.current.books.length).toBe(4);
      });

      // All 4 books should be shown
      expect(result.current.books.length).toBe(4);

      // Book 1 should have member's status (read) and be in library
      const book1 = result.current.books.find(b => b.id === 'book-1');
      expect(book1?.status).toBe('read');
      expect(book1?.isInLibrary).toBe(true);
      expect(book1?.libraryEntryId).toBe('entry-1');

      // Book 2 should have member's status (reading) and be in library
      const book2 = result.current.books.find(b => b.id === 'book-2');
      expect(book2?.status).toBe('reading');
      expect(book2?.isInLibrary).toBe(true);
      expect(book2?.libraryEntryId).toBe('entry-2');

      // Book 3 should have default status (to-read) and NOT be in library
      const book3 = result.current.books.find(b => b.id === 'book-3');
      expect(book3?.status).toBe('to-read');
      expect(book3?.isInLibrary).toBe(false);
      expect(book3?.libraryEntryId).toBeUndefined();

      // Book 4 should have default status (to-read) and NOT be in library
      const book4 = result.current.books.find(b => b.id === 'book-4');
      expect(book4?.status).toBe('to-read');
      expect(book4?.isInLibrary).toBe(false);
      expect(book4?.libraryEntryId).toBeUndefined();
    });

    it('should show all books as to-read when member has empty library', async () => {
      // Member has no books in their library
      (firestore.onMemberLibrarySnapshot as jest.Mock).mockImplementation((_familyId, _memberId, callback) => {
        callback([]);
        return jest.fn();
      });

      const { result } = renderHook(() => useSeriesDetail('series-1'));

      await waitFor(() => {
        expect(result.current.books.length).toBe(3);
      });

      // All books should show to-read status and not be in library
      result.current.books.forEach(book => {
        expect(book.status).toBe('to-read');
        expect(book.isInLibrary).toBe(false);
        expect(book.libraryEntryId).toBeUndefined();
      });
    });

    it('should include genres from family books', async () => {
      const familyBooksWithGenres: FamilyBook[] = [
        { id: 'book-1', title: 'Book 1', author: 'Author', addedBy: 'member-1', seriesId: 'series-1', seriesOrder: 1, genres: ['fantasy', 'adventure'], addedAt: {} as any },
        { id: 'book-2', title: 'Book 2', author: 'Author', addedBy: 'member-1', seriesId: 'series-1', seriesOrder: 2, genres: ['fantasy'], addedAt: {} as any },
        { id: 'book-3', title: 'Book 3', author: 'Author', addedBy: 'member-1', seriesId: 'series-1', seriesOrder: 3, addedAt: {} as any }, // No genres
      ];

      (firestore.onFamilyBooksSnapshot as jest.Mock).mockImplementation((_familyId, callback) => {
        callback(familyBooksWithGenres);
        return jest.fn();
      });

      (firestore.onMemberLibrarySnapshot as jest.Mock).mockImplementation((_familyId, _memberId, callback) => {
        callback([]);
        return jest.fn();
      });

      const { result } = renderHook(() => useSeriesDetail('series-1'));

      await waitFor(() => {
        expect(result.current.books.length).toBe(3);
      });

      // Book 1 should have both genres
      const book1 = result.current.books.find(b => b.id === 'book-1');
      expect(book1?.genres).toEqual(['fantasy', 'adventure']);

      // Book 2 should have one genre
      const book2 = result.current.books.find(b => b.id === 'book-2');
      expect(book2?.genres).toEqual(['fantasy']);

      // Book 3 should have no genres (undefined)
      const book3 = result.current.books.find(b => b.id === 'book-3');
      expect(book3?.genres).toBeUndefined();
    });
  });

  describe('progress calculation', () => {
    it('should calculate 0% progress when no books read', async () => {
      (firestore.onMemberLibrarySnapshot as jest.Mock).mockImplementation((_familyId, _memberId, callback) => {
        callback([
          { id: 'entry-1', bookId: 'book-1', status: 'to-read', addedAt: {} as any },
        ]);
        return jest.fn();
      });

      (firestore.onFamilyBooksSnapshot as jest.Mock).mockImplementation((_familyId, callback) => {
        callback([
          { id: 'book-1', title: 'Book 1', author: 'Author', addedBy: 'member-1', seriesId: 'series-1', seriesOrder: 1, addedAt: {} as any },
        ]);
        return jest.fn();
      });

      const { result } = renderHook(() => useSeries());

      await waitFor(() => {
        expect(result.current.series.length).toBe(2);
      });

      const series = result.current.series.find(s => s.id === 'series-1');
      expect(series?.booksRead).toBe(0);
      expect(series?.progressPercent).toBe(0);
    });

    it('should calculate 100% progress when all books read', async () => {
      (firestore.onSeriesSnapshot as jest.Mock).mockImplementation((_familyId, callback) => {
        callback([{ id: 'series-1', name: 'Complete Series', totalBooks: 2 }]);
        return jest.fn();
      });

      (firestore.onMemberLibrarySnapshot as jest.Mock).mockImplementation((_familyId, _memberId, callback) => {
        callback([
          { id: 'entry-1', bookId: 'book-1', status: 'read', addedAt: {} as any },
          { id: 'entry-2', bookId: 'book-2', status: 'read', addedAt: {} as any },
        ]);
        return jest.fn();
      });

      (firestore.onFamilyBooksSnapshot as jest.Mock).mockImplementation((_familyId, callback) => {
        callback([
          { id: 'book-1', title: 'Book 1', author: 'Author', addedBy: 'member-1', seriesId: 'series-1', seriesOrder: 1, addedAt: {} as any },
          { id: 'book-2', title: 'Book 2', author: 'Author', addedBy: 'member-1', seriesId: 'series-1', seriesOrder: 2, addedAt: {} as any },
        ]);
        return jest.fn();
      });

      const { result } = renderHook(() => useSeries());

      await waitFor(() => {
        expect(result.current.series.length).toBe(1);
      });

      const series = result.current.series[0];
      expect(series.booksRead).toBe(2);
      expect(series.progressPercent).toBe(100);
    });
  });
});
