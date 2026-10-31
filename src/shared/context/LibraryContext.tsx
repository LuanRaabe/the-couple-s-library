import { createContext, useContext } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Book, BookStatus, ReaderId } from '@/features/books';
import { LibrarySettings } from '@/features/settings';
import { OwnershipFilter } from '@/features/books/hooks/useBookFilters';

export interface LibraryOutletContext {
  books: Book[];
  isLoading: boolean;
  isSyncing?: boolean;
  isRefreshing: boolean;
  lastSyncTime: number | null;
  isFromCache: boolean;
  handleReloadFromFirestore: () => Promise<void> | void;
  handleUpdateStatus: (bookId: string, newStatus: BookStatus) => void;
  handleUpdateReader: (bookId: string, newReader: ReaderId) => void;
  handleToggleFavorite: (bookId: string) => void;
  handleToggleOwned: (bookId: string, newOwned: boolean) => void;
  handleAddBook: (bookData: Omit<Book, 'id'>) => Promise<void>;
  handleUpdateBook: (book: Book) => Promise<void>;
  handleBatchUpdateBooks: (books: Book[], onProgress?: any) => Promise<any>;
  handleDeleteBook: (bookId: string) => Promise<void>;
  settings: LibrarySettings;
  saveSettings: (newSettings: LibrarySettings) => Promise<void>;
  activeReader: 'ele' | 'ela';
  setActiveReader: (reader: 'ele' | 'ela') => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  readerFilter: 'todos' | 'ele' | 'ela' | 'ambos';
  setReaderFilter: (filter: 'todos' | 'ele' | 'ela' | 'ambos') => void;
  statusFilter: 'todos' | BookStatus;
  setStatusFilter: (filter: 'todos' | BookStatus) => void;
  ownershipFilter: OwnershipFilter;
  setOwnershipFilter: (filter: OwnershipFilter) => void;
  filteredBooks: Book[];
  readCount: number;
  wishlistCount: number;
  ownedCount: number;
  onOpenSidebar: () => void;
  onOpenSyncCoversModal: () => void;
  onOpenDebugMenu: () => void;
}

export const LibraryContext = createContext<LibraryOutletContext | null>(null);

export function useLibraryContext(): LibraryOutletContext {
  const context = useOutletContext<LibraryOutletContext>();
  if (context) return context;
  
  // Fallback to React context if not inside Outlet
  const directContext = useContext(LibraryContext);
  if (!directContext) {
    throw new Error('useLibraryContext must be used within an AppLayout or LibraryContext.Provider');
  }
  return directContext;
}
