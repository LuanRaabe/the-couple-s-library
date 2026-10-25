/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  collection, 
  doc, 
  onSnapshot, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  getDoc,
  writeBatch 
} from 'firebase/firestore';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { 
  LayoutGrid, 
  Table as TableIcon, 
  KanbanSquare, 
  MessageSquareHeart, 
  BarChart2, 
  Search, 
  Filter, 
  BookOpen, 
  Sparkles,
  Heart,
  AlertCircle,
  Plus,
  RefreshCw,
  CheckCircle2
} from 'lucide-react';

import { 
  db, 
  auth, 
  loginWithGoogle, 
  logoutUser, 
  testConnection, 
  handleFirestoreError, 
  OperationType 
} from './firebase';
import { Book, BookStatus, ReaderId, LibrarySettings } from './types/book';
import { USER_INITIAL_BOOKS } from './data/userBooks';

import { Header } from './components/Header';
import { BookTable } from './components/BookTable';
import { BookGrid } from './components/BookGrid';
import { BookKanban } from './components/BookKanban';
import { RecommendationsView } from './components/RecommendationsView';
import { StatsView } from './components/StatsView';
import { AddBookModal } from './components/AddBookModal';
import { BookDetailModal } from './components/BookDetailModal';
import { SettingsModal } from './components/SettingsModal';
import { BatchCoverSyncModal } from './components/BatchCoverSyncModal';

type ActiveTab = 'grid' | 'table' | 'kanban' | 'recommendations' | 'stats';

export default function App() {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [authInitialized, setAuthInitialized] = useState(false);

  // Settings: Luan & Theresa
  const [settings, setSettings] = useState<LibrarySettings>({
    eleName: 'Luan',
    elaName: 'Theresa',
    yearlyGoal: 40,
  });

  // Active browsing reader ('ele' vs 'ela')
  const [activeReader, setActiveReader] = useState<'ele' | 'ela'>(() => {
    return (localStorage.getItem('nossa_estante_active_reader') as 'ele' | 'ela') || 'ele';
  });

  // Navigation tab
  const [currentTab, setCurrentTab] = useState<ActiveTab>('grid');

  // Books data initialized with user's complete 84 enriched books
  const [books, setBooks] = useState<Book[]>(() => {
    return USER_INITIAL_BOOKS.map((b, idx) => ({
      ...b,
      id: `book_${(b as any).originalId || idx + 1}`,
    }));
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);
  const [seedNotice, setSeedNotice] = useState<string | null>(null);
  const isSeedingRef = useRef(false);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [readerFilter, setReaderFilter] = useState<'todos' | 'ele' | 'ela' | 'ambos'>('todos');
  const [statusFilter, setStatusFilter] = useState<'todos' | BookStatus>('todos');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isSyncCoversModalOpen, setIsSyncCoversModalOpen] = useState(false);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);

  // Save active reader in local storage
  const handleSetActiveReader = (reader: 'ele' | 'ela') => {
    setActiveReader(reader);
    localStorage.setItem('nossa_estante_active_reader', reader);
  };

  // Test Firestore Connection on Boot
  useEffect(() => {
    testConnection();
  }, []);

  // Listen to Auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setAuthInitialized(true);
      if (!user) {
        // Fallback to initial 84 books so the app is never empty when logged out
        setBooks(
          USER_INITIAL_BOOKS.map((b, idx) => ({
            ...b,
            id: `book_${(b as any).originalId || idx + 1}`,
          }))
        );
      }
    });
    return () => unsubscribe();
  }, []);

  // Seed full library of Luan & Theresa into Firestore via atomic batch
  const seedLibraryToFirestore = async (targetUser?: FirebaseUser | null) => {
    const userToUse = targetUser || currentUser;
    if (!userToUse) {
      try {
        await loginWithGoogle();
        return;
      } catch (err) {
        console.error('Login error for sync:', err);
        return;
      }
    }

    try {
      setIsSyncing(true);
      setErrorNotice(null);
      setSeedNotice('Salvando e sincronizando seus 84 livros na nuvem do Firebase...');

      const batch = writeBatch(db);
      USER_INITIAL_BOOKS.forEach((bookItem, idx) => {
        const origId = (bookItem as any).originalId || (idx + 1);
        const docId = `book_${origId}`;
        const bookRef = doc(db, 'books', docId);
        batch.set(bookRef, {
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
          createdBy: userToUse.uid,
          updatedAt: new Date().toISOString(),
        });
      });

      // Settings doc
      const settingsRef = doc(db, 'settings', 'couple');
      batch.set(
        settingsRef,
        {
          eleName: 'Luan',
          elaName: 'Theresa',
          yearlyGoal: 40,
          updatedBy: userToUse.uid,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );

      await batch.commit();

      setSettings({
        eleName: 'Luan',
        elaName: 'Theresa',
        yearlyGoal: 40,
      });

      setSeedNotice('Sua biblioteca de 84 livros foi salva e sincronizada na nuvem com sucesso para Luan e Theresa!');
      setTimeout(() => setSeedNotice(null), 6000);
    } catch (error) {
      console.error('Error batch seeding:', error);
      setErrorNotice('Erro ao salvar livros na nuvem. Você pode tentar novamente a qualquer momento.');
      handleFirestoreError(error, OperationType.WRITE, 'books');
    } finally {
      setIsSyncing(false);
      setIsLoading(false);
    }
  };

  // Listen to Settings from Firestore
  useEffect(() => {
    if (!currentUser) return;

    const settingsDocPath = 'settings';
    const settingsDocRef = doc(db, settingsDocPath, 'couple');

    const unsubscribe = onSnapshot(
      settingsDocRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data() as LibrarySettings;
          setSettings({
            eleName: data.eleName || 'Luan',
            elaName: data.elaName || 'Theresa',
            yearlyGoal: data.yearlyGoal || 40,
          });
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, `${settingsDocPath}/couple`);
      }
    );

    return () => unsubscribe();
  }, [currentUser]);

  // Listen to Books Collection from Firestore in Real-Time
  useEffect(() => {
    if (!currentUser) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const booksCollectionPath = 'books';
    const booksRef = collection(db, booksCollectionPath);

    const unsubscribe = onSnapshot(
      booksRef,
      (snapshot) => {
        // If Firestore is empty (first login on new database):
        if (snapshot.empty) {
          // Do NOT wipe books to empty array! Trigger auto-seed!
          if (!isSeedingRef.current) {
            isSeedingRef.current = true;
            seedLibraryToFirestore(currentUser).finally(() => {
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

        // Keep selectedBook state updated if open
        if (selectedBook) {
          const fresh = loadedBooks.find((b) => b.id === selectedBook.id);
          if (fresh) setSelectedBook(fresh);
        }
      },
      (error) => {
        setIsLoading(false);
        setErrorNotice('Não foi possível sincronizar os livros. Verifique sua conexão.');
        handleFirestoreError(error, OperationType.LIST, booksCollectionPath);
      }
    );

    return () => unsubscribe();
  }, [currentUser]);

  // Actions
  const handleUpdateStatus = async (bookId: string, newStatus: BookStatus) => {
    if (!currentUser) {
      setErrorNotice('Faça login com sua conta Google para sincronizar alterações.');
      return;
    }

    const path = `books/${bookId}`;
    try {
      setIsSyncing(true);
      const bookRef = doc(db, 'books', bookId);
      const book = books.find((b) => b.id === bookId);
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
    } finally {
      setIsSyncing(false);
    }
  };

  const handleToggleFavorite = async (bookId: string) => {
    if (!currentUser) return;
    const book = books.find((b) => b.id === bookId);
    if (!book) return;

    const path = `books/${bookId}`;
    try {
      const bookRef = doc(db, 'books', bookId);
      await updateDoc(bookRef, {
        favorite: !book.favorite,
        updatedAt: new Date().toISOString(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  };

  const handleAddBook = async (bookData: Omit<Book, 'id'>) => {
    if (!currentUser) {
      setErrorNotice('Faça login para salvar livros na estante compartilhada.');
      return;
    }

    const docId = 'book_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6);
    const path = `books/${docId}`;
    try {
      setIsSyncing(true);
      const bookRef = doc(db, 'books', docId);
      await setDoc(bookRef, {
        ...bookData,
        createdBy: currentUser.uid,
        updatedAt: new Date().toISOString(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleUpdateBook = async (updatedBook: Book) => {
    if (!currentUser) return;
    const path = `books/${updatedBook.id}`;
    try {
      setIsSyncing(true);
      const bookRef = doc(db, 'books', updatedBook.id);
      const { id, ...dataToSave } = updatedBook;
      await updateDoc(bookRef, {
        ...dataToSave,
        updatedAt: new Date().toISOString(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDeleteBook = async (bookId: string) => {
    if (!currentUser) return;
    const path = `books/${bookId}`;
    try {
      setIsSyncing(true);
      await deleteDoc(doc(db, 'books', bookId));
      if (selectedBook?.id === bookId) {
        setSelectedBook(null);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSaveSettings = async (newSettings: LibrarySettings) => {
    if (!currentUser) return;
    const path = 'settings/couple';
    try {
      await setDoc(doc(db, 'settings', 'couple'), {
        ...newSettings,
        updatedBy: currentUser.uid,
        updatedAt: new Date().toISOString(),
      });
      setSettings(newSettings);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  };

  // Seed full library of Luan & Theresa into Firestore
  const handleSeedSampleData = async () => {
    await seedLibraryToFirestore(currentUser);
  };

  // Filtered books
  const filteredBooks = useMemo(() => {
    return books.filter((book) => {
      // Search
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = book.title.toLowerCase().includes(query);
        const matchesAuthor = book.authors.toLowerCase().includes(query);
        const matchesCategory = book.categories?.some((c) => c.toLowerCase().includes(query));
        if (!matchesTitle && !matchesAuthor && !matchesCategory) return false;
      }

      // Reader Filter
      if (readerFilter !== 'todos') {
        if (readerFilter === 'ele' && book.assignedReader !== 'ele' && book.assignedReader !== 'ambos') return false;
        if (readerFilter === 'ela' && book.assignedReader !== 'ela' && book.assignedReader !== 'ambos') return false;
        if (readerFilter === 'ambos' && book.assignedReader !== 'ambos') return false;
      }

      // Status Filter
      if (statusFilter !== 'todos') {
        if (book.status !== statusFilter) return false;
      }

      return true;
    });
  }, [books, searchQuery, readerFilter, statusFilter]);

  const readCount = useMemo(() => books.filter((b) => b.status === 'lido').length, [books]);

  return (
    <div className="min-h-screen bg-[#faf8f5] dark:bg-stone-950 text-stone-800 dark:text-stone-200 flex flex-col font-sans selection:bg-amber-200 dark:selection:bg-amber-900 selection:text-amber-950">
      
      {/* Header */}
      <Header
        settings={settings}
        activeReader={activeReader}
        setActiveReader={handleSetActiveReader}
        currentUser={currentUser}
        onLogin={loginWithGoogle}
        onLogout={logoutUser}
        onOpenAddModal={() => setIsAddModalOpen(true)}
        onOpenSettingsModal={() => setIsSettingsModalOpen(true)}
        onOpenSyncCoversModal={() => setIsSyncCoversModalOpen(true)}
        onSeedSampleData={handleSeedSampleData}
        totalBooks={books.length}
        readCount={readCount}
        isSyncing={isSyncing}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        
        {/* Unauthenticated Welcome Banner */}
        {!currentUser && (
          <div className="bg-gradient-to-r from-amber-500/15 via-rose-500/15 to-purple-500/15 border border-amber-300/80 dark:border-stone-800 rounded-3xl p-6 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-600 text-white flex items-center justify-center shrink-0 shadow-md">
                <BookOpen className="w-6 h-6" />
              </div>
              <div>
                <h2 className="font-serif font-bold text-lg text-stone-900 dark:text-stone-100 flex items-center gap-2">
                  Bem-vindos à Estante de Luan & Theresa!
                  <Heart className="w-4 h-4 text-rose-500 fill-rose-500 inline" />
                </h2>
                <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-400 mt-0.5">
                  Conecte sua conta Google para sincronizar as leituras, notas e recomendações em tempo real entre Luan e Theresa.
                </p>
              </div>
            </div>
            <button
              onClick={loginWithGoogle}
              className="px-5 py-2.5 bg-stone-900 hover:bg-stone-800 dark:bg-amber-600 dark:hover:bg-amber-700 text-white rounded-xl text-xs sm:text-sm font-semibold shadow-md shrink-0 flex items-center gap-2"
            >
              <span>Entrar com Google</span>
            </button>
          </div>
        )}

        {/* Seed / Sync Notice */}
        {seedNotice && (
          <div className="bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 p-3.5 rounded-2xl text-xs sm:text-sm flex items-center justify-between shadow-sm animate-in fade-in">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-medium">{seedNotice}</span>
            </div>
            <button
              onClick={() => setSeedNotice(null)}
              className="font-bold underline ml-2 text-xs"
            >
              Fechar
            </button>
          </div>
        )}

        {/* Global Error Notice if any */}
        {errorNotice && (
          <div className="bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-300 p-3.5 rounded-2xl text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600" />
              <span>{errorNotice}</span>
            </div>
            <button
              onClick={() => setErrorNotice(null)}
              className="font-bold underline ml-2"
            >
              Fechar
            </button>
          </div>
        )}

        {/* Navigation Tabs and Search/Filter Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-1">
          
          {/* Main 5 Tabs */}
          <div className="flex items-center bg-stone-200/70 dark:bg-stone-900 p-1.5 rounded-2xl border border-stone-300/70 dark:border-stone-800 overflow-x-auto shadow-inner">
            <button
              type="button"
              onClick={() => setCurrentTab('grid')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                currentTab === 'grid'
                  ? 'bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 shadow-sm'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 hover:bg-white/40'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span>Estante de Capas</span>
            </button>

            <button
              type="button"
              onClick={() => setCurrentTab('table')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                currentTab === 'table'
                  ? 'bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 shadow-sm'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 hover:bg-white/40'
              }`}
            >
              <TableIcon className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span>Tabela Geral</span>
            </button>

            <button
              type="button"
              onClick={() => setCurrentTab('kanban')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                currentTab === 'kanban'
                  ? 'bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 shadow-sm'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 hover:bg-white/40'
              }`}
            >
              <KanbanSquare className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span>Quadro de Arrastar</span>
            </button>

            <button
              type="button"
              onClick={() => setCurrentTab('recommendations')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                currentTab === 'recommendations'
                  ? 'bg-white dark:bg-stone-800 text-rose-600 dark:text-rose-400 shadow-sm'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 hover:bg-white/40'
              }`}
            >
              <MessageSquareHeart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
              <span>Recomendações</span>
            </button>

            <button
              type="button"
              onClick={() => setCurrentTab('stats')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                currentTab === 'stats'
                  ? 'bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 shadow-sm'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 hover:bg-white/40'
              }`}
            >
              <BarChart2 className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span>Estatísticas & Meta</span>
            </button>
          </div>

          {/* Search & Filter Bar (shown on Grid, Table, Kanban) */}
          {(currentTab === 'grid' || currentTab === 'table' || currentTab === 'kanban') && (
            <div className="flex flex-wrap items-center gap-2">
              {/* Search input */}
              <div className="relative flex-1 sm:w-60">
                <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-stone-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filtrar por título, autor..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-stone-300/80 dark:border-stone-800 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 placeholder:text-stone-400 focus:outline-hidden focus:ring-2 focus:ring-amber-500/40"
                />
              </div>

              {/* Filter Reader */}
              <select
                value={readerFilter}
                onChange={(e) => setReaderFilter(e.target.value as any)}
                className="text-xs rounded-xl px-2.5 py-1.5 bg-white dark:bg-stone-900 border border-stone-300/80 dark:border-stone-800 text-stone-800 dark:text-stone-200 font-medium cursor-pointer"
              >
                <option value="todos">Todos Leitores</option>
                <option value="ele">Apenas {settings.eleName}</option>
                <option value="ela">Apenas {settings.elaName}</option>
                <option value="ambos">Lidos em Conjunto</option>
              </select>

              {/* Filter Status (except when in Kanban) */}
              {currentTab !== 'kanban' && (
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="text-xs rounded-xl px-2.5 py-1.5 bg-white dark:bg-stone-900 border border-stone-300/80 dark:border-stone-800 text-stone-800 dark:text-stone-200 font-medium cursor-pointer"
                >
                  <option value="todos">Todos Status</option>
                  <option value="quero_ler">Quero Ler</option>
                  <option value="lendo">Lendo</option>
                  <option value="lido">Lido</option>
                  <option value="pausado">Pausado</option>
                  <option value="abandonado">Abandonado</option>
                </select>
              )}
            </div>
          )}
        </div>

        {/* View Switcher Output */}
        {isLoading ? (
          <div className="py-24 text-center space-y-3">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-amber-600" />
            <p className="font-serif text-sm text-stone-500">
              Conectando à estante em tempo real...
            </p>
          </div>
        ) : (
          <>
            {currentTab === 'grid' && (
              <BookGrid
                books={filteredBooks}
                settings={settings}
                onSelectBook={(b) => setSelectedBook(b)}
                onUpdateStatus={handleUpdateStatus}
                onToggleFavorite={handleToggleFavorite}
              />
            )}

            {currentTab === 'table' && (
              <BookTable
                books={filteredBooks}
                settings={settings}
                onSelectBook={(b) => setSelectedBook(b)}
                onUpdateStatus={handleUpdateStatus}
                onDeleteBook={handleDeleteBook}
                onToggleFavorite={handleToggleFavorite}
              />
            )}

            {currentTab === 'kanban' && (
              <BookKanban
                books={filteredBooks}
                settings={settings}
                onSelectBook={(b) => setSelectedBook(b)}
                onUpdateStatus={handleUpdateStatus}
                onOpenAddModal={() => setIsAddModalOpen(true)}
              />
            )}

            {currentTab === 'recommendations' && (
              <RecommendationsView
                books={books}
                settings={settings}
                activeReader={activeReader}
                onSelectBook={(b) => setSelectedBook(b)}
                onOpenAddModal={() => setIsAddModalOpen(true)}
              />
            )}

            {currentTab === 'stats' && (
              <StatsView
                books={books}
                settings={settings}
                onSelectBook={(b) => setSelectedBook(b)}
              />
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-auto py-6 border-t border-stone-200/60 dark:border-stone-800/80 text-center text-xs text-stone-400">
        <p className="flex items-center justify-center gap-1">
          Nossa Estante • Feito com carinho para {settings.eleName} & {settings.elaName}
          <Heart className="w-3 h-3 text-rose-500 fill-rose-500 inline" />
        </p>
      </footer>

      {/* Modals */}
      <AddBookModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAddBook={handleAddBook}
        settings={settings}
        activeReader={activeReader}
      />

      <BookDetailModal
        book={selectedBook}
        isOpen={!!selectedBook}
        onClose={() => setSelectedBook(null)}
        settings={settings}
        activeReader={activeReader}
        onUpdateBook={handleUpdateBook}
        onDeleteBook={handleDeleteBook}
      />

      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        settings={settings}
        onSaveSettings={handleSaveSettings}
        onRestoreBaseBooks={() => seedLibraryToFirestore(currentUser)}
      />

      <BatchCoverSyncModal
        isOpen={isSyncCoversModalOpen}
        onClose={() => setIsSyncCoversModalOpen(false)}
        books={books}
        onUpdateBook={handleUpdateBook}
      />

    </div>
  );
}
