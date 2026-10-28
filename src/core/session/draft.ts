import type { Book } from '@/features/books/types';

const DRAFT_PREFIX = 'book_draft_';

/**
 * Retrieves an active book edit draft stored in browser sessionStorage
 */
export function getBookDraft(bookId: string): Partial<Book> | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(`${DRAFT_PREFIX}${bookId}`);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    console.error('Error reading book draft from sessionStorage:', e);
    return null;
  }
}

/**
 * Saves or updates a book edit draft in browser sessionStorage
 */
export function saveBookDraft(bookId: string, draftData: Partial<Book>): void {
  if (typeof window === 'undefined') return;
  try {
    const existing = getBookDraft(bookId) || {};
    const merged = { ...existing, ...draftData };
    sessionStorage.setItem(`${DRAFT_PREFIX}${bookId}`, JSON.stringify(merged));
  } catch (e) {
    console.error('Error saving book draft to sessionStorage:', e);
  }
}

/**
 * Clears an active draft from browser sessionStorage ONLY after database update succeeds
 */
export function clearBookDraft(bookId: string): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(`${DRAFT_PREFIX}${bookId}`);
  } catch (e) {
    console.error('Error removing book draft from sessionStorage:', e);
  }
}

/**
 * Checks if a specific book has unsaved edits in sessionStorage
 */
export function hasBookDraft(bookId: string): boolean {
  if (typeof window === 'undefined') return false;
  return sessionStorage.getItem(`${DRAFT_PREFIX}${bookId}`) !== null;
}

/**
 * Lists all book IDs currently holding unsaved session drafts
 */
export function getAllDraftBookIds(): string[] {
  if (typeof window === 'undefined') return [];
  const ids: string[] = [];
  try {
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key && key.startsWith(DRAFT_PREFIX)) {
        ids.push(key.substring(DRAFT_PREFIX.length));
      }
    }
  } catch (e) {
    console.error('Error listing drafts:', e);
  }
  return ids;
}

/**
 * Discards all active drafts from sessionStorage
 */
export function clearAllBookDrafts(): void {
  if (typeof window === 'undefined') return;
  try {
    const ids = getAllDraftBookIds();
    ids.forEach((id) => clearBookDraft(id));
  } catch (e) {
    console.error('Error clearing all drafts:', e);
  }
}
