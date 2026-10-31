export type BookStatus = 'quero_ler' | 'lendo' | 'lido' | 'abandonado' | 'pausado';

export type ReaderId = 'ele' | 'ela' | 'ambos';

export type BookSource = 'google' | 'openlibrary' | 'brasilapi' | 'gutendex' | 'manual';

export interface ReadingLog {
  id: string;
  reader: 'ele' | 'ela';
  date: string;
  pagesRead: number;
  currentPage: number;
  notes?: string;
}

export interface BookRecommendation {
  id: string;
  from: 'ele' | 'ela';
  to: 'ele' | 'ela';
  message: string;
  date: string;
  readStatus?: 'pendente' | 'lendo' | 'lido';
}

export interface ReadPeriod {
  id: string;
  year: number;
  month: number; // 1 - 12
  reader?: 'ele' | 'ela' | 'ambos';
  notes?: string;
}

/**
 * Standardized metadata model for books fetched from external APIs
 * (Google Books, Open Library, BrasilAPI, Gutendex).
 */
export interface BookApiMetadata {
  id?: string;
  title: string;
  subtitle?: string;
  authors: string;
  coverUrl?: string;
  isbn?: string;
  isbn10?: string;
  isbn13?: string;
  pageCount?: number;
  publisher?: string;
  publishedDate?: string;
  description?: string;
  categories?: string[];
  language?: string;
  edition?: string;
  source?: BookSource;
  rawMetadata?: Record<string, any>;
}

/**
 * Persistent Book entity stored in Firestore and local storage.
 */
export interface Book {
  id: string;
  originalId?: number;
  title: string;
  subtitle?: string;
  authors: string;
  coverUrl?: string;
  isbn?: string;
  isbn10?: string;
  isbn13?: string;
  edition?: string;
  language?: string;
  source?: BookSource;
  pageCount?: number;
  currentPage?: number;
  publisher?: string;
  publishedDate?: string;
  description?: string;
  categories?: string[];
  status: BookStatus;
  assignedReader: ReaderId;
  readCount?: number;
  readPeriods?: ReadPeriod[];
  ratings?: {
    ele?: number; // 0-5
    ela?: number; // 0-5
  };
  notes?: {
    ele?: string;
    ela?: string;
  };
  recommendations?: BookRecommendation[];
  readingLogs?: ReadingLog[];
  favorite?: boolean;
  owned?: boolean; // true = Temos na Estante; false = Lista de Desejos (Wishlist)
  dateAdded?: string;
  dateStarted?: string;
  dateFinished?: string;
  createdBy?: string;
  updatedAt?: string;
}

/**
 * Compatibility alias: GoogleBookSearchResult extends BookApiMetadata with guaranteed ID
 */
export interface GoogleBookSearchResult extends BookApiMetadata {
  id: string;
}

export type { LibrarySettings } from '../../settings/types';
