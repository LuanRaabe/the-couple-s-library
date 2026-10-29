export type BookStatus = 'quero_ler' | 'lendo' | 'lido' | 'abandonado' | 'pausado';

export type ReaderId = 'ele' | 'ela' | 'ambos';

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

export interface Book {
  id: string;
  originalId?: number;
  title: string;
  authors: string;
  coverUrl?: string;
  isbn?: string;
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

export interface GoogleBookSearchResult {
  id: string;
  title: string;
  authors: string;
  coverUrl?: string;
  pageCount?: number;
  publishedDate?: string;
  publisher?: string;
  description?: string;
  categories?: string[];
  isbn?: string;
  language?: string;
  source?: 'google' | 'openlibrary' | 'brasilapi';
}

export type { LibrarySettings } from '../../settings/types';
