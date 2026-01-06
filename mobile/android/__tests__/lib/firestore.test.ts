import {
  createFamily,
  getFamily,
  getFamilyByOwner,
  createMember,
  getMembers,
  createBook,
  getBooks,
  createSeries,
  getSeries,
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

    it('should get series for a member', async () => {
      const series = await getSeries('family-123', 'member-123');
      
      expect(Array.isArray(series)).toBe(true);
    });
  });
});

