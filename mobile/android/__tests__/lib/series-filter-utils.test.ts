import { filterSeries } from '../../lib/series-filter-utils';

const createSeries = (
  id: string,
  name: string,
  isInLibrary: boolean,
  status?: 'to-read' | 'reading' | 'read' | 'stopped'
) => ({
  id,
  name,
  isInLibrary,
  ...(status && { status }),
});

describe('series-filter-utils', () => {
  const inLibrarySeries = [
    createSeries('1', 'Harry Potter', true),
    createSeries('2', 'Lord of the Rings', true),
  ];
  const notInLibrarySeries = [
    createSeries('3', 'Game of Thrones', false),
    createSeries('4', 'Wheel of Time', false),
  ];
  const allSeries = [...inLibrarySeries, ...notInLibrarySeries];

  describe('filterSeries', () => {
    describe('tab filter', () => {
      it('should filter by inLibrary tab when search is empty', () => {
        const result = filterSeries(allSeries, 'inLibrary', '');
        expect(result).toHaveLength(2);
        expect(result.every((s) => s.isInLibrary)).toBe(true);
        expect(result.map((s) => s.name)).toEqual(['Harry Potter', 'Lord of the Rings']);
      });

      it('should filter by notInLibrary tab when search is empty', () => {
        const result = filterSeries(allSeries, 'notInLibrary', '');
        expect(result).toHaveLength(2);
        expect(result.every((s) => !s.isInLibrary)).toBe(true);
        expect(result.map((s) => s.name)).toEqual(['Game of Thrones', 'Wheel of Time']);
      });
    });

    describe('search filter', () => {
      it('should filter by name match across both tabs when search has text', () => {
        const result = filterSeries(allSeries, 'inLibrary', 'Harry');
        expect(result).toHaveLength(1);
        expect(result[0].name).toBe('Harry Potter');
      });

      it('should return matching series from both tabs when searching', () => {
        const result = filterSeries(allSeries, 'inLibrary', 'of');
        expect(result).toHaveLength(3);
        expect(result.map((s) => s.name)).toEqual(
          expect.arrayContaining([
            'Lord of the Rings',
            'Game of Thrones',
            'Wheel of Time',
          ])
        );
      });

      it('should be case insensitive when searching', () => {
        const result = filterSeries(allSeries, 'notInLibrary', 'GAME');
        expect(result).toHaveLength(1);
        expect(result[0].name).toBe('Game of Thrones');
      });

      it('should trim whitespace from search query', () => {
        const result = filterSeries(allSeries, 'inLibrary', '  Harry  ');
        expect(result).toHaveLength(1);
        expect(result[0].name).toBe('Harry Potter');
      });

      it('should return empty array when no series match search', () => {
        const result = filterSeries(allSeries, 'inLibrary', 'nonexistent');
        expect(result).toHaveLength(0);
      });
    });

    describe('combined behavior', () => {
      it('should override tab filter when search has text', () => {
        const result = filterSeries(allSeries, 'inLibrary', 'Thrones');
        expect(result).toHaveLength(1);
        expect(result[0].name).toBe('Game of Thrones');
        expect(result[0].isInLibrary).toBe(false);
      });

      it('should revert to tab filter when search is cleared', () => {
        const withSearch = filterSeries(allSeries, 'inLibrary', 'Harry');
        const withoutSearch = filterSeries(allSeries, 'inLibrary', '');
        expect(withSearch.length).toBe(1);
        expect(withoutSearch.length).toBe(2);
        expect(withoutSearch.every((s) => s.isInLibrary)).toBe(true);
      });
    });

    describe('edge cases', () => {
      it('should return empty array when input is empty', () => {
        expect(filterSeries([], 'inLibrary', '')).toEqual([]);
        expect(filterSeries([], 'notInLibrary', 'search')).toEqual([]);
      });
    });

    describe('status filter', () => {
      it('should filter by status when on inLibrary tab and statusFilter provided', () => {
        const seriesWithStatus = [
          createSeries('1', 'Reading Series', true, 'reading'),
          createSeries('2', 'Read Series', true, 'read'),
          createSeries('3', 'To Read Series', true, 'to-read'),
        ];
        const result = filterSeries(seriesWithStatus, 'inLibrary', '', 'reading');
        expect(result).toHaveLength(1);
        expect(result[0].name).toBe('Reading Series');
        expect((result[0] as { status?: string }).status).toBe('reading');
      });

      it('should not apply status filter when statusFilter is all', () => {
        const seriesWithStatus = [
          createSeries('1', 'A', true, 'reading'),
          createSeries('2', 'B', true, 'read'),
        ];
        const result = filterSeries(seriesWithStatus, 'inLibrary', '', 'all');
        expect(result).toHaveLength(2);
      });
    });
  });
});
