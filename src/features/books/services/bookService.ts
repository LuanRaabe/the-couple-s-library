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
 * Sanitizes object data for Firestore by removing any `undefined` keys
 * which cause runtime errors in Firebase SDK.
 */
function sanitizeForFirestore(data: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {};
  for (const [key, val] of Object.entries(data)) {
    if (val !== undefined) {
      if (val && typeof val === 'object' && !Array.isArray(val) && !(val instanceof Date)) {
        result[key] = sanitizeForFirestore(val);
      } else {
        result[key] = val;
      }
    }
  }
  return result;
}

export async function updateBookStatusInDb(bookId: string, newStatus: BookStatus, book?: Book) {
  const collectionName = getDbTarget();
  const path = `${collectionName}/${bookId}`;
  try {
    const bookRef = doc(db, collectionName, bookId);
    const isNowFinished = newStatus === 'lido';

    const payload = sanitizeForFirestore({
      status: newStatus,
      dateStarted: newStatus === 'lendo' && (!book || !book.dateStarted) ? new Date().toISOString().split('T')[0] : (book?.dateStarted || null),
      dateFinished: isNowFinished ? (book?.dateFinished || new Date().toISOString().split('T')[0]) : (book?.dateFinished || null),
      currentPage: isNowFinished && book?.pageCount ? book.pageCount : (book?.currentPage || 0),
      updatedAt: new Date().toISOString(),
    });

    await setDoc(bookRef, payload, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function updateBookReaderInDb(bookId: string, newReader: ReaderId) {
  const collectionName = getDbTarget();
  const path = `${collectionName}/${bookId}`;
  try {
    const bookRef = doc(db, collectionName, bookId);
    const payload = sanitizeForFirestore({
      assignedReader: newReader,
      updatedAt: new Date().toISOString(),
    });
    await setDoc(bookRef, payload, { merge: true });
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
    await setDoc(bookRef, payload, { merge: true });
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
    await setDoc(bookRef, payload);
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
      updatedAt: new Date().toISOString(),
    });
    // Use setDoc with merge: true for rock-solid reliability across dev, preview and prod
    await setDoc(bookRef, payload, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteBookFromDb(bookId: string) {
  const collectionName = getDbTarget();
  const path = `${collectionName}/${bookId}`;
  try {
    await deleteDoc(doc(db, collectionName, bookId));
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

  await batch.commit();
}
