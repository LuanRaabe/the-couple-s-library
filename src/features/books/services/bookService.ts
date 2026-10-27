import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  writeBatch,
} from 'firebase/firestore';
import { User as FirebaseUser } from 'firebase/auth';
import { db, handleFirestoreError, OperationType } from '../../../firebase';
import { Book, BookStatus, ReaderId } from '../types';
import { USER_INITIAL_BOOKS } from '../../../data/userBooks';
import { getDbTarget, getSettingsCollection } from '../../../utils/envHelper';

/**
 * Timeout wrapper to guarantee Firestore calls never hang the UI indefinitely.
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs = 8000,
  errorMsg = 'Tempo limite excedido ao comunicar com o servidor Firestore.'
): Promise<T> {
  let timer: any;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error(errorMsg));
    }, timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Recursively sanitizes object data for Firestore by removing any `undefined` keys
 * inside objects or nested arrays, avoiding "Unsupported field value: undefined" errors.
 */
export function sanitizeForFirestore<T>(data: T): T {
  if (data === undefined || data === null) {
    return data;
  }
  if (Array.isArray(data)) {
    return data
      .filter((item) => item !== undefined)
      .map((item) => sanitizeForFirestore(item)) as unknown as T;
  }
  if (typeof data === 'object' && !(data instanceof Date)) {
    const result: Record<string, any> = {};
    for (const [key, val] of Object.entries(data)) {
      if (val !== undefined) {
        result[key] = sanitizeForFirestore(val);
      }
    }
    return result as T;
  }
  return data;
}

export async function updateBookStatusInDb(bookId: string, newStatus: BookStatus, book?: Book) {
  const collectionName = getDbTarget();
  const path = `${collectionName}/${bookId}`;
  try {
    const bookRef = doc(db, collectionName, bookId);
    const isNowFinished = newStatus === 'lido';

    const payload = sanitizeForFirestore({
      ...(book ? {
        title: book.title,
        authors: book.authors || '',
        assignedReader: book.assignedReader || 'ambos',
      } : {}),
      status: newStatus,
      dateStarted: newStatus === 'lendo' && (!book || !book.dateStarted) ? new Date().toISOString().split('T')[0] : (book?.dateStarted || null),
      dateFinished: isNowFinished ? (book?.dateFinished || new Date().toISOString().split('T')[0]) : (book?.dateFinished || null),
      currentPage: isNowFinished && book?.pageCount ? book.pageCount : (book?.currentPage || 0),
      updatedAt: new Date().toISOString(),
    });

    await withTimeout(setDoc(bookRef, payload, { merge: true }), 8000);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function updateBookReaderInDb(bookId: string, newReader: ReaderId, book?: Book) {
  const collectionName = getDbTarget();
  const path = `${collectionName}/${bookId}`;
  try {
    const bookRef = doc(db, collectionName, bookId);
    const payload = sanitizeForFirestore({
      ...(book ? {
        title: book.title,
        status: book.status || 'quero_ler',
      } : {}),
      assignedReader: newReader,
      updatedAt: new Date().toISOString(),
    });
    await withTimeout(setDoc(bookRef, payload, { merge: true }), 8000);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function toggleFavoriteInDb(bookId: string, newFavorite: boolean) {
  const collectionName = getDbTarget();
  const path = `${collectionName}/${bookId}`;
  try {
    const bookRef = doc(db, collectionName, bookId);
    const payload = sanitizeForFirestore({
      favorite: newFavorite,
      updatedAt: new Date().toISOString(),
    });
    await withTimeout(setDoc(bookRef, payload, { merge: true }), 8000);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function createBookInDb(docId: string, bookData: Omit<Book, 'id'>, userId: string) {
  const collectionName = getDbTarget();
  const path = `${collectionName}/${docId}`;
  try {
    const bookRef = doc(db, collectionName, docId);
    const payload = sanitizeForFirestore({
      ...bookData,
      createdBy: userId,
      updatedAt: new Date().toISOString(),
    });
    await withTimeout(setDoc(bookRef, payload), 8000);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateBookInDb(updatedBook: Book) {
  const collectionName = getDbTarget();
  const path = `${collectionName}/${updatedBook.id}`;
  try {
    const bookRef = doc(db, collectionName, updatedBook.id);
    const { id, ...dataToSave } = updatedBook;
    const payload = sanitizeForFirestore({
      ...dataToSave,
      title: updatedBook.title || 'Sem Título',
      status: updatedBook.status || 'quero_ler',
      assignedReader: updatedBook.assignedReader || 'ambos',
      updatedAt: new Date().toISOString(),
    });
    // withTimeout prevents any infinite hanging
    await withTimeout(setDoc(bookRef, payload, { merge: true }), 8000);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function batchUpdateBooksInDb(updatedBooks: Book[]) {
  if (updatedBooks.length === 0) return;
  const collectionName = getDbTarget();
  try {
    const batch = writeBatch(db);
    for (const book of updatedBooks) {
      const bookRef = doc(db, collectionName, book.id);
      const { id, ...dataToSave } = book;
      const payload = sanitizeForFirestore({
        ...dataToSave,
        title: book.title || 'Sem Título',
        status: book.status || 'quero_ler',
        assignedReader: book.assignedReader || 'ambos',
        updatedAt: new Date().toISOString(),
      });
      batch.set(bookRef, payload, { merge: true });
    }
    await withTimeout(batch.commit(), 10000);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, collectionName);
  }
}

export async function deleteBookFromDb(bookId: string) {
  const collectionName = getDbTarget();
  const path = `${collectionName}/${bookId}`;
  try {
    await withTimeout(deleteDoc(doc(db, collectionName, bookId)), 8000);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function seedBaseBooksInDb(user: FirebaseUser, merge = true) {
  const collectionName = getDbTarget();
  const settingsCollection = getSettingsCollection();
  const batch = writeBatch(db);

  USER_INITIAL_BOOKS.forEach((bookItem, idx) => {
    const origId = (bookItem as any).originalId || (idx + 1);
    const docId = `book_${origId}`;
    const bookRef = doc(db, collectionName, docId);
    batch.set(
      bookRef,
      sanitizeForFirestore({
        title: bookItem.title,
        authors: bookItem.authors || '',
        coverUrl: bookItem.coverUrl || '',
        isbn: bookItem.isbn || '',
        pageCount: bookItem.pageCount || 0,
        currentPage: bookItem.currentPage || 0,
        publisher: bookItem.publisher || '',
        publishedDate: bookItem.publishedDate || '',
        description: bookItem.description || '',
        categories: bookItem.categories || [],
        status: bookItem.status || 'lido',
        assignedReader: bookItem.assignedReader || 'ambos',
        ratings: bookItem.ratings || {},
        notes: bookItem.notes || {},
        recommendations: bookItem.recommendations || [],
        readingLogs: bookItem.readingLogs || [],
        readCount: (bookItem as any).readCount || (bookItem.status === 'lido' ? 1 : 0),
        readPeriods: (bookItem as any).readPeriods || [],
        favorite: !!bookItem.favorite,
        dateAdded: bookItem.dateAdded || '2026-01-01',
        createdBy: user.uid,
        updatedAt: new Date().toISOString(),
      }),
      { merge }
    );
  });

  const settingsRef = doc(db, settingsCollection, 'couple');
  batch.set(
    settingsRef,
    sanitizeForFirestore({
      eleName: 'Luan',
      elaName: 'Theresa',
      yearlyGoal: 40,
      updatedBy: user.uid,
      updatedAt: new Date().toISOString(),
    }),
    { merge: true }
  );

  await withTimeout(batch.commit(), 12000, 'Tempo limite ao inicializar acervo base no Firestore.');
}
