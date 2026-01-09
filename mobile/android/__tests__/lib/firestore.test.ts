import {
  createFamily,
  getFamily,
  getFamilyByOwner,
  createMember,
  getMembers,
  createBook,
  getBooks,
  updateBook,
  createSeries,
  getSeries,
  getSeriesById,
  updateSeries,
  deleteSeries,
} from '../../lib/firestore';
import firestore from '@react-native-firebase/firestore';

describe('Firestore Helpers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Family Operations', () => {
    it('should create a family', async () => {
      const familyData = { name: 'Test Family', ownerId: 'user-123' };
      
      const id = await createFamily(familyData);
      
      expect(id).toBe('mock-doc-id');
      expect(firestore().collection).toHaveBeenCalledWith('families');
    });

    it('should get a family by ID', async () => {
      const family = await getFamily('family-123');
      
      expect(firestore().collection).toHaveBeenCalledWith('families');
    });

    it('should get a family by owner ID', async () => {
      await getFamilyByOwner('owner-123');
      
      expect(firestore().collection).toHaveBeenCalledWith('families');
    });
  });

  describe('Member Operations', () => {
    it('should create a member', async () => {
      const memberData = { name: 'Test Member', color: '#FF0000' };
      
      const id = await createMember('family-123', memberData);
      
      expect(id).toBe('mock-doc-id');
    });

    it('should get members for a family', async () => {
      const members = await getMembers('family-123');
      
      expect(Array.isArray(members)).toBe(true);
    });
  });

  describe('Book Operations', () => {
    it('should create a book', async () => {
      const bookData = {
        title: 'Test Book',
        author: 'Test Author',
        status: 'to-read' as const,
      };
      
      const id = await createBook('family-123', 'member-123', bookData);
      
      expect(id).toBe('mock-doc-id');
    });

    it('should get books for a member', async () => {
      const books = await getBooks('family-123', 'member-123');
      
      expect(Array.isArray(books)).toBe(true);
    });

    it('should create a book with series linking', async () => {
      const bookData = {
        title: 'Harry Potter 1',
        author: 'J.K. Rowling',
        status: 'to-read' as const,
        seriesId: 'series-hp',
        seriesOrder: 1,
      };
      
      const id = await createBook('family-123', 'member-123', bookData);
      
      expect(id).toBe('mock-doc-id');
    });

    it('should update a book with series info', async () => {
      await updateBook('family-123', 'member-123', 'book-123', {
        seriesId: 'series-hp',
        seriesOrder: 2,
      });
      
      // Verify update was called (mock implementation)
      expect(firestore().collection).toHaveBeenCalled();
    });
  });

  describe('Series Operations', () => {
    it('should create a series', async () => {
      const seriesData = {
        name: 'Test Series',
        totalBooks: 5,
      };
      
      const id = await createSeries('family-123', 'member-123', seriesData);
      
      expect(id).toBe('mock-doc-id');
    });

    it('should create a series with genre', async () => {
      const seriesData = {
        name: 'Fantasy Series',
        totalBooks: 7,
        genreId: 'fantasy',
      };
      
      const id = await createSeries('family-123', 'member-123', seriesData);
      
      expect(id).toBe('mock-doc-id');
    });

    it('should get series for a member', async () => {
      const series = await getSeries('family-123', 'member-123');
      
      expect(Array.isArray(series)).toBe(true);
    });

    it('should get a series by ID', async () => {
      const series = await getSeriesById('family-123', 'member-123', 'series-123');
      
      expect(firestore().collection).toHaveBeenCalled();
    });

    it('should update a series', async () => {
      await updateSeries('family-123', 'member-123', 'series-123', {
        name: 'Updated Series Name',
        totalBooks: 10,
      });
      
      expect(firestore().collection).toHaveBeenCalled();
    });

    it('should update series totalBooks only', async () => {
      await updateSeries('family-123', 'member-123', 'series-123', {
        totalBooks: 8,
      });
      
      expect(firestore().collection).toHaveBeenCalled();
    });

    it('should delete a series', async () => {
      await deleteSeries('family-123', 'member-123', 'series-123');
      
      expect(firestore().collection).toHaveBeenCalled();
    });
  });

  describe('Book-Series Linking', () => {
    it('should create a book linked to a series', async () => {
      const bookData = {
        title: 'The Fellowship of the Ring',
        author: 'J.R.R. Tolkien',
        status: 'reading' as const,
        seriesId: 'series-lotr',
        seriesOrder: 1,
      };
      
      const id = await createBook('family-123', 'member-123', bookData);
      
      expect(id).toBe('mock-doc-id');
    });

    it('should update a book to link to a series', async () => {
      await updateBook('family-123', 'member-123', 'book-123', {
        seriesId: 'series-hp',
        seriesOrder: 3,
      });
      
      expect(firestore().collection).toHaveBeenCalled();
    });

    it('should update a book to remove from series', async () => {
      await updateBook('family-123', 'member-123', 'book-123', {
        seriesId: undefined,
        seriesOrder: undefined,
      });
      
      expect(firestore().collection).toHaveBeenCalled();
    });
  });
});

