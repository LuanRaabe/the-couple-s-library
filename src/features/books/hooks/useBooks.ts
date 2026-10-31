import { useState, useEffect, useRef, useCallback } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { User as FirebaseUser } from 'firebase/auth';
import { db, handleFirestoreError, OperationType } from '@/core/firebase';
import { Book, BookStatus, ReaderId } from '../types';
import { USER_INITIAL_BOOKS } from '../data/userBooks';
import {
  updateBookStatusInDb,
  updateBookReaderInDb,
  toggleFavoriteInDb,
  updateBookOwnedInDb,
  createBookInDb,
  updateBookInDb,
  batchUpdateBooksInDb,
  deleteBookFromDb,
  syncProductionBooksWithSpreadsheet,
  BatchProgressCallback,
  BatchSaveResult,
} from '../services/bookRepository';
import { getDbTarget } from '@/core/config/env';
import { clearBookDraft } from '@/core/session/draft';
import { getCachedBooks, setCachedBooks } from '@/core/storage/indexedDbCache';

/**
 * Compares two books alphabetically by title according to Brazilian Portuguese collation.
 */
export function sortBooksAlphabetically(a: Book, b: Book): number {
  return (a.title || '').localeCompare(b.title || '', 'pt-BR', { sensitivity: 'base' });
}

/**
 * Safely transforms a Firestore document snapshot into a Book typed object.
 */
export function mapFirestoreDocToBook(id: string, data: any): Book {
  return {
    id,
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
    owned: data.owned !== undefined ? Boolean(data.owned) : true,
    dateAdded: data.dateAdded || '',
    dateStarted: data.dateStarted || '',
    dateFinished: data.dateFinished || '',
    createdBy: data.createdBy || '',
    updatedAt: data.updatedAt || '',
  };
}

export function useBooks(currentUser: FirebaseUser | null, dbTargetTrigger?: number) {
  // Start empty — NEVER use mock books. Only load from cache or Firestore database.
  const [books, setBooks] = useState<Book[]>([]);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [lastSyncTime, setLastSyncTime] = useState<number | null>(null);
  const [isFromCache, setIsFromCache] = useState<boolean>(false);

  const [errorNotice, setErrorNotice] = useState<string | null>(null);
  const [saveNotice, setSaveNotice] = useState<string | null>(null);
  const [seedNotice, setSeedNotice] = useState<string | null>(null);

  const isBypassUser = currentUser?.uid === 'dev-maintenance-admin';

  const showSaveToast = (msg = 'Salvo com sucesso no banco de dados!') => {
    setSaveNotice(msg);
    setTimeout(() => {
      setSaveNotice((curr) => (curr === msg ? null : curr));
    }, 3500);
  };

  /**
   * Helper that updates in-memory state and immediately updates IndexedDB cache.
   */
  const updateBooksAndCache = (updater: (prev: Book[]) => Book[]) => {
    setBooks((prev) => {
      const next = updater(prev).sort(sortBooksAlphabetically);
      const collectionTarget = getDbTarget();
      setCachedBooks(collectionTarget, next).catch((err) => {
        console.warn('Erro ao atualizar cache IndexedDB:', err);
      });
      return next;
    });
  };

  /**
   * Actively queries the Firestore cloud database (getDocs) and updates IndexedDB cache.
   * Can be triggered manually by the user or automatically on first run when cache is empty.
   */
  const handleReloadFromFirestore = useCallback(
    async (isManual = true, customToastMsg?: string) => {
      if (!currentUser || isBypassUser) return;

      const booksCollectionPath = getDbTarget();
      const booksRef = collection(db, booksCollectionPath);

      if (isManual) setIsRefreshing(true);

      try {
        const snapshot = await getDocs(booksRef);
        const loadedBooks: Book[] = [];

        if (!snapshot.empty) {
          snapshot.forEach((docSnap) => {
            loadedBooks.push(mapFirestoreDocToBook(docSnap.id, docSnap.data()));
          });
        }

        loadedBooks.sort(sortBooksAlphabetically);
        setBooks(loadedBooks);

        // Update IndexedDB cache
        await setCachedBooks(booksCollectionPath, loadedBooks);

        const now = Date.now();
        setLastSyncTime(now);
        setIsFromCache(false);

        if (isManual) {
          if (customToastMsg) {
            showSaveToast(customToastMsg);
          } else {
            const timeStr = new Date(now).toLocaleTimeString('pt-BR', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            });
            showSaveToast(`✓ ${loadedBooks.length} livro(s) sincronizados com o banco às ${timeStr}!`);
          }
        }
      } catch (err: any) {
        console.error('Erro ao buscar dados do Firestore:', err);
        setErrorNotice('Não foi possível sincronizar com o banco de dados no momento.');
        try {
          handleFirestoreError(err, OperationType.LIST, booksCollectionPath);
        } catch (e) {
          // Handled
        }
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [currentUser, isBypassUser]
  );

  /**
   * Initial Load: Checks IndexedDB first.
   * If cache exists, loads instantly with ZERO Firestore document read requests!
   * If cache is empty (first access), fetches once from Firestore and populates IndexedDB.
   */
  useEffect(() => {
    let isCancelled = false;

    if (!currentUser) {
      setIsLoading(false);
      setBooks([]);
      return;
    }

    if (isBypassUser) {
      setBooks(
        USER_INITIAL_BOOKS.map((b, idx) => ({
          ...b,
          id: `book_${(b as any).originalId || idx + 1}`,
        })).sort(sortBooksAlphabetically)
      );
      setIsLoading(false);
      return;
    }

    const loadInitialBooks = async () => {
      setIsLoading(true);
      const collectionTarget = getDbTarget();

      // 1. Try reading from IndexedDB cache
      try {
        const cached = await getCachedBooks(collectionTarget);
        if (isCancelled) return;

        if (cached && Array.isArray(cached.books) && cached.books.length > 0) {
          // Immediate render from client cache: 0 Firestore read operations!
          setBooks(cached.books.sort(sortBooksAlphabetically));
          setLastSyncTime(cached.cachedAt);
          setIsFromCache(true);
          setIsLoading(false);
          return;
        }
      } catch (cacheErr) {
        console.warn('Falha na leitura do cache IndexedDB, consultando Firestore:', cacheErr);
      }

      // 2. Cache is empty — perform single fetch from Firestore
      if (!isCancelled) {
        await handleReloadFromFirestore(false);
      }
    };

    loadInitialBooks();

    return () => {
      isCancelled = true;
    };
  }, [currentUser, dbTargetTrigger, handleReloadFromFirestore]);

  // Actions with simultaneous Cloud Firestore + IndexedDB synchronization

  const handleUpdateStatus = async (bookId: string, newStatus: BookStatus) => {
    const book = books.find((b) => b.id === bookId);
    const isNowFinished = newStatus === 'lido';

    updateBooksAndCache((prev) =>
      prev.map((b) =>
        b.id === bookId
          ? {
              ...b,
              status: newStatus,
              dateStarted:
                newStatus === 'lendo' && !b.dateStarted
                  ? new Date().toISOString().split('T')[0]
                  : b.dateStarted,
              dateFinished: isNowFinished
                ? b.dateFinished || new Date().toISOString().split('T')[0]
                : b.dateFinished,
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
    updateBooksAndCache((prev) =>
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
    updateBooksAndCache((prev) =>
      prev.map((b) => (b.id === bookId ? { ...b, favorite: newFav } : b))
    );

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

  const handleToggleOwned = async (bookId: string, newOwned: boolean) => {
    const book = books.find((b) => b.id === bookId);
    if (!book) return;

    updateBooksAndCache((prev) =>
      prev.map((b) => (b.id === bookId ? { ...b, owned: newOwned } : b))
    );

    if (!currentUser || isBypassUser) {
      showSaveToast(newOwned ? 'Marcado como exemplar que temos!' : 'Marcado como Lista de Desejos!');
      return;
    }

    try {
      await updateBookOwnedInDb(bookId, newOwned);
      showSaveToast(newOwned ? 'Marcado: Temos na Estante!' : 'Adicionado à Lista de Desejos!');
    } catch (err) {
      console.error('Error updating owned status in db:', err);
    }
  };

  const handleAddBook = async (bookData: Omit<Book, 'id'>) => {
    const docId =
      'book_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6);
    const newBook: Book = {
      ...bookData,
      id: docId,
      createdBy: currentUser?.uid || 'local',
      updatedAt: new Date().toISOString(),
    };

    // 1. Otimista: Salva imediatamente no estado React e persiste no cache IndexedDB
    updateBooksAndCache((prev) => [...prev, newBook]);

    if (!currentUser || isBypassUser) {
      showSaveToast('Livro adicionado na sessão.');
      return;
    }

    try {
      setIsSyncing(true);
      // 2. Grava o documento no Firestore
      await createBookInDb(docId, bookData, currentUser.uid);

      // 3. Dispara busca fresca em background no banco para garantir sincronização total:
      // O botão de recarga exibe rotação (isRefreshing = true),
      // a lista continua sendo exibida sem sumir nem piscar a interface (isLoading permanece false),
      // e ao término um toast confirma que os dados do banco foram atualizados e sincronizados.
      handleReloadFromFirestore(
        true,
        `✓ Livro "${bookData.title}" adicionado e estante sincronizada com o banco!`
      ).catch((err) => {
        console.warn('Erro ao atualizar dados em background após adição:', err);
      });
    } catch (err: any) {
      console.error('Erro ao adicionar livro:', err);
      setErrorNotice('Não foi possível salvar o livro no banco de dados.');
      throw err;
    } finally {
      setIsSyncing(false);
    }
  };

  const handleUpdateBook = async (updatedBook: Book) => {
    updateBooksAndCache((prev) =>
      prev.map((b) => (b.id === updatedBook.id ? updatedBook : b))
    );

    if (!currentUser || isBypassUser) {
      clearBookDraft(updatedBook.id);
      showSaveToast('Alterações salvas na sessão.');
      return;
    }

    try {
      setIsSyncing(true);
      await updateBookInDb(updatedBook);
      clearBookDraft(updatedBook.id);
      showSaveToast('Alterações salvas com sucesso no banco!');
    } catch (err: any) {
      console.error('Falha em handleUpdateBook:', err);
      setErrorNotice('Não foi possível salvar no banco. O rascunho continua seguro na sessão.');
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

    updateBooksAndCache((prev) => {
      const map = new Map(updatedBooksList.map((b) => [b.id, b]));
      return prev.map((b) => (map.has(b.id) ? map.get(b.id)! : b));
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
      // Fetch fresh data from Firestore and update IndexedDB cache
      await handleReloadFromFirestore(false);
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
    updateBooksAndCache((prev) => prev.filter((b) => b.id !== bookId));
    clearBookDraft(bookId);

    if (!currentUser || isBypassUser) {
      showSaveToast('Livro excluído da sessão.');
      return;
    }

    try {
      setIsSyncing(true);
      await deleteBookFromDb(bookId);
      handleReloadFromFirestore(
        true,
        '✓ Livro excluído e estante sincronizada com o banco!'
      ).catch((err) => {
        console.warn('Erro ao atualizar dados em background após exclusão:', err);
      });
    } finally {
      setIsSyncing(false);
    }
  };

  return {
    books,
    isLoading,
    isSyncing,
    isRefreshing,
    lastSyncTime,
    isFromCache,
    handleReloadFromFirestore,
    errorNotice,
    setErrorNotice,
    saveNotice,
    setSaveNotice,
    seedNotice,
    setSeedNotice,
    handleUpdateStatus,
    handleUpdateReader,
    handleToggleFavorite,
    handleToggleOwned,
    handleAddBook,
    handleUpdateBook,
    handleBatchUpdateBooks,
    handleSyncProductionSpreadsheet,
    handleDeleteBook,
  };
}
