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

// Genres are dynamic strings - no Genre interface needed
// Common genres get translations via lookup table in constants/genres.ts

/**
 * Family-level book (catalog entry).
 * Stored at: families/{familyId}/books/{bookId}
 * Books are shared across all family members.
 */
export interface FamilyBook {
  id: string;
  title: string;
  author: string;
  thumbnailUrl?: string;
  googleBooksId?: string;
  genres?: string[]; // Dynamic genre strings
  seriesId?: string;
  seriesOrder?: number;
  year?: number; // Release year (4-digit)
  addedBy: string; // memberId who first added this book
  addedAt: Timestamp;
}

/**
 * Member's library entry (relationship to a family book).
 * Stored at: families/{familyId}/members/{memberId}/library/{entryId}
 * Each member has their own reading status for each book.
 */
export interface MemberLibraryEntry {
  id: string;
  bookId: string; // Reference to FamilyBook.id
  status: BookStatus; // reading | to-read | read
  addedAt: Timestamp;
}

/**
 * Combined view of a member's book (FamilyBook + MemberLibraryEntry).
 * Used in the UI to display a member's library with full book details.
 */
export interface MemberBook {
  // From MemberLibraryEntry
  libraryEntryId: string;
  status: BookStatus;
  addedAt: Timestamp;
  // From FamilyBook
  id: string; // FamilyBook id
  title: string;
  author: string;
  thumbnailUrl?: string;
  googleBooksId?: string;
  genres?: string[]; // Dynamic genre strings
  seriesId?: string;
  seriesOrder?: number;
  year?: number;
}

export interface Series {
  id: string;
  name: string;
  // Genres are computed from books in the series, not stored
  totalBooks: number;
  createdBy?: string; // memberId of creator (optional, for tracking)
}

/**
 * Display type for books in a series view.
 * Can represent books both in and out of the member's library.
 * Used to show all books in a series with their status.
 */
export interface SeriesBookDisplay {
  // Book metadata (from FamilyBook)
  id: string; // FamilyBook ID
  title: string;
  author: string;
  thumbnailUrl?: string;
  googleBooksId?: string;
  genres?: string[]; // Dynamic genre strings
  seriesId?: string;
  seriesOrder?: number;
  year?: number;
  // Library status
  libraryEntryId?: string; // undefined if not in library
  status: BookStatus; // 'to-read' if not in library
  isInLibrary: boolean; // true if book is in member's library
}

// Helper type for creating new documents (without id)
export type CreateFamily = Omit<Family, 'id'>;
export type CreateMember = Omit<Member, 'id'>;
export type CreateFamilyBook = Omit<FamilyBook, 'id'>;
export type CreateMemberLibraryEntry = Omit<MemberLibraryEntry, 'id'>;
export type CreateSeries = Omit<Series, 'id'>;

// Legacy type alias for backwards compatibility during migration
export type Book = MemberBook;
export type CreateBook = Omit<MemberBook, 'id' | 'libraryEntryId'>;
