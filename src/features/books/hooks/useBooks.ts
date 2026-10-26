import { useState, useEffect, useRef } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
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
import { getDbTarget } from '../../../utils/envHelper';
import { clearBookDraft } from '../../../utils/sessionDraft';

export function useBooks(currentUser: FirebaseUser | null, dbTargetTrigger?: number) {
  const [books, setBooks] = useState<Book[]>(() => {
    return USER_INITIAL_BOOKS.map((b, idx) => ({
      ...b,
      id: `book_${(b as any).originalId || idx + 1}`,
    }));
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
        }))
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

    setBooks((prev) => [newBook, ...prev]);

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
    // 1. Immediately apply to in-memory state
    setBooks((prev) => prev.map((b) => (b.id === updatedBook.id ? updatedBook : b)));

    if (!currentUser || isBypassUser) {
      clearBookDraft(updatedBook.id);
      showSaveToast('Alterações salvas na sessão.');
      return;
    }

    try {
      setIsSyncing(true);
      // 2. Persist to Firestore
      await updateBookInDb(updatedBook);
      // 3. Clear session draft ONLY after database update completes
      clearBookDraft(updatedBook.id);
      showSaveToast('Alterações salvas com sucesso no banco!');
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

  const handleRestoreBaseBooks = async () => {
    if (!currentUser || isBypassUser) {
      setErrorNotice('Faça login com sua conta Google para restaurar livros na nuvem.');
      return;
    }

    try {
      setIsSyncing(true);
      setSeedNotice('Restaurando os 84 livros no banco de dados...');
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
