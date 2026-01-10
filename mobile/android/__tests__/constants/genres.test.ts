/**
 * Tests for genre utilities
 * 
 * Tests the genre lookup, normalization, and frequency calculation functions.
 */

import {
  normalizeGenre,
  getGenreDisplay,
  getGenreColor,
  normalizeApiCategory,
  normalizeApiCategories,
  getGenresByFrequency,
  GENRE_LOOKUP,
  DEFAULT_GENRE_COLOR,
  COMMON_GENRES,
} from '@/constants/genres';

// Mock i18next
const mockT = (key: string) => {
  const translations: Record<string, string> = {
    'genres.fiction': 'Fiction',
    'genres.fantasy': 'Fantasy',
    'genres.sciFi': 'Sci-Fi',
    'genres.children': "Children's",
    'genres.biography': 'Biography',
    'genres.history': 'History',
    'genres.mystery': 'Mystery',
    'genres.youngAdult': 'Young Adult',
  };
  return translations[key] || key;
};

describe('Genre Constants', () => {
  describe('GENRE_LOOKUP', () => {
    it('should have entries for common genres', () => {
      expect(GENRE_LOOKUP['fiction']).toBeDefined();
      expect(GENRE_LOOKUP['fantasy']).toBeDefined();
      expect(GENRE_LOOKUP['science fiction']).toBeDefined();
    });

    it('should have translationKey and color for each entry', () => {
      Object.values(GENRE_LOOKUP).forEach(entry => {
        expect(entry.translationKey).toBeDefined();
        expect(entry.translationKey).toMatch(/^genres\./);
        expect(entry.color).toBeDefined();
        expect(entry.color).toMatch(/^#[0-9A-F]{6}$/i);
      });
    });
  });

  describe('COMMON_GENRES', () => {
    it('should be a non-empty array of strings', () => {
      expect(Array.isArray(COMMON_GENRES)).toBe(true);
      expect(COMMON_GENRES.length).toBeGreaterThan(0);
      COMMON_GENRES.forEach(genre => {
        expect(typeof genre).toBe('string');
      });
    });

    it('should contain popular genres', () => {
      expect(COMMON_GENRES).toContain('fiction');
      expect(COMMON_GENRES).toContain('fantasy');
      expect(COMMON_GENRES).toContain('mystery');
    });
  });
});

describe('normalizeGenre', () => {
  it('should lowercase the genre', () => {
    expect(normalizeGenre('Fantasy')).toBe('fantasy');
    expect(normalizeGenre('FICTION')).toBe('fiction');
  });

  it('should trim whitespace', () => {
    expect(normalizeGenre('  fantasy  ')).toBe('fantasy');
    expect(normalizeGenre('\thistory\n')).toBe('history');
  });

  it('should handle already normalized genres', () => {
    expect(normalizeGenre('mystery')).toBe('mystery');
  });
});

describe('getGenreDisplay', () => {
  it('should return translated name and color for known genres', () => {
    const result = getGenreDisplay('Fantasy', mockT as any);
    
    expect(result.name).toBe('Fantasy');
    expect(result.color).toBe('#9C27B0'); // Purple for fantasy
  });

  it('should be case-insensitive', () => {
    const result1 = getGenreDisplay('FANTASY', mockT as any);
    const result2 = getGenreDisplay('fantasy', mockT as any);
    
    expect(result1.name).toBe(result2.name);
    expect(result1.color).toBe(result2.color);
  });

  it('should return original name and default color for unknown genres', () => {
    const result = getGenreDisplay('Custom Genre', mockT as any);
    
    expect(result.name).toBe('Custom Genre');
    expect(result.color).toBe(DEFAULT_GENRE_COLOR);
  });

  it('should handle aliases (e.g., sci-fi = science fiction)', () => {
    const result = getGenreDisplay('sci-fi', mockT as any);
    
    expect(result.name).toBe('Sci-Fi');
    expect(result.color).toBe('#00BCD4'); // Cyan for sci-fi
  });
});

describe('getGenreColor', () => {
  it('should return color for known genres', () => {
    expect(getGenreColor('fantasy')).toBe('#9C27B0');
    expect(getGenreColor('fiction')).toBe('#4CAF50');
  });

  it('should return default color for unknown genres', () => {
    expect(getGenreColor('My Custom Genre')).toBe(DEFAULT_GENRE_COLOR);
  });

  it('should be case-insensitive', () => {
    expect(getGenreColor('FANTASY')).toBe(getGenreColor('fantasy'));
  });
});

describe('normalizeApiCategory', () => {
  it('should extract most specific matching genre from path', () => {
    // "Fiction / Fantasy / Epic" should become "fantasy"
    expect(normalizeApiCategory('Fiction / Fantasy / Epic')).toBe('fantasy');
  });

  it('should handle Juvenile Fiction as children', () => {
    expect(normalizeApiCategory('Juvenile Fiction')).toBe('children');
    expect(normalizeApiCategory('Juvenile Nonfiction / Animals')).toBe('children');
  });

  it('should handle Young Adult categories', () => {
    expect(normalizeApiCategory('Young Adult Fiction')).toBe('young adult');
    expect(normalizeApiCategory('Young Adult / Fantasy')).toBe('young adult');
  });

  it('should handle Science Fiction variations', () => {
    expect(normalizeApiCategory('Fiction / Science Fiction')).toBe('science fiction');
    // sci-fi is a valid lookup key, so it stays as sci-fi
    expect(normalizeApiCategory('Sci-Fi / Space Opera')).toBe('sci-fi');
  });

  it('should return first part as-is for unrecognized categories', () => {
    const result = normalizeApiCategory('Very Specific / Unknown / Category');
    expect(result).toBe('very specific');
  });

  it('should handle single-part categories', () => {
    expect(normalizeApiCategory('Fiction')).toBe('fiction');
    expect(normalizeApiCategory('Biography')).toBe('biography');
  });
});

describe('normalizeApiCategories', () => {
  it('should normalize and deduplicate categories', () => {
    const categories = [
      'Fiction / Fantasy / Epic',  // -> fantasy (most specific match)
      'Fiction / Adventure',        // -> adventure
      'Fantasy',                    // -> fantasy
    ];
    
    const result = normalizeApiCategories(categories);
    
    // Should have fantasy, adventure (deduplicated)
    expect(result).toContain('fantasy');
    expect(result).toContain('adventure');
    // Fantasy appears twice but should be deduplicated
    expect(result.filter(g => g === 'fantasy').length).toBe(1);
    expect(result.length).toBe(2);
  });

  it('should handle empty array', () => {
    expect(normalizeApiCategories([])).toEqual([]);
  });

  it('should handle single category', () => {
    const result = normalizeApiCategories(['Fiction']);
    expect(result).toEqual(['fiction']);
  });
});

describe('getGenresByFrequency', () => {
  it('should sort genres by frequency (most common first)', () => {
    const bookGenres = [
      ['fantasy', 'fiction'],
      ['fantasy', 'adventure'],
      ['fantasy'],
      ['mystery'],
    ];
    
    const result = getGenresByFrequency(bookGenres);
    
    // Fantasy appears 3 times, should be first
    expect(result[0]).toBe('fantasy');
  });

  it('should sort alphabetically when frequency is equal', () => {
    const bookGenres = [
      ['mystery', 'thriller'],
      ['fantasy', 'adventure'],
    ];
    
    const result = getGenresByFrequency(bookGenres);
    
    // All appear once, should be alphabetical
    expect(result).toEqual(['adventure', 'fantasy', 'mystery', 'thriller']);
  });

  it('should handle undefined entries', () => {
    const bookGenres = [
      ['fantasy'],
      undefined,
      ['fantasy', 'mystery'],
      undefined,
    ];
    
    const result = getGenresByFrequency(bookGenres);
    
    expect(result).toContain('fantasy');
    expect(result).toContain('mystery');
    expect(result.length).toBe(2);
  });

  it('should handle empty array', () => {
    expect(getGenresByFrequency([])).toEqual([]);
  });

  it('should handle array of undefined/empty', () => {
    const bookGenres = [undefined, [], undefined];
    expect(getGenresByFrequency(bookGenres)).toEqual([]);
  });

  it('should normalize genres before counting', () => {
    const bookGenres = [
      ['Fantasy'],
      ['FANTASY'],
      ['fantasy'],
    ];
    
    const result = getGenresByFrequency(bookGenres);
    
    // All should be normalized to "fantasy" and counted together
    expect(result).toEqual(['fantasy']);
  });
});

// Mutation test: verify tests catch breaking changes
describe('Mutation tests', () => {
  it('should detect if normalizeGenre stops lowercasing', () => {
    // This test verifies our tests would catch if someone removed .toLowerCase()
    const input = 'FANTASY';
    const result = normalizeGenre(input);
    expect(result).not.toBe(input); // Must be different (lowercased)
  });

  it('should detect if getGenreColor returns wrong color', () => {
    // This test verifies we're checking actual colors
    const fantasyColor = getGenreColor('fantasy');
    expect(fantasyColor).not.toBe('#000000'); // Not black
    expect(fantasyColor).not.toBe(DEFAULT_GENRE_COLOR); // Not default
  });

  it('should detect if frequency sorting is broken', () => {
    const bookGenres = [
      ['rare'],
      ['common', 'rare'],
      ['common'],
      ['common'],
    ];
    
    const result = getGenresByFrequency(bookGenres);
    
    // Common should be first (3 occurrences vs 2)
    expect(result[0]).toBe('common');
    expect(result.indexOf('common')).toBeLessThan(result.indexOf('rare'));
  });
});

