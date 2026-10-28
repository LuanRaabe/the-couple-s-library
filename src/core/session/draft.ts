import { useState, useEffect, useCallback } from 'react';
import type { Book } from '@/features/books/types';

const DRAFT_PREFIX = 'book_draft_';
export const DRAFT_EVENT_NAME = 'book_draft_changed';

function notifyDraftChanged(bookId?: string) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(DRAFT_EVENT_NAME, { detail: { bookId } }));
  }
}

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
    notifyDraftChanged(bookId);
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
    notifyDraftChanged(bookId);
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
 * Retrieves all drafts as an object mapping bookId -> Partial<Book>
 */
export function getAllDrafts(): Record<string, Partial<Book>> {
  if (typeof window === 'undefined') return {};
  const map: Record<string, Partial<Book>> = {};
  const ids = getAllDraftBookIds();
  for (const id of ids) {
    const d = getBookDraft(id);
    if (d) {
      map[id] = d;
    }
  }
  return map;
}

/**
 * Discards all active drafts from sessionStorage
 */
export function clearAllBookDrafts(): void {
  if (typeof window === 'undefined') return;
  try {
    const ids = getAllDraftBookIds();
    ids.forEach((id) => {
      sessionStorage.removeItem(`${DRAFT_PREFIX}${id}`);
    });
    notifyDraftChanged();
  } catch (e) {
    console.error('Error clearing all drafts:', e);
  }
}

/**
 * React hook that guarantees real-time reactive sync with sessionStorage drafts
 * across any component in the application.
 */
export function useSessionDrafts() {
  const [draftIds, setDraftIds] = useState<string[]>(() => getAllDraftBookIds());
  const [draftsMap, setDraftsMap] = useState<Record<string, Partial<Book>>>(() => getAllDrafts());

  const refreshDrafts = useCallback(() => {
    const ids = getAllDraftBookIds();
    setDraftIds(ids);
    setDraftsMap(getAllDrafts());
  }, []);

  useEffect(() => {
    // Initial sync
    refreshDrafts();

    const handleCustomChange = () => {
      refreshDrafts();
    };

    const handleStorageChange = (e: StorageEvent) => {
      if (!e.key || e.key.startsWith(DRAFT_PREFIX)) {
        refreshDrafts();
      }
    };

    window.addEventListener(DRAFT_EVENT_NAME, handleCustomChange);
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener(DRAFT_EVENT_NAME, handleCustomChange);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [refreshDrafts]);

  const hasDraft = useCallback(
    (bookId: string) => draftIds.includes(bookId) || hasBookDraft(bookId),
    [draftIds]
  );

  const getDraft = useCallback(
    (bookId: string) => draftsMap[bookId] || getBookDraft(bookId),
    [draftsMap]
  );

  return {
    draftIds,
    draftCount: draftIds.length,
    draftsMap,
    hasDraft,
    getDraft,
    refreshDrafts,
    saveDraft: saveBookDraft,
    clearDraft: clearBookDraft,
    clearAllDrafts: clearAllBookDrafts,
  };
}
