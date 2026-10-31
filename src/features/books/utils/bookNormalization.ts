import { Book, BookApiMetadata, ReaderId, BookStatus } from '../types';

export interface BuildBookOptions {
  status?: BookStatus;
  assignedReader?: ReaderId;
  owned?: boolean;
  activeReader?: 'ele' | 'ela';
}

/**
 * Normalizes an ISBN string, returning clean digits and whether it is ISBN-10 or ISBN-13.
 */
export function extractIsbnDetails(rawIsbn?: string): {
  isbn: string;
  isbn10?: string;
  isbn13?: string;
} {
  if (!rawIsbn) return { isbn: '' };
  const clean = rawIsbn.replace(/[^0-9X]/gi, '').toUpperCase();
  if (clean.length === 13) {
    return { isbn: clean, isbn13: clean };
  }
  if (clean.length === 10) {
    return { isbn: clean, isbn10: clean };
  }
  return { isbn: clean };
}

/**
 * Transforms any API search result (Google Books, Open Library, BrasilAPI, Gutendex)
 * into a complete, normalized, and validated Book object ready for Firestore persistence.
 */
export function buildBookFromApi(
  metadata: BookApiMetadata,
  options: BuildBookOptions = {}
): Omit<Book, 'id'> {
  const isbnInfo = extractIsbnDetails(metadata.isbn);
  const primaryIsbn = isbnInfo.isbn || metadata.isbn || '';
  const finalIsbn10 = metadata.isbn10 || isbnInfo.isbn10 || (primaryIsbn.length === 10 ? primaryIsbn : undefined);
  const finalIsbn13 = metadata.isbn13 || isbnInfo.isbn13 || (primaryIsbn.length === 13 ? primaryIsbn : undefined);

  const cleanCategories = Array.isArray(metadata.categories)
    ? metadata.categories
        .map((c) => String(c).trim())
        .filter((c) => c.length > 0)
        .slice(0, 6)
    : [];

  const status = options.owned === false ? 'quero_ler' : (options.status || 'quero_ler');
  const assignedReader = options.assignedReader || 'ambos';
  const owned = options.owned !== undefined ? options.owned : true;

  return {
    title: (metadata.title || 'Sem Título').trim(),
    subtitle: metadata.subtitle?.trim() || undefined,
    authors: (metadata.authors || 'Autor Desconhecido').trim(),
    coverUrl: metadata.coverUrl?.trim() || '',
    isbn: primaryIsbn,
    isbn10: finalIsbn10,
    isbn13: finalIsbn13,
    pageCount: typeof metadata.pageCount === 'number' && metadata.pageCount > 0 ? metadata.pageCount : 0,
    currentPage: 0,
    publisher: (metadata.publisher || '').trim(),
    publishedDate: (metadata.publishedDate || '').trim(),
    description: (metadata.description || '').trim(),
    categories: cleanCategories,
    edition: metadata.edition?.trim() || undefined,
    language: metadata.language?.trim() || 'pt',
    source: metadata.source || 'google',
    status,
    assignedReader,
    owned,
    ratings: {},
    notes: {},
    recommendations: [],
    readingLogs: [],
    favorite: false,
    dateAdded: new Date().toISOString().split('T')[0],
  };
}

export const normalizeApiBook = buildBookFromApi;
