import React, { useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { RefreshCw, BookOpen, Plus } from 'lucide-react';
import { useLibraryContext } from '@/shared/context/LibraryContext';
import { NavigationFilterBar } from '@/shared/components/NavigationFilterBar';
import { BookGrid } from '@/components/BookGrid';
import { BookTable } from '@/components/BookTable';
import { BookKanban } from '@/components/BookKanban';

export const BooksPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const rawView = searchParams.get('view');
  const currentView = (rawView === 'table' || rawView === 'kanban') ? rawView : 'grid';

  const {
    books,
    filteredBooks,
    isLoading,
    isRefreshing,
    lastSyncTime,
    isFromCache,
    handleReloadFromFirestore,
    handleUpdateStatus,
    handleUpdateReader,
    handleToggleFavorite,
    handleToggleOwned,
    handleUpdateBook,
    handleBatchUpdateBooks,
    handleDeleteBook,
    settings,
    searchQuery,
    setSearchQuery,
    readerFilter,
    setReaderFilter,
    statusFilter,
    setStatusFilter,
    ownershipFilter,
    setOwnershipFilter,
    wishlistCount,
    ownedCount,
    onOpenSidebar,
  } = useLibraryContext();

  const handleViewChange = (newView: 'grid' | 'table' | 'kanban') => {
    setSearchParams({ view: newView });
    try {
      localStorage.setItem('nossa_estante_active_view', newView);
    } catch {}
  };

  // Sync saved view preference from localStorage if view query param is absent
  useEffect(() => {
    if (!rawView) {
      const saved = localStorage.getItem('nossa_estante_active_view');
      if (saved && (saved === 'grid' || saved === 'table' || saved === 'kanban')) {
        setSearchParams({ view: saved }, { replace: true });
      }
    }
  }, [rawView, setSearchParams]);

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      
      {/* Navigation Filter Bar with Search, View Tabs & Dropdown Filters */}
      <NavigationFilterBar
        currentTab={currentView}
        onOpenSidebar={onOpenSidebar}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        readerFilter={readerFilter}
        onReaderFilterChange={setReaderFilter}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        ownershipFilter={ownershipFilter}
        onOwnershipFilterChange={setOwnershipFilter}
        wishlistCount={wishlistCount}
        ownedCount={ownedCount}
        settings={settings}
        onReloadFromDb={handleReloadFromFirestore}
        isRefreshing={isRefreshing}
        lastSyncTime={lastSyncTime}
        isFromCache={isFromCache}
        onTabChange={(tab) => {
          if (tab === 'grid' || tab === 'table' || tab === 'kanban') {
            handleViewChange(tab);
          } else if (tab === 'recommendations') {
            navigate('/recommendations');
          } else if (tab === 'stats') {
            navigate('/stats');
          }
        }}
      />

      {/* Dynamic View Rendering */}
      {isLoading ? (
        <div className="py-24 text-center space-y-3">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto text-amber-600" />
          <p className="font-serif text-sm text-stone-500">
            Conectando à estante em tempo real...
          </p>
        </div>
      ) : filteredBooks.length === 0 && books.length === 0 ? (
        <div className="text-center py-20 px-4 bg-white/60 dark:bg-stone-900/60 rounded-3xl border border-stone-200 dark:border-stone-800 space-y-4">
          <BookOpen className="w-14 h-14 mx-auto text-amber-500/60" />
          <div className="space-y-1">
            <h3 className="font-serif text-lg font-bold text-stone-800 dark:text-stone-200">
              Sua estante ainda está vazia
            </h3>
            <p className="text-sm text-stone-500 dark:text-stone-400 max-w-sm mx-auto">
              Adicione os livros que vocês têm em casa ou os que gostariam de ler!
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/books/new')}
            className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold inline-flex items-center gap-2 shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Adicionar Primeiro Livro</span>
          </button>
        </div>
      ) : (
        <>
          {currentView === 'grid' && (
            <BookGrid
              books={filteredBooks}
              settings={settings}
              onSelectBook={(b) => navigate(`/books/${b.id}`)}
              onUpdateStatus={handleUpdateStatus}
              onToggleFavorite={handleToggleFavorite}
              onToggleOwned={handleToggleOwned}
            />
          )}

          {currentView === 'table' && (
            <BookTable
              books={filteredBooks}
              settings={settings}
              onSelectBook={(b) => navigate(`/books/${b.id}`)}
              onUpdateStatus={handleUpdateStatus}
              onUpdateReader={handleUpdateReader}
              onUpdateBook={handleUpdateBook}
              onBatchUpdateBooks={handleBatchUpdateBooks}
              onDeleteBook={handleDeleteBook}
              onToggleFavorite={handleToggleFavorite}
              onToggleOwned={handleToggleOwned}
            />
          )}

          {currentView === 'kanban' && (
            <BookKanban
              books={filteredBooks}
              settings={settings}
              onSelectBook={(b) => navigate(`/books/${b.id}`)}
              onUpdateStatus={handleUpdateStatus}
              onOpenAddModal={() => navigate('/books/new')}
            />
          )}
        </>
      )}

    </div>
  );
};
