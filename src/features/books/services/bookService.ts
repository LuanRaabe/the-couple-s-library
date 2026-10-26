import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
} from 'firebase/firestore';
import { User as FirebaseUser } from 'firebase/auth';
import { db, handleFirestoreError, OperationType } from '../../../firebase';
import { Book, BookStatus, ReaderId } from '../types';
import { USER_INITIAL_BOOKS } from '../../../data/userBooks';

export async function updateBookStatusInDb(bookId: string, newStatus: BookStatus, book?: Book) {
  const path = `books/${bookId}`;
  try {
    const bookRef = doc(db, 'books', bookId);
    const isNowFinished = newStatus === 'lido';

    await updateDoc(bookRef, {
      status: newStatus,
      dateStarted: newStatus === 'lendo' && (!book || !book.dateStarted) ? new Date().toISOString().split('T')[0] : (book?.dateStarted || null),
      dateFinished: isNowFinished ? (book?.dateFinished || new Date().toISOString().split('T')[0]) : (book?.dateFinished || null),
      currentPage: isNowFinished && book?.pageCount ? book.pageCount : (book?.currentPage || 0),
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function updateBookReaderInDb(bookId: string, newReader: ReaderId) {
  const path = `books/${bookId}`;
  try {
    const bookRef = doc(db, 'books', bookId);
    await updateDoc(bookRef, {
      assignedReader: newReader,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function toggleFavoriteInDb(bookId: string, newFavorite: boolean) {
  const path = `books/${bookId}`;
  try {
    const bookRef = doc(db, 'books', bookId);
    await updateDoc(bookRef, {
      favorite: newFavorite,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function createBookInDb(docId: string, bookData: Omit<Book, 'id'>, userId: string) {
  const path = `books/${docId}`;
  try {
    const bookRef = doc(db, 'books', docId);
    await setDoc(bookRef, {
      ...bookData,
      createdBy: userId,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateBookInDb(updatedBook: Book) {
  const path = `books/${updatedBook.id}`;
  try {
    const bookRef = doc(db, 'books', updatedBook.id);
    const { id, ...dataToSave } = updatedBook;
    await updateDoc(bookRef, {
      ...dataToSave,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteBookFromDb(bookId: string) {
  const path = `books/${bookId}`;
  try {
    await deleteDoc(doc(db, 'books', bookId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function seedBaseBooksInDb(user: FirebaseUser, merge = true) {
  const batch = writeBatch(db);
  USER_INITIAL_BOOKS.forEach((bookItem, idx) => {
    const origId = (bookItem as any).originalId || (idx + 1);
    const docId = `book_${origId}`;
    const bookRef = doc(db, 'books', docId);
    batch.set(
      bookRef,
      {
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
        favorite: !!bookItem.favorite,
        dateAdded: bookItem.dateAdded || '2026-01-01',
        createdBy: user.uid,
        updatedAt: new Date().toISOString(),
      },
      { merge }
    );
  });

  const settingsRef = doc(db, 'settings', 'couple');
  batch.set(
    settingsRef,
    {
      eleName: 'Luan',
      elaName: 'Theresa',
      yearlyGoal: 40,
      updatedBy: user.uid,
      updatedAt: new Date().toISOString(),
    },
    { merge: true }
  );

  await batch.commit();
}
