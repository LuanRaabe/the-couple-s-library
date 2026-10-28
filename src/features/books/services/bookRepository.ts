import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  writeBatch,
} from 'firebase/firestore';
import { User as FirebaseUser } from 'firebase/auth';
import { db, handleFirestoreError, withTimeout, sanitizeForFirestore, OperationType } from '@/core/firebase';
import { Book, BookStatus, ReaderId } from '../types';
import { USER_INITIAL_BOOKS } from '../data/userBooks';
import { getDbTarget, getSettingsCollection } from '@/core/config/env';

export interface BatchProgressCallback {
  (completed: number, total: number, currentTitle?: string): void;
}

export interface BatchSaveResult {
  success: boolean;
  savedCount: number;
  totalCount: number;
  failedBookIds: string[];
  errors: string[];
}

export async function updateBookStatusInDb(bookId: string, newStatus: BookStatus, book?: Book): Promise<void> {
  const collectionName = getDbTarget();
  const path = `${collectionName}/${bookId}`;
  try {
    const bookRef = doc(db, collectionName, bookId);
    const isNowFinished = newStatus === 'lido';

    const payload = sanitizeForFirestore({
      ...(book
        ? {
            title: book.title,
            authors: book.authors || '',
            assignedReader: book.assignedReader || 'ambos',
          }
        : {}),
      status: newStatus,
      dateStarted:
        newStatus === 'lendo' && (!book || !book.dateStarted)
          ? new Date().toISOString().split('T')[0]
          : book?.dateStarted || null,
      dateFinished: isNowFinished
        ? book?.dateFinished || new Date().toISOString().split('T')[0]
        : book?.dateFinished || null,
      currentPage: isNowFinished && book?.pageCount ? book.pageCount : book?.currentPage || 0,
      updatedAt: new Date().toISOString(),
    });

    await withTimeout(setDoc(bookRef, payload, { merge: true }), 9000);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function updateBookReaderInDb(bookId: string, newReader: ReaderId, book?: Book): Promise<void> {
  const collectionName = getDbTarget();
  const path = `${collectionName}/${bookId}`;
  try {
    const bookRef = doc(db, collectionName, bookId);
    const payload = sanitizeForFirestore({
      ...(book
        ? {
            title: book.title,
            status: book.status || 'quero_ler',
          }
        : {}),
      assignedReader: newReader,
      updatedAt: new Date().toISOString(),
    });
    await withTimeout(setDoc(bookRef, payload, { merge: true }), 9000);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function toggleFavoriteInDb(bookId: string, newFavorite: boolean): Promise<void> {
  const collectionName = getDbTarget();
  const path = `${collectionName}/${bookId}`;
  try {
    const bookRef = doc(db, collectionName, bookId);
    const payload = sanitizeForFirestore({
      favorite: newFavorite,
      updatedAt: new Date().toISOString(),
    });
    await withTimeout(setDoc(bookRef, payload, { merge: true }), 9000);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function createBookInDb(docId: string, bookData: Omit<Book, 'id'>, userId: string): Promise<void> {
  const collectionName = getDbTarget();
  const path = `${collectionName}/${docId}`;
  try {
    const bookRef = doc(db, collectionName, docId);
    const payload = sanitizeForFirestore({
      ...bookData,
      createdBy: userId,
      updatedAt: new Date().toISOString(),
    });
    await withTimeout(setDoc(bookRef, payload), 9000);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateBookInDb(updatedBook: Book): Promise<void> {
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
    await withTimeout(setDoc(bookRef, payload, { merge: true }), 9000);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

/**
 * Saves multiple books with real-time per-item progress updates and individual error resilience.
 * Does not block or fail the entire set if an individual item encounters network latency.
 */
export async function batchUpdateBooksInDb(
  updatedBooks: Book[],
  onProgress?: BatchProgressCallback
): Promise<BatchSaveResult> {
  if (updatedBooks.length === 0) {
    return { success: true, savedCount: 0, totalCount: 0, failedBookIds: [], errors: [] };
  }

  const collectionName = getDbTarget();
  const total = updatedBooks.length;
  let savedCount = 0;
  const failedBookIds: string[] = [];
  const errors: string[] = [];

  // Update in small controlled batches of 2 with real-time UI notification
  const CHUNK_SIZE = 2;
  for (let i = 0; i < total; i += CHUNK_SIZE) {
    const chunk = updatedBooks.slice(i, i + CHUNK_SIZE);

    await Promise.all(
      chunk.map(async (book) => {
        const path = `${collectionName}/${book.id}`;
        try {
          if (onProgress) {
            onProgress(savedCount, total, book.title);
          }
          const bookRef = doc(db, collectionName, book.id);
          const { id, ...dataToSave } = book;
          const payload = sanitizeForFirestore({
            ...dataToSave,
            title: book.title || 'Sem Título',
            status: book.status || 'quero_ler',
            assignedReader: book.assignedReader || 'ambos',
            updatedAt: new Date().toISOString(),
          });

          await withTimeout(setDoc(bookRef, payload, { merge: true }), 9000);
          savedCount++;
          if (onProgress) {
            onProgress(savedCount, total, book.title);
          }
        } catch (err: any) {
          console.error(`Falha ao salvar livro ${book.id} (${book.title}):`, err);
          failedBookIds.push(book.id);
          errors.push(err?.message || `Erro no livro "${book.title}"`);
        }
      })
    );

    // Yield control to let the React render loop paint progress smoothly
    await new Promise((r) => setTimeout(r, 40));
  }

  if (onProgress) {
    onProgress(savedCount, total, 'Concluído');
  }

  if (failedBookIds.length > 0) {
    const errMsg = `Falha ao salvar ${failedBookIds.length} livro(s) no Firestore.`;
    console.warn(errMsg, errors);
    return {
      success: false,
      savedCount,
      totalCount: total,
      failedBookIds,
      errors,
    };
  }

  return {
    success: true,
    savedCount,
    totalCount: total,
    failedBookIds: [],
    errors: [],
  };
}

export async function deleteBookFromDb(bookId: string): Promise<void> {
  const collectionName = getDbTarget();
  const path = `${collectionName}/${bookId}`;
  try {
    await withTimeout(deleteDoc(doc(db, collectionName, bookId)), 9000);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

/**
 * Seeds or syncs base books into the target Firestore collection.
 */
export async function seedBaseBooksInDb(
  user: FirebaseUser,
  merge = true,
  targetCollection?: string,
  onProgress?: BatchProgressCallback
): Promise<void> {
  const collectionName = targetCollection || getDbTarget();
  const settingsCollection = collectionName === 'books_preview' ? 'settings_preview' : 'settings';

  const total = USER_INITIAL_BOOKS.length;

  // Process in chunks of 20 to strictly respect Firestore batch limits (max 500)
  const CHUNK_SIZE = 20;
  for (let i = 0; i < total; i += CHUNK_SIZE) {
    const chunk = USER_INITIAL_BOOKS.slice(i, i + CHUNK_SIZE);
    const batch = writeBatch(db);

    chunk.forEach((bookItem, chunkIdx) => {
      const idx = i + chunkIdx;
      const origId = (bookItem as any).originalId || idx + 1;
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

    if (i === 0) {
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
    }

    if (onProgress) {
      onProgress(Math.min(i + CHUNK_SIZE, total), total, `Lote ${Math.floor(i / CHUNK_SIZE) + 1}...`);
    }

    await withTimeout(batch.commit(), 12000, `Tempo limite ao salvar lote ${i / CHUNK_SIZE + 1} no Firestore.`);
    await new Promise((r) => setTimeout(r, 60));
  }
}

/**
 * Specifically synchronizes the Production collection ('books') with the 84 spreadsheet books.
 * Directly fulfills user request: "Queria atualizar todos os livros de acordo com a planilha"
 */
export async function syncProductionBooksWithSpreadsheet(
  user: FirebaseUser,
  onProgress?: BatchProgressCallback
): Promise<void> {
  await seedBaseBooksInDb(user, true, 'books', onProgress);
}
