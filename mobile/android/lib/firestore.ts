import firestore from '@react-native-firebase/firestore';
import type { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';
import type { 
  Family, 
  Member, 
  FamilyBook, 
  MemberLibraryEntry, 
  MemberBook,
  Series, 
  BookStatus,
  CreateFamily, 
  CreateMember, 
  CreateFamilyBook,
  CreateSeries 
} from '@/types/models';

type DocumentSnapshot = FirebaseFirestoreTypes.DocumentSnapshot;
type QuerySnapshot = FirebaseFirestoreTypes.QuerySnapshot;

// Collection references
export const familiesCollection = () => firestore().collection('families');
export const membersCollection = (familyId: string) => 
  firestore().collection('families').doc(familyId).collection('members');
export const familyBooksCollection = (familyId: string) =>
  firestore().collection('families').doc(familyId).collection('books');
export const memberLibraryCollection = (familyId: string, memberId: string) =>
  firestore().collection('families').doc(familyId).collection('members').doc(memberId).collection('library');
export const seriesCollection = (familyId: string) =>
  firestore().collection('families').doc(familyId).collection('series');

// Timestamp helper
export const serverTimestamp = () => firestore.FieldValue.serverTimestamp();

// ============================================================================
// Family operations
// ============================================================================

export async function createFamily(data: Omit<CreateFamily, 'createdAt'>): Promise<string> {
  const docRef = await familiesCollection().add({
    ...data,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function getFamily(familyId: string): Promise<Family | null> {
  const doc = await familiesCollection().doc(familyId).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...doc.data() } as Family;
}

export async function getFamilyByOwner(ownerId: string): Promise<Family | null> {
  const snapshot = await familiesCollection()
    .where('ownerId', '==', ownerId)
    .limit(1)
    .get();
  
  if (snapshot.empty) return null;
  const doc = snapshot.docs[0];
  return { id: doc.id, ...doc.data() } as Family;
}

// ============================================================================
// Member operations
// ============================================================================

export async function createMember(familyId: string, data: Omit<CreateMember, 'familyId'>): Promise<string> {
  const docRef = await membersCollection(familyId).add({
    ...data,
    familyId,
  });
  return docRef.id;
}

export async function getMembers(familyId: string): Promise<Member[]> {
  const snapshot = await membersCollection(familyId).get();
  return snapshot.docs.map((doc: DocumentSnapshot) => ({ id: doc.id, ...doc.data() }) as Member);
}

export async function getMember(familyId: string, memberId: string): Promise<Member | null> {
  const doc = await membersCollection(familyId).doc(memberId).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...doc.data() } as Member;
}

export async function updateMember(familyId: string, memberId: string, data: Partial<Member>): Promise<void> {
  const { id, ...updateData } = data;
  await membersCollection(familyId).doc(memberId).update(updateData);
}

export async function deleteMember(familyId: string, memberId: string): Promise<void> {
  await membersCollection(familyId).doc(memberId).delete();
}

// ============================================================================
// Family Book Catalog operations
// ============================================================================

/**
 * Find an existing family book by googleBooksId or title+author
 */
export async function findFamilyBook(
  familyId: string,
  googleBooksId?: string,
  title?: string,
  author?: string
): Promise<FamilyBook | null> {
  // Try to find by googleBooksId first (most reliable)
  if (googleBooksId) {
    const snapshot = await familyBooksCollection(familyId)
      .where('googleBooksId', '==', googleBooksId)
      .limit(1)
      .get();
    
    if (!snapshot.empty) {
      const doc = snapshot.docs[0];
      return { id: doc.id, ...doc.data() } as FamilyBook;
    }
  }

  // Fall back to title+author matching
  if (title && author) {
    const snapshot = await familyBooksCollection(familyId)
      .where('title', '==', title)
      .where('author', '==', author)
      .limit(1)
      .get();
    
    if (!snapshot.empty) {
      const doc = snapshot.docs[0];
      return { id: doc.id, ...doc.data() } as FamilyBook;
    }
  }

  return null;
}

/**
 * Create a new book in the family catalog
 */
export async function createFamilyBook(
  familyId: string,
  data: Omit<CreateFamilyBook, 'addedAt'>
): Promise<string> {
  // Filter out undefined values - Firestore doesn't accept them
  const cleanData = Object.fromEntries(
    Object.entries(data).filter(([_, value]) => value !== undefined)
  );
  
  const docRef = await familyBooksCollection(familyId).add({
    ...cleanData,
    addedAt: serverTimestamp(),
  });
  return docRef.id;
}

/**
 * Find or create a family book - returns the book ID
 */
export async function findOrCreateFamilyBook(
  familyId: string,
  data: Omit<CreateFamilyBook, 'addedAt'>
): Promise<{ bookId: string; isNew: boolean }> {
  // Try to find existing book
  const existing = await findFamilyBook(familyId, data.googleBooksId, data.title, data.author);
  
  if (existing) {
    return { bookId: existing.id, isNew: false };
  }
  
  // Create new book
  const bookId = await createFamilyBook(familyId, data);
  return { bookId, isNew: true };
}

/**
 * Get a family book by ID
 */
export async function getFamilyBook(familyId: string, bookId: string): Promise<FamilyBook | null> {
  const doc = await familyBooksCollection(familyId).doc(bookId).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...doc.data() } as FamilyBook;
}

/**
 * Get all books in the family catalog
 */
export async function getAllFamilyBooks(familyId: string): Promise<FamilyBook[]> {
  const snapshot = await familyBooksCollection(familyId)
    .orderBy('addedAt', 'desc')
    .get();
  return snapshot.docs.map((doc: DocumentSnapshot) => ({ id: doc.id, ...doc.data() }) as FamilyBook);
}

/**
 * Get all family books in a specific series
 */
export async function getSeriesBooksFromCatalog(familyId: string, seriesId: string): Promise<FamilyBook[]> {
  const snapshot = await familyBooksCollection(familyId)
    .where('seriesId', '==', seriesId)
    .orderBy('seriesOrder', 'asc')
    .get();
  return snapshot.docs.map((doc: DocumentSnapshot) => ({ id: doc.id, ...doc.data() }) as FamilyBook);
}

/**
 * Update a family book
 */
export async function updateFamilyBook(
  familyId: string,
  bookId: string,
  data: Partial<FamilyBook>
): Promise<void> {
  const { id, ...updateData } = data;
  await familyBooksCollection(familyId).doc(bookId).update(updateData);
}

/**
 * Delete a family book
 */
export async function deleteFamilyBook(familyId: string, bookId: string): Promise<void> {
  await familyBooksCollection(familyId).doc(bookId).delete();
}

// ============================================================================
// Member Library operations
// ============================================================================

/**
 * Check if a book is already in a member's library
 */
export async function isBookInMemberLibrary(
  familyId: string,
  memberId: string,
  bookId: string
): Promise<MemberLibraryEntry | null> {
  const snapshot = await memberLibraryCollection(familyId, memberId)
    .where('bookId', '==', bookId)
    .limit(1)
    .get();
  
  if (snapshot.empty) return null;
  const doc = snapshot.docs[0];
  return { id: doc.id, ...doc.data() } as MemberLibraryEntry;
}

/**
 * Add a book to a member's library
 */
export async function addToMemberLibrary(
  familyId: string,
  memberId: string,
  bookId: string,
  status: BookStatus = 'to-read'
): Promise<string> {
  // Check if already in library
  const existing = await isBookInMemberLibrary(familyId, memberId, bookId);
  if (existing) {
    return existing.id;
  }

  const docRef = await memberLibraryCollection(familyId, memberId).add({
    bookId,
    status,
    addedAt: serverTimestamp(),
  });
  return docRef.id;
}

/**
 * Get a member's library entries (raw, without book details)
 */
export async function getMemberLibraryEntries(
  familyId: string,
  memberId: string
): Promise<MemberLibraryEntry[]> {
  const snapshot = await memberLibraryCollection(familyId, memberId)
    .orderBy('addedAt', 'desc')
    .get();
  return snapshot.docs.map((doc: DocumentSnapshot) => ({ id: doc.id, ...doc.data() }) as MemberLibraryEntry);
}

/**
 * Get a member's library with full book details (joined data)
 */
export async function getMemberLibrary(
  familyId: string,
  memberId: string
): Promise<MemberBook[]> {
  // Get library entries
  const libraryEntries = await getMemberLibraryEntries(familyId, memberId);
  
  if (libraryEntries.length === 0) return [];
  
  // Get all family books
  const allBooks = await getAllFamilyBooks(familyId);
  const booksMap = new Map(allBooks.map(b => [b.id, b]));
  
  // Join the data
  const memberBooks: MemberBook[] = [];
  for (const entry of libraryEntries) {
    const book = booksMap.get(entry.bookId);
    if (book) {
      memberBooks.push({
        libraryEntryId: entry.id,
        status: entry.status,
        addedAt: entry.addedAt,
        id: book.id,
        title: book.title,
        author: book.author,
        thumbnailUrl: book.thumbnailUrl,
        googleBooksId: book.googleBooksId,
        genreId: book.genreId,
        seriesId: book.seriesId,
        seriesOrder: book.seriesOrder,
      });
    }
  }
  
  return memberBooks;
}

/**
 * Update a member's library entry (e.g., change status)
 */
export async function updateMemberLibraryEntry(
  familyId: string,
  memberId: string,
  libraryEntryId: string,
  data: Partial<MemberLibraryEntry>
): Promise<void> {
  const { id, ...updateData } = data;
  await memberLibraryCollection(familyId, memberId).doc(libraryEntryId).update(updateData);
}

/**
 * Remove a book from a member's library
 */
export async function removeFromMemberLibrary(
  familyId: string,
  memberId: string,
  libraryEntryId: string
): Promise<void> {
  await memberLibraryCollection(familyId, memberId).doc(libraryEntryId).delete();
}

/**
 * Add all books from a series to a member's library
 */
export async function addSeriesToMemberLibrary(
  familyId: string,
  memberId: string,
  seriesId: string,
  status: BookStatus = 'to-read'
): Promise<{ added: number; skipped: number }> {
  // Get all books in the series
  const seriesBooks = await getSeriesBooksFromCatalog(familyId, seriesId);
  
  let added = 0;
  let skipped = 0;
  
  for (const book of seriesBooks) {
    const existing = await isBookInMemberLibrary(familyId, memberId, book.id);
    if (existing) {
      skipped++;
    } else {
      await addToMemberLibrary(familyId, memberId, book.id, status);
      added++;
    }
  }
  
  return { added, skipped };
}

// ============================================================================
// Series operations
// ============================================================================

export async function createSeries(
  familyId: string, 
  data: Omit<CreateSeries, 'createdBy'>,
  createdBy?: string
): Promise<string> {
  const docRef = await seriesCollection(familyId).add({
    ...data,
    ...(createdBy && { createdBy }),
  });
  return docRef.id;
}

export async function getSeries(familyId: string): Promise<Series[]> {
  const snapshot = await seriesCollection(familyId).get();
  return snapshot.docs.map((doc: DocumentSnapshot) => ({ id: doc.id, ...doc.data() }) as Series);
}

export async function getSeriesById(
  familyId: string, 
  seriesId: string
): Promise<Series | null> {
  const doc = await seriesCollection(familyId).doc(seriesId).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...doc.data() } as Series;
}

export async function updateSeries(
  familyId: string, 
  seriesId: string, 
  data: Partial<Series>
): Promise<void> {
  const { id, ...updateData } = data;
  await seriesCollection(familyId).doc(seriesId).update(updateData);
}

export async function deleteSeries(
  familyId: string, 
  seriesId: string
): Promise<void> {
  await seriesCollection(familyId).doc(seriesId).delete();
}

// ============================================================================
// Real-time listeners
// ============================================================================

export function onMembersSnapshot(
  familyId: string,
  callback: (members: Member[]) => void
): () => void {
  return membersCollection(familyId).onSnapshot((snapshot: QuerySnapshot) => {
    const members = snapshot.docs.map((doc: DocumentSnapshot) => ({ id: doc.id, ...doc.data() }) as Member);
    callback(members);
  });
}

export function onFamilyBooksSnapshot(
  familyId: string,
  callback: (books: FamilyBook[]) => void
): () => void {
  return familyBooksCollection(familyId)
    .orderBy('addedAt', 'desc')
    .onSnapshot((snapshot: QuerySnapshot) => {
      const books = snapshot.docs.map((doc: DocumentSnapshot) => ({ id: doc.id, ...doc.data() }) as FamilyBook);
      callback(books);
    });
}

export function onMemberLibrarySnapshot(
  familyId: string,
  memberId: string,
  callback: (entries: MemberLibraryEntry[]) => void
): () => void {
  return memberLibraryCollection(familyId, memberId)
    .orderBy('addedAt', 'desc')
    .onSnapshot((snapshot: QuerySnapshot) => {
      const entries = snapshot.docs.map((doc: DocumentSnapshot) => ({ id: doc.id, ...doc.data() }) as MemberLibraryEntry);
      callback(entries);
    });
}

export function onSeriesSnapshot(
  familyId: string,
  callback: (series: Series[]) => void
): () => void {
  return seriesCollection(familyId).onSnapshot((snapshot: QuerySnapshot) => {
    const series = snapshot.docs.map((doc: DocumentSnapshot) => ({ id: doc.id, ...doc.data() }) as Series);
    callback(series);
  });
}
