import {
  createFamily,
  getFamily,
  getFamilyByOwner,
  createMember,
  getMembers,
  findOrCreateFamilyBook,
  createFamilyBook,
  getFamilyBook,
  getAllFamilyBooks,
  getSeriesBooksFromCatalog,
  updateFamilyBook,
  addToMemberLibrary,
  getMemberLibraryEntries,
  getMemberLibrary,
  updateMemberLibraryEntry,
  removeFromMemberLibrary,
  addSeriesToMemberLibrary,
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

  describe('Family Book Catalog Operations', () => {
    it('should create a family book', async () => {
      const bookData = {
        title: 'Test Book',
        author: 'Test Author',
        addedBy: 'member-123',
      };
      
      const id = await createFamilyBook('family-123', bookData);
      
      expect(id).toBe('mock-doc-id');
      expect(firestore().collection).toHaveBeenCalledWith('families');
    });

    it('should create a family book with series info', async () => {
      const bookData = {
        title: 'Harry Potter 1',
        author: 'J.K. Rowling',
        addedBy: 'member-123',
        seriesId: 'series-hp',
        seriesOrder: 1,
      };
      
      const id = await createFamilyBook('family-123', bookData);
      
      expect(id).toBe('mock-doc-id');
    });

    it('should find or create a family book', async () => {
      const bookData = {
        title: 'New Book',
        author: 'New Author',
        addedBy: 'member-123',
      };
      
      const result = await findOrCreateFamilyBook('family-123', bookData);
      
      expect(result.bookId).toBeDefined();
      expect(typeof result.isNew).toBe('boolean');
    });

    it('should get a family book by ID', async () => {
      const book = await getFamilyBook('family-123', 'book-123');
      
      expect(firestore().collection).toHaveBeenCalledWith('families');
    });

    it('should get all family books', async () => {
      const books = await getAllFamilyBooks('family-123');
      
      expect(Array.isArray(books)).toBe(true);
    });

    it('should get series books from catalog', async () => {
      const books = await getSeriesBooksFromCatalog('family-123', 'series-123');
      
      expect(Array.isArray(books)).toBe(true);
      expect(firestore().collection).toHaveBeenCalled();
    });

    it('should update a family book with series info', async () => {
      await updateFamilyBook('family-123', 'book-123', {
        seriesId: 'series-hp',
        seriesOrder: 2,
      });
      
      expect(firestore().collection).toHaveBeenCalled();
    });
  });

  describe('Member Library Operations', () => {
    it('should add a book to member library', async () => {
      const id = await addToMemberLibrary('family-123', 'member-123', 'book-123', 'to-read');
      
      expect(id).toBeDefined();
      expect(firestore().collection).toHaveBeenCalled();
    });

    it('should get member library entries', async () => {
      const entries = await getMemberLibraryEntries('family-123', 'member-123');
      
      expect(Array.isArray(entries)).toBe(true);
    });

    it('should get member library with full book details', async () => {
      const books = await getMemberLibrary('family-123', 'member-123');
      
      expect(Array.isArray(books)).toBe(true);
    });

    it('should update member library entry status', async () => {
      await updateMemberLibraryEntry('family-123', 'member-123', 'entry-123', {
        status: 'read',
      });
      
      expect(firestore().collection).toHaveBeenCalled();
    });

    it('should remove book from member library', async () => {
      await removeFromMemberLibrary('family-123', 'member-123', 'entry-123');
      
      expect(firestore().collection).toHaveBeenCalled();
    });

    it('should add series to member library', async () => {
      const result = await addSeriesToMemberLibrary('family-123', 'member-123', 'series-123', 'to-read');
      
      expect(typeof result.added).toBe('number');
      expect(typeof result.skipped).toBe('number');
    });
  });

  describe('Series Operations', () => {
    it('should create a series at family level', async () => {
      const seriesData = {
        name: 'Test Series',
        totalBooks: 5,
      };
      
      const id = await createSeries('family-123', seriesData);
      
      expect(id).toBe('mock-doc-id');
    });

    it('should create a series with createdBy', async () => {
      const seriesData = {
        name: 'Fantasy Series',
        totalBooks: 7,
        genreId: 'fantasy',
      };
      
      const id = await createSeries('family-123', seriesData, 'member-123');
      
      expect(id).toBe('mock-doc-id');
    });

    it('should get series for a family', async () => {
      const series = await getSeries('family-123');
      
      expect(Array.isArray(series)).toBe(true);
    });

    it('should get a series by ID', async () => {
      const series = await getSeriesById('family-123', 'series-123');
      
      expect(firestore().collection).toHaveBeenCalled();
    });

    it('should update a series', async () => {
      await updateSeries('family-123', 'series-123', {
        name: 'Updated Series Name',
        totalBooks: 10,
      });
      
      expect(firestore().collection).toHaveBeenCalled();
    });

    it('should update series totalBooks only', async () => {
      await updateSeries('family-123', 'series-123', {
        totalBooks: 8,
      });
      
      expect(firestore().collection).toHaveBeenCalled();
    });

    it('should delete a series', async () => {
      await deleteSeries('family-123', 'series-123');
      
      expect(firestore().collection).toHaveBeenCalled();
    });
  });
});
