import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useSeries, useSeriesOperations, useSeriesDetail, SeriesWithProgress } from '@/hooks/use-series';
import { useFamilyStore } from '@/stores/family-store';
import * as firestore from '@/lib/firestore';
import type { Series, Book, Family } from '@/types/models';

// Mock the firestore module
jest.mock('@/lib/firestore', () => ({
  createSeries: jest.fn(),
  updateSeries: jest.fn(),
  deleteSeries: jest.fn(),
  getSeriesById: jest.fn(),
  onSeriesSnapshot: jest.fn(),
  onBooksSnapshot: jest.fn(),
}));

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
  { id: 'series-1', memberId: 'member-1', name: 'Harry Potter', totalBooks: 7 },
  { id: 'series-2', memberId: 'member-1', name: 'Percy Jackson', totalBooks: 5, genreId: 'fantasy' },
];

const mockBooks: Book[] = [
  { id: 'book-1', memberId: 'member-1', title: 'Book 1', author: 'Author', status: 'read', seriesId: 'series-1', seriesOrder: 1, addedAt: {} as any },
  { id: 'book-2', memberId: 'member-1', title: 'Book 2', author: 'Author', status: 'reading', seriesId: 'series-1', seriesOrder: 2, addedAt: {} as any },
  { id: 'book-3', memberId: 'member-1', title: 'Book 3', author: 'Author', status: 'to-read', seriesId: 'series-1', seriesOrder: 3, addedAt: {} as any },
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
    (firestore.onSeriesSnapshot as jest.Mock).mockImplementation((_familyId, _memberId, callback) => {
      callback(mockSeries);
      return jest.fn(); // unsubscribe function
    });

    // Default mock implementation for onBooksSnapshot
    (firestore.onBooksSnapshot as jest.Mock).mockImplementation((_familyId, _memberId, callback) => {
      callback(mockBooks);
      return jest.fn(); // unsubscribe function
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
      expect(harryPotterSeries?.progressPercent).toBe(14); // 1/7 = ~14%
    });

    it('should return empty series when no member selected', async () => {
      (useFamilyStore as unknown as jest.Mock).mockImplementation((selector) => {
        const state = {
          family: mockFamily,
          selectedMemberId: null,
        };
        return selector(state);
      });

      const { result } = renderHook(() => useSeries());

      expect(result.current.series).toEqual([]);
      expect(result.current.totalSeries).toBe(0);
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
        'member-1',
        { name: 'New Series', totalBooks: 3 }
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

    it('should throw error when no member selected', async () => {
      (useFamilyStore as unknown as jest.Mock).mockImplementation((selector) => {
        const state = {
          family: mockFamily,
          selectedMemberId: null,
        };
        return selector(state);
      });

      const { result } = renderHook(() => useSeriesOperations());

      await expect(
        result.current.addSeries({ name: 'Test', totalBooks: 3 })
      ).rejects.toThrow('No member selected');
    });

    it('should edit series correctly', async () => {
      const { result } = renderHook(() => useSeriesOperations());

      await act(async () => {
        await result.current.editSeries('series-1', { name: 'Updated Name' });
      });

      expect(firestore.updateSeries).toHaveBeenCalledWith(
        'family-1',
        'member-1',
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
        'member-1',
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
        'member-1',
        'series-1'
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
  });

  describe('progress calculation', () => {
    it('should calculate 0% progress when no books read', async () => {
      (firestore.onBooksSnapshot as jest.Mock).mockImplementation((_familyId, _memberId, callback) => {
        callback([
          { id: 'book-1', memberId: 'member-1', title: 'Book 1', author: 'Author', status: 'to-read', seriesId: 'series-1', seriesOrder: 1, addedAt: {} as any },
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
      (firestore.onSeriesSnapshot as jest.Mock).mockImplementation((_familyId, _memberId, callback) => {
        callback([{ id: 'series-1', memberId: 'member-1', name: 'Complete Series', totalBooks: 2 }]);
        return jest.fn();
      });

      (firestore.onBooksSnapshot as jest.Mock).mockImplementation((_familyId, _memberId, callback) => {
        callback([
          { id: 'book-1', memberId: 'member-1', title: 'Book 1', author: 'Author', status: 'read', seriesId: 'series-1', seriesOrder: 1, addedAt: {} as any },
          { id: 'book-2', memberId: 'member-1', title: 'Book 2', author: 'Author', status: 'read', seriesId: 'series-1', seriesOrder: 2, addedAt: {} as any },
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

