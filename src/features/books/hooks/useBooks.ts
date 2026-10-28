import { useState, useEffect, useRef } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { User as FirebaseUser } from 'firebase/auth';
import { db, handleFirestoreError, OperationType } from '@/core/firebase';
import { Book, BookStatus, ReaderId } from '../types';
import { USER_INITIAL_BOOKS } from '../data/userBooks';
import {
  updateBookStatusInDb,
  updateBookReaderInDb,
  toggleFavoriteInDb,
  createBookInDb,
  updateBookInDb,
  batchUpdateBooksInDb,
  deleteBookFromDb,
  seedBaseBooksInDb,
  syncProductionBooksWithSpreadsheet,
  BatchProgressCallback,
  BatchSaveResult,
} from '../services/bookRepository';
import { getDbTarget } from '@/core/config/env';
import { clearBookDraft } from '@/core/session/draft';

/**
 * Compares two books alphabetically by title according to Brazilian Portuguese collation.
 */
export function sortBooksAlphabetically(a: Book, b: Book): number {
  return (a.title || '').localeCompare(b.title || '', 'pt-BR', { sensitivity: 'base' });
}

export function useBooks(currentUser: FirebaseUser | null, dbTargetTrigger?: number) {
  const [books, setBooks] = useState<Book[]>(() => {
    return USER_INITIAL_BOOKS.map((b, idx) => ({
      ...b,
      id: `book_${(b as any).originalId || idx + 1}`,
    })).sort(sortBooksAlphabetically);
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);
  const [saveNotice, setSaveNotice] = useState<string | null>(null);
  const [seedNotice, setSeedNotice] = useState<string | null>(null);
  const isSeedingRef = useRef(false);

  const isBypassUser = currentUser?.uid === 'dev-maintenance-admin';

  const showSaveToast = (msg = 'Salvo com sucesso no banco de dados!') => {
    setSaveNotice(msg);
    setTimeout(() => {
      setSaveNotice((curr) => (curr === msg ? null : curr));
    }, 3500);
  };

  // Real-time listener for the Books collection
  useEffect(() => {
    if (!currentUser) {
      setIsLoading(false);
      setBooks(
        USER_INITIAL_BOOKS.map((b, idx) => ({
          ...b,
          id: `book_${(b as any).originalId || idx + 1}`,
        })).sort(sortBooksAlphabetically)
      );
      return;
    }

    if (isBypassUser) {
      // In maintenance bypass mode without Google login, load base books for interactive UI testing
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const booksCollectionPath = getDbTarget();
    const booksRef = collection(db, booksCollectionPath);

    const unsubscribe = onSnapshot(
      booksRef,
      (snapshot) => {
        if (snapshot.empty) {
          if (!isSeedingRef.current) {
            isSeedingRef.current = true;
            seedBaseBooksInDb(currentUser, true)
              .catch((err) => console.error('Auto-seed error:', err))
              .finally(() => {
                isSeedingRef.current = false;
              });
          }
          return;
        }

        const loadedBooks: Book[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          loadedBooks.push({
            id: docSnap.id,
            title: data.title || '',
            authors: data.authors || '',
            coverUrl: data.coverUrl || '',
            isbn: data.isbn || '',
            pageCount: data.pageCount || 0,
            currentPage: data.currentPage || 0,
            publisher: data.publisher || '',
            publishedDate: data.publishedDate || '',
            description: data.description || '',
            categories: data.categories || [],
            status: data.status || 'quero_ler',
            assignedReader: data.assignedReader || 'ambos',
            ratings: data.ratings || {},
            notes: data.notes || {},
            recommendations: data.recommendations || [],
            readingLogs: data.readingLogs || [],
            readCount: data.readCount || (data.status === 'lido' ? 1 : 0),
            readPeriods: data.readPeriods || [],
            favorite: !!data.favorite,
            dateAdded: data.dateAdded || '',
            dateStarted: data.dateStarted || '',
            dateFinished: data.dateFinished || '',
            createdBy: data.createdBy || '',
            updatedAt: data.updatedAt || '',
          });
        });

        // Always sort strictly alphabetically A-Z
        loadedBooks.sort(sortBooksAlphabetically);

        setBooks(loadedBooks);
        setIsLoading(false);
        setIsSyncing(false);
      },
      (error) => {
        setIsLoading(false);
        setErrorNotice('Não foi possível sincronizar os livros no momento. Verifique sua conexão.');
        try {
          handleFirestoreError(error, OperationType.LIST, booksCollectionPath);
        } catch (e) {
          console.warn('Firestore onSnapshot listener caught:', e);
        }
      }
    );

    return () => unsubscribe();
  }, [currentUser, dbTargetTrigger]);

  // Actions
  const handleUpdateStatus = async (bookId: string, newStatus: BookStatus) => {
    const book = books.find((b) => b.id === bookId);
    const isNowFinished = newStatus === 'lido';

    setBooks((prev) =>
      prev.map((b) =>
        b.id === bookId
          ? {
              ...b,
              status: newStatus,
              dateStarted: newStatus === 'lendo' && !b.dateStarted ? new Date().toISOString().split('T')[0] : b.dateStarted,
              dateFinished: isNowFinished ? (b.dateFinished || new Date().toISOString().split('T')[0]) : b.dateFinished,
              currentPage: isNowFinished && b.pageCount ? b.pageCount : b.currentPage,
            }
          : b
      )
    );

    if (!currentUser || isBypassUser) {
      showSaveToast('Status alterado na sessão.');
      return;
    }

    try {
      setIsSyncing(true);
      await updateBookStatusInDb(bookId, newStatus, book);
      showSaveToast('Status atualizado no banco!');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleUpdateReader = async (bookId: string, newReader: ReaderId) => {
    setBooks((prev) =>
      prev.map((b) => (b.id === bookId ? { ...b, assignedReader: newReader } : b))
    );

    if (!currentUser || isBypassUser) {
      showSaveToast('Leitor alterado na sessão.');
      return;
    }

    try {
      setIsSyncing(true);
      await updateBookReaderInDb(bookId, newReader);
      showSaveToast('Leitor atualizado no banco!');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleToggleFavorite = async (bookId: string) => {
    const book = books.find((b) => b.id === bookId);
    if (!book) return;

    const newFav = !book.favorite;
    setBooks((prev) => prev.map((b) => (b.id === bookId ? { ...b, favorite: newFav } : b)));

    if (!currentUser || isBypassUser) {
      showSaveToast(newFav ? 'Marcado como favorito!' : 'Removido dos favoritos!');
      return;
    }

    try {
      await toggleFavoriteInDb(bookId, newFav);
      showSaveToast(newFav ? 'Marcado como favorito no banco!' : 'Removido dos favoritos no banco!');
    } catch (err) {
      console.error('Error favorite:', err);
    }
  };

  const handleAddBook = async (bookData: Omit<Book, 'id'>) => {
    const docId = 'book_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6);
    const newBook: Book = {
      ...bookData,
      id: docId,
      createdBy: currentUser?.uid || 'local',
      updatedAt: new Date().toISOString(),
    };

    // Add and immediately sort in alphabetical order A-Z
    setBooks((prev) => [...prev, newBook].sort(sortBooksAlphabetically));

    if (!currentUser || isBypassUser) {
      showSaveToast('Livro adicionado na sessão.');
      return;
    }

    try {
      setIsSyncing(true);
      await createBookInDb(docId, bookData, currentUser.uid);
      showSaveToast('Livro adicionado e salvo com sucesso no banco!');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleUpdateBook = async (updatedBook: Book) => {
    // 1. Immediately apply to in-memory state and maintain alphabetical order
    setBooks((prev) =>
      prev
        .map((b) => (b.id === updatedBook.id ? updatedBook : b))
        .sort(sortBooksAlphabetically)
    );

    if (!currentUser || isBypassUser) {
      clearBookDraft(updatedBook.id);
      showSaveToast('Alterações salvas na sessão.');
      return;
    }

    try {
      setIsSyncing(true);
      // 2. Persist to Firestore with timeout
      await updateBookInDb(updatedBook);
      // 3. Clear session draft ONLY after database update completes
      clearBookDraft(updatedBook.id);
      showSaveToast('Alterações salvas com sucesso no banco!');
    } catch (err: any) {
      console.error('Falha em handleUpdateBook:', err);
      setErrorNotice('Não foi possível sincronizar com o banco de dados. O rascunho continua seguro na sessão.');
      throw err;
    } finally {
      setIsSyncing(false);
    }
  };

  const handleBatchUpdateBooks = async (
    updatedBooksList: Book[],
    onProgress?: BatchProgressCallback
  ): Promise<BatchSaveResult> => {
    if (updatedBooksList.length === 0) {
      return { success: true, savedCount: 0, totalCount: 0, failedBookIds: [], errors: [] };
    }

    // 1. Immediately apply all to in-memory state and keep alphabetical
    setBooks((prev) => {
      const map = new Map(updatedBooksList.map((b) => [b.id, b]));
      return prev
        .map((b) => (map.has(b.id) ? map.get(b.id)! : b))
        .sort(sortBooksAlphabetically);
    });

    if (!currentUser || isBypassUser) {
      updatedBooksList.forEach((b) => clearBookDraft(b.id));
      showSaveToast(`${updatedBooksList.length} livro(s) alterado(s) na sessão.`);
      return {
        success: true,
        savedCount: updatedBooksList.length,
        totalCount: updatedBooksList.length,
        failedBookIds: [],
        errors: [],
      };
    }

    try {
      setIsSyncing(true);
      const result = await batchUpdateBooksInDb(updatedBooksList, onProgress);

      // ONLY for books that succeeded in the database, clear their session drafts
      const failedSet = new Set(result.failedBookIds);
      updatedBooksList.forEach((b) => {
        if (!failedSet.has(b.id)) {
          clearBookDraft(b.id);
        }
      });

      if (result.success) {
        showSaveToast(`${result.savedCount} livro(s) salvo(s) com sucesso no banco!`);
      } else {
        setErrorNotice(
          `Salvos ${result.savedCount} de ${result.totalCount} livros. Os que falharam permanecem como rascunho.`
        );
      }

      return result;
    } catch (err: any) {
      console.error('Falha em handleBatchUpdateBooks:', err);
      setErrorNotice('Não foi possível salvar todos os livros no banco. Seus rascunhos continuam na sessão.');
      throw err;
    } finally {
      setIsSyncing(false);
    }
  };

  /**
   * Updates or resets the production database ('books') with the 84 spreadsheet books.
   */
  const handleSyncProductionSpreadsheet = async (
    onProgress?: BatchProgressCallback
  ): Promise<void> => {
    if (!currentUser || isBypassUser) {
      showSaveToast('Apenas usuários autenticados podem sincronizar o banco de produção.');
      return;
    }

    try {
      setIsSyncing(true);
      await syncProductionBooksWithSpreadsheet(currentUser, onProgress);
      showSaveToast('Banco de produção sincronizado com a planilha com sucesso (84 livros)!');
    } catch (err: any) {
      console.error('Falha ao sincronizar banco de produção:', err);
      setErrorNotice('Erro ao sincronizar banco de produção com a planilha.');
      throw err;
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDeleteBook = async (bookId: string) => {
    setBooks((prev) => prev.filter((b) => b.id !== bookId));
    clearBookDraft(bookId);

    if (!currentUser || isBypassUser) {
      showSaveToast('Livro excluído da sessão.');
      return;
    }

    try {
      setIsSyncing(true);
      await deleteBookFromDb(bookId);
      showSaveToast('Livro excluído do banco de dados.');
    } finally {
      setIsSyncing(false);
    }
  };

  return {
    books,
    isLoading,
    isSyncing,
    errorNotice,
    setErrorNotice,
    saveNotice,
    setSaveNotice,
    seedNotice,
    setSeedNotice,
    handleUpdateStatus,
    handleUpdateReader,
    handleToggleFavorite,
    handleAddBook,
    handleUpdateBook,
    handleBatchUpdateBooks,
    handleSyncProductionSpreadsheet,
    handleDeleteBook,
  };
}
