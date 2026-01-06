import firestore from '@react-native-firebase/firestore';
import type { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';
import type { Family, Member, Book, Series, CreateFamily, CreateMember, CreateBook, CreateSeries } from '@/types/models';

type DocumentSnapshot = FirebaseFirestoreTypes.DocumentSnapshot;
type QuerySnapshot = FirebaseFirestoreTypes.QuerySnapshot;

// Collection references
export const familiesCollection = () => firestore().collection('families');
export const membersCollection = (familyId: string) => 
  firestore().collection('families').doc(familyId).collection('members');
export const booksCollection = (familyId: string, memberId: string) =>
  firestore().collection('families').doc(familyId).collection('members').doc(memberId).collection('books');
export const seriesCollection = (familyId: string, memberId: string) =>
  firestore().collection('families').doc(familyId).collection('members').doc(memberId).collection('series');

// Timestamp helper
export const serverTimestamp = () => firestore.FieldValue.serverTimestamp();

// Family operations
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

// Member operations
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

// Book operations
export async function createBook(
  familyId: string, 
  memberId: string, 
  data: Omit<CreateBook, 'memberId' | 'addedAt'>
): Promise<string> {
  // Filter out undefined values - Firestore doesn't accept them
  const cleanData = Object.fromEntries(
    Object.entries(data).filter(([_, value]) => value !== undefined)
  );
  
  const docRef = await booksCollection(familyId, memberId).add({
    ...cleanData,
    memberId,
    addedAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function getBooks(familyId: string, memberId: string): Promise<Book[]> {
  const snapshot = await booksCollection(familyId, memberId)
    .orderBy('addedAt', 'desc')
    .get();
  return snapshot.docs.map((doc: DocumentSnapshot) => ({ id: doc.id, ...doc.data() }) as Book);
}

export async function getBooksByStatus(
  familyId: string, 
  memberId: string, 
  status: Book['status']
): Promise<Book[]> {
  const snapshot = await booksCollection(familyId, memberId)
    .where('status', '==', status)
    .orderBy('addedAt', 'desc')
    .get();
  return snapshot.docs.map((doc: DocumentSnapshot) => ({ id: doc.id, ...doc.data() }) as Book);
}

export async function getBook(familyId: string, memberId: string, bookId: string): Promise<Book | null> {
  const doc = await booksCollection(familyId, memberId).doc(bookId).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...doc.data() } as Book;
}

export async function updateBook(
  familyId: string, 
  memberId: string, 
  bookId: string, 
  data: Partial<Book>
): Promise<void> {
  const { id, ...updateData } = data;
  await booksCollection(familyId, memberId).doc(bookId).update(updateData);
}

export async function deleteBook(familyId: string, memberId: string, bookId: string): Promise<void> {
  await booksCollection(familyId, memberId).doc(bookId).delete();
}

// Series operations
export async function createSeries(
  familyId: string, 
  memberId: string, 
  data: Omit<CreateSeries, 'memberId'>
): Promise<string> {
  const docRef = await seriesCollection(familyId, memberId).add({
    ...data,
    memberId,
  });
  return docRef.id;
}

export async function getSeries(familyId: string, memberId: string): Promise<Series[]> {
  const snapshot = await seriesCollection(familyId, memberId).get();
  return snapshot.docs.map((doc: DocumentSnapshot) => ({ id: doc.id, ...doc.data() }) as Series);
}

export async function getSeriesById(
  familyId: string, 
  memberId: string, 
  seriesId: string
): Promise<Series | null> {
  const doc = await seriesCollection(familyId, memberId).doc(seriesId).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...doc.data() } as Series;
}

export async function updateSeries(
  familyId: string, 
  memberId: string, 
  seriesId: string, 
  data: Partial<Series>
): Promise<void> {
  const { id, ...updateData } = data;
  await seriesCollection(familyId, memberId).doc(seriesId).update(updateData);
}

export async function deleteSeries(
  familyId: string, 
  memberId: string, 
  seriesId: string
): Promise<void> {
  await seriesCollection(familyId, memberId).doc(seriesId).delete();
}

// Real-time listeners
export function onMembersSnapshot(
  familyId: string,
  callback: (members: Member[]) => void
): () => void {
  return membersCollection(familyId).onSnapshot((snapshot: QuerySnapshot) => {
    const members = snapshot.docs.map((doc: DocumentSnapshot) => ({ id: doc.id, ...doc.data() }) as Member);
    callback(members);
  });
}

export function onBooksSnapshot(
  familyId: string,
  memberId: string,
  callback: (books: Book[]) => void
): () => void {
  return booksCollection(familyId, memberId)
    .orderBy('addedAt', 'desc')
    .onSnapshot((snapshot: QuerySnapshot) => {
      const books = snapshot.docs.map((doc: DocumentSnapshot) => ({ id: doc.id, ...doc.data() }) as Book);
      callback(books);
    });
}

export function onSeriesSnapshot(
  familyId: string,
  memberId: string,
  callback: (series: Series[]) => void
): () => void {
  return seriesCollection(familyId, memberId).onSnapshot((snapshot: QuerySnapshot) => {
    const series = snapshot.docs.map((doc: DocumentSnapshot) => ({ id: doc.id, ...doc.data() }) as Series);
    callback(series);
  });
}
