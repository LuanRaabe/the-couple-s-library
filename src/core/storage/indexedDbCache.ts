import { Book } from '@/features/books/types';

const DB_NAME = 'NossaEstanteDB';
const DB_VERSION = 1;
const STORE_NAME = 'books_cache';
const KEY_BOOKS = 'library_books';
const FALLBACK_LS_KEY = 'nossa_estante_books_cache_v1';
const FALLBACK_LS_TIME_KEY = 'nossa_estante_last_sync_time_v1';

export interface BooksCachePayload {
  books: Book[];
  cachedAt: number;
  dbTarget: string;
}

let inMemoryCache: BooksCachePayload | null = null;
let isIndexedDbChecked: boolean | null = null;

/**
 * Checks if IndexedDB is available and accessible in the current browser/iframe context.
 */
function isIndexedDbAvailable(): boolean {
  if (typeof window === 'undefined') return false;
  if (isIndexedDbChecked !== null) return isIndexedDbChecked;

  try {
    if (!window.indexedDB) {
      isIndexedDbChecked = false;
      return false;
    }
    isIndexedDbChecked = true;
    return true;
  } catch {
    isIndexedDbChecked = false;
    return false;
  }
}

/**
 * Opens or initializes the IndexedDB database.
 */
function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!isIndexedDbAvailable()) {
      return reject(new Error('IndexedDB is not available in this environment.'));
    }

    try {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const database = (event.target as IDBOpenDBRequest).result;
        if (!database.objectStoreNames.contains(STORE_NAME)) {
          database.createObjectStore(STORE_NAME);
        }
      };

      request.onsuccess = (event) => {
        const database = (event.target as IDBOpenDBRequest).result;
        resolve(database);
      };

      request.onerror = (event) => {
        reject((event.target as IDBOpenDBRequest).error || new Error('Failed to open IndexedDB.'));
      };

      request.onblocked = () => {
        console.warn('IndexedDB database upgrade was blocked by another tab.');
      };
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Retrieves books from IndexedDB (with graceful fallback to localStorage and in-memory).
 */
export async function getCachedBooks(targetCollection: string): Promise<BooksCachePayload | null> {
  // 1. Primary: Try IndexedDB
  if (isIndexedDbAvailable()) {
    try {
      const db = await openDatabase();
      const payload = await new Promise<BooksCachePayload | null>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(KEY_BOOKS);

        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => reject(req.error);
      });

      if (payload && payload.dbTarget === targetCollection && Array.isArray(payload.books)) {
        inMemoryCache = payload;
        return payload;
      }
    } catch (err) {
      console.warn('IndexedDB get failed, attempting fallback to localStorage:', err);
    }
  }

  // 2. Secondary: Fallback to localStorage
  try {
    const raw = localStorage.getItem(FALLBACK_LS_KEY);
    if (raw) {
      const parsed: BooksCachePayload = JSON.parse(raw);
      if (parsed && parsed.dbTarget === targetCollection && Array.isArray(parsed.books)) {
        inMemoryCache = parsed;
        return parsed;
      }
    }
  } catch {
    // Quota or access error, proceed to memory
  }

  // 3. Tertiary: In-memory cache
  if (inMemoryCache && inMemoryCache.dbTarget === targetCollection) {
    return inMemoryCache;
  }

  return null;
}

/**
 * Saves books to IndexedDB and syncs redundancy to localStorage and in-memory.
 */
export async function setCachedBooks(targetCollection: string, books: Book[]): Promise<void> {
  const payload: BooksCachePayload = {
    books,
    cachedAt: Date.now(),
    dbTarget: targetCollection,
  };
  inMemoryCache = payload;

  // 1. Primary: Write to IndexedDB
  if (isIndexedDbAvailable()) {
    try {
      const db = await openDatabase();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.put(payload, KEY_BOOKS);

        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
        tx.oncomplete = () => resolve();
      });
    } catch (err) {
      console.warn('IndexedDB set failed, writing to localStorage fallback:', err);
    }
  }

  // 2. Secondary: Keep localStorage synced as well
  try {
    localStorage.setItem(FALLBACK_LS_KEY, JSON.stringify(payload));
    localStorage.setItem(FALLBACK_LS_TIME_KEY, String(payload.cachedAt));
  } catch {
    // If storage is full or restricted, inMemoryCache still holds it
  }
}

/**
 * Clears the stored cache (e.g. on manual full reset or logout).
 */
export async function clearBooksCache(): Promise<void> {
  inMemoryCache = null;

  if (isIndexedDbAvailable()) {
    try {
      const db = await openDatabase();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.delete(KEY_BOOKS);

        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
        tx.oncomplete = () => resolve();
      });
    } catch (err) {
      console.warn('IndexedDB delete failed:', err);
    }
  }

  try {
    localStorage.removeItem(FALLBACK_LS_KEY);
    localStorage.removeItem(FALLBACK_LS_TIME_KEY);
  } catch {
    // ignore
  }
}
