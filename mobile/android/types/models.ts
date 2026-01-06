import type { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';

export type Timestamp = FirebaseFirestoreTypes.Timestamp;

export type BookStatus = 'reading' | 'read' | 'to-read';

export interface Family {
  id: string;
  name: string;
  createdAt: Timestamp;
  ownerId: string; // Firebase Auth UID of the family owner
}

export interface Member {
  id: string;
  familyId: string;
  name: string;
  avatarUrl?: string;
  color: string;
}

export interface Genre {
  id: string;
  nameEn: string;
  nameHe: string;
  color: string;
}

export interface Book {
  id: string;
  memberId: string;
  title: string;
  author: string;
  thumbnailUrl?: string;
  googleBooksId?: string;
  genreId?: string;
  status: BookStatus;
  seriesId?: string;
  seriesOrder?: number;
  addedAt: Timestamp;
}

export interface Series {
  id: string;
  memberId: string;
  name: string;
  genreId?: string;
  totalBooks: number;
}

// Helper type for creating new documents (without id)
export type CreateFamily = Omit<Family, 'id'>;
export type CreateMember = Omit<Member, 'id'>;
export type CreateBook = Omit<Book, 'id'>;
export type CreateSeries = Omit<Series, 'id'>;

