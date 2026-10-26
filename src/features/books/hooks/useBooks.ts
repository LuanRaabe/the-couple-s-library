import { useState, useEffect, useRef } from 'react';
import { collection, onSnapshot, getDocs } from 'firebase/firestore';
import { User as FirebaseUser } from 'firebase/auth';
import { db, handleFirestoreError, OperationType } from '../../../firebase';
import { Book, BookStatus, ReaderId } from '../types';
import { USER_INITIAL_BOOKS } from '../../../data/userBooks';
import {
  updateBookStatusInDb,
  updateBookReaderInDb,
  toggleFavoriteInDb,
  createBookInDb,
  updateBookInDb,
  deleteBookFromDb,
  seedBaseBooksInDb,
} from '../services/bookService';

export function useBooks(currentUser: FirebaseUser | null) {
  const [books, setBooks] = useState<Book[]>(() => {
    return USER_INITIAL_BOOKS.map((b, idx) => ({
      ...b,
      id: `book_${(b as any).originalId || idx + 1}`,
    }));
  });

  // Automatic updates toggle (Default: ON / true)
  const [autoSync, setAutoSync] = useState<boolean>(() => {
    const saved = localStorage.getItem('nossa_estante_auto_sync');
    return saved !== null ? saved === 'true' : true;
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);
  const [saveNotice, setSaveNotice] = useState<string | null>(null);
  const [seedNotice, setSeedNotice] = useState<string | null>(null);
  const isSeedingRef = useRef(false);

  const showAutoSaveToast = (msg = 'Salvo automaticamente no banco de dados!') => {
    setSaveNotice(msg);
    setTimeout(() => {
      setSaveNotice((curr) => (curr === msg ? null : curr));
    }, 3500);
  };

  const handleToggleAutoSync = () => {
    setAutoSync((prev) => {
      const nextVal = !prev;
      localStorage.setItem('nossa_estante_auto_sync', String(nextVal));
      if (nextVal) {
        showAutoSaveToast('Atualização automática ATIVADA em tempo real.');
      } else {
        showAutoSaveToast('Atualização automática DESATIVADA (Pausada).');
      }
      return nextVal;
    });
  };

  // Manual sync when autoSync is paused
  const handleManualSync = async () => {
    if (!currentUser) {
      setErrorNotice('Faça login com sua conta Google para sincronizar com o banco.');
      return;
    }

    try {
      setIsSyncing(true);
      setErrorNotice(null);
      const snapshot = await getDocs(collection(db, 'books'));
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
          favorite: !!data.favorite,
          dateAdded: data.dateAdded || '',
          dateStarted: data.dateStarted || '',
          dateFinished: data.dateFinished || '',
          createdBy: data.createdBy || '',
          updatedAt: data.updatedAt || '',
        });
      });

      loadedBooks.sort((a, b) => {
        const aNum = parseInt(a.id.replace('book_', ''), 10);
        const bNum = parseInt(b.id.replace('book_', ''), 10);
        if (!isNaN(aNum) && !isNaN(bNum)) return aNum - bNum;
        return a.title.localeCompare(b.title);
      });

      setBooks(loadedBooks);
      showAutoSaveToast('Biblioteca sincronizada manualmente com o banco!');
    } catch (err) {
      console.error('Manual sync error:', err);
      setErrorNotice('Erro ao sincronizar manualmente.');
      handleFirestoreError(err, OperationType.LIST, 'books');
    } finally {
      setIsSyncing(false);
    }
  };

  // Listen to Books collection in real-time when autoSync is true
  useEffect(() => {
    if (!currentUser) {
      setIsLoading(false);
      setBooks(
        USER_INITIAL_BOOKS.map((b, idx) => ({
          ...b,
          id: `book_${(b as any).originalId || idx + 1}`,
        }))
      );
      return;
    }

    // If autoSync is disabled, do not attach real-time continuous listener
    if (!autoSync) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const booksCollectionPath = 'books';
    const booksRef = collection(db, booksCollectionPath);

    const unsubscribe = onSnapshot(
      booksRef,
      (snapshot) => {
        // If Firestore is empty (first login on new database)
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
            favorite: !!data.favorite,
            dateAdded: data.dateAdded || '',
            dateStarted: data.dateStarted || '',
            dateFinished: data.dateFinished || '',
            createdBy: data.createdBy || '',
            updatedAt: data.updatedAt || '',
          });
        });

        // Sort naturally by book number
        loadedBooks.sort((a, b) => {
          const aNum = parseInt(a.id.replace('book_', ''), 10);
          const bNum = parseInt(b.id.replace('book_', ''), 10);
          if (!isNaN(aNum) && !isNaN(bNum)) return aNum - bNum;
          return a.title.localeCompare(b.title);
        });

        setBooks(loadedBooks);
        setIsLoading(false);
        setIsSyncing(false);
      },
      (error) => {
        setIsLoading(false);
        setErrorNotice('Não foi possível sincronizar os livros. Verifique sua conexão.');
        handleFirestoreError(error, OperationType.LIST, booksCollectionPath);
      }
    );

    return () => unsubscribe();
  }, [currentUser, autoSync]);

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

    if (!currentUser) {
      setErrorNotice('Atenção: Você está desconectado. Faça login para salvar alterações no banco de dados na nuvem.');
      return;
    }

    if (!autoSync) {
      showAutoSaveToast('Status alterado localmente (Auto-update desativado).');
      return;
    }

    try {
      setIsSyncing(true);
      await updateBookStatusInDb(bookId, newStatus, book);
      showAutoSaveToast('Status atualizado e salvo automaticamente no banco!');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleUpdateReader = async (bookId: string, newReader: ReaderId) => {
    setBooks((prev) =>
      prev.map((b) => (b.id === bookId ? { ...b, assignedReader: newReader } : b))
    );

    if (!currentUser) {
      setErrorNotice('Atenção: Faça login para salvar o leitor no banco compartilhado.');
      return;
    }

    if (!autoSync) {
      showAutoSaveToast('Leitor alterado localmente (Auto-update desativado).');
      return;
    }

    try {
      setIsSyncing(true);
      await updateBookReaderInDb(bookId, newReader);
      showAutoSaveToast('Leitor do livro atualizado no banco de dados!');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleToggleFavorite = async (bookId: string) => {
    const book = books.find((b) => b.id === bookId);
    if (!book) return;

    const newFav = !book.favorite;
    setBooks((prev) => prev.map((b) => (b.id === bookId ? { ...b, favorite: newFav } : b)));

    if (!currentUser) {
      setErrorNotice('Atenção: Faça login para salvar favoritos no banco de dados.');
      return;
    }

    if (!autoSync) {
      showAutoSaveToast('Favorito alterado localmente (Auto-update desativado).');
      return;
    }

    try {
      await toggleFavoriteInDb(bookId, newFav);
      showAutoSaveToast(newFav ? 'Marcado como favorito no banco!' : 'Removido dos favoritos no banco!');
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

    setBooks((prev) => [newBook, ...prev]);

    if (!currentUser) {
      setErrorNotice('Livro adicionado na sessão local. Faça login para salvá-lo no banco compartilhado.');
      return;
    }

    if (!autoSync) {
      showAutoSaveToast('Livro adicionado localmente (Auto-update desativado).');
      return;
    }

    try {
      setIsSyncing(true);
      await createBookInDb(docId, bookData, currentUser.uid);
      showAutoSaveToast('Livro adicionado e salvo com sucesso no banco!');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleUpdateBook = async (updatedBook: Book) => {
    setBooks((prev) => prev.map((b) => (b.id === updatedBook.id ? updatedBook : b)));

    if (!currentUser) {
      setErrorNotice('Alterações aplicadas na sessão. Faça login para salvar permanentemente no banco.');
      return;
    }

    if (!autoSync) {
      showAutoSaveToast('Alterações salvas localmente (Auto-update desativado).');
      return;
    }

    try {
      setIsSyncing(true);
      await updateBookInDb(updatedBook);
      showAutoSaveToast('Alterações salvas automaticamente no banco de dados!');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDeleteBook = async (bookId: string) => {
    setBooks((prev) => prev.filter((b) => b.id !== bookId));

    if (!currentUser) {
      setErrorNotice('Livro excluído localmente. Faça login para sincronizar no banco de dados.');
      return;
    }

    if (!autoSync) {
      showAutoSaveToast('Livro excluído localmente (Auto-update desativado).');
      return;
    }

    try {
      setIsSyncing(true);
      await deleteBookFromDb(bookId);
      showAutoSaveToast('Livro excluído do banco de dados.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleRestoreBaseBooks = async () => {
    if (!currentUser) {
      setErrorNotice('Faça login com sua conta Google para restaurar livros na nuvem.');
      return;
    }

    try {
      setIsSyncing(true);
      setSeedNotice('Restaurando os 84 livros na nuvem do Firebase...');
      await seedBaseBooksInDb(currentUser, true);
      setSeedNotice('Acervo de 84 livros sincronizado com sucesso!');
      setTimeout(() => setSeedNotice(null), 5000);
    } catch (err) {
      console.error('Error restore:', err);
      setErrorNotice('Erro ao restaurar acervo. Tente novamente.');
    } finally {
      setIsSyncing(false);
    }
  };

  return {
    books,
    isLoading,
    isSyncing,
    autoSync,
    handleToggleAutoSync,
    handleManualSync,
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
    handleDeleteBook,
    handleRestoreBaseBooks,
  };
}
