/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { RefreshCw, Heart } from 'lucide-react';

// FDD Feature Hooks & Types
import { useAuth, AuthBanner } from './features/auth';
import { useLibrarySettings, SettingsModal } from './features/settings';
import { useBooks, useBookFilters, useBackgroundCoverSync, Book, BookStatus } from './features/books';

// Shared Components
import { Header } from './shared/components/Header';
import { NavigationFilterBar, ActiveTab } from './shared/components/NavigationFilterBar';
import { NotificationToast } from './shared/components/NotificationToast';

// Feature Views & Modals
import { BookGrid } from './components/BookGrid';
import { BookTable } from './components/BookTable';
import { BookKanban } from './components/BookKanban';
import { RecommendationsView } from './components/RecommendationsView';
import { StatsView } from './components/StatsView';
import { AddBookModal } from './components/AddBookModal';
import { BookDetailModal } from './components/BookDetailModal';
import { BatchCoverSyncModal } from './components/BatchCoverSyncModal';
import { BackgroundSyncFloatingWidget } from './components/BackgroundSyncFloatingWidget';

export default function App() {
  // Auth feature slice
  const { currentUser, loginWithGoogle, logoutUser } = useAuth();

  // Settings feature slice
  const { settings, saveSettings } = useLibrarySettings(currentUser);

  // Books feature slice
  const {
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
  } = useBooks(currentUser);

  // Books search & filtering slice
  const {
    searchQuery,
    setSearchQuery,
    readerFilter,
    setReaderFilter,
    statusFilter,
    setStatusFilter,
    filteredBooks,
    readCount,
  } = useBookFilters(books);

  // Navigation tab
  const [currentTab, setCurrentTab] = useState<ActiveTab>('grid');

  // Reader context for detail modal annotations/sessions
  const [activeReader, setActiveReader] = useState<'ele' | 'ela'>(() => {
    return (localStorage.getItem('nossa_estante_active_reader') as 'ele' | 'ela') || 'ele';
  });

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isSyncCoversModalOpen, setIsSyncCoversModalOpen] = useState(false);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);

  // Background cover synchronization
  const coverSync = useBackgroundCoverSync();

  return (
    <div className="min-h-screen bg-[#faf8f5] dark:bg-stone-950 text-stone-800 dark:text-stone-200 flex flex-col font-sans selection:bg-amber-200 dark:selection:bg-amber-900 selection:text-amber-950">
      
      {/* Header (with Auto-Update Toggle & Manual Sync) */}
      <Header
        settings={settings}
        currentUser={currentUser}
        onLogin={loginWithGoogle}
        onLogout={logoutUser}
        onOpenAddModal={() => setIsAddModalOpen(true)}
        onOpenSettingsModal={() => setIsSettingsModalOpen(true)}
        onOpenSyncCoversModal={() => setIsSyncCoversModalOpen(true)}
        totalBooks={books.length}
        readCount={readCount}
        isSyncing={isSyncing}
        autoSync={autoSync}
        onToggleAutoSync={handleToggleAutoSync}
        onManualSync={handleManualSync}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        
        {/* Unauthenticated Welcome Banner */}
        {!currentUser && (
          <AuthBanner
            onLogin={loginWithGoogle}
            eleName={settings.eleName}
            elaName={settings.elaName}
          />
        )}

        {/* Global Notifications (Save confirmation, Seed status, Errors) */}
        <NotificationToast
          saveNotice={saveNotice}
          onCloseSaveNotice={() => setSaveNotice(null)}
          seedNotice={seedNotice}
          onCloseSeedNotice={() => setSeedNotice(null)}
          errorNotice={errorNotice}
          onCloseErrorNotice={() => setErrorNotice(null)}
        />

        {/* Navigation Tabs and Search/Filter Bar */}
        <NavigationFilterBar
          currentTab={currentTab}
          onSelectTab={setCurrentTab}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          readerFilter={readerFilter}
          onReaderFilterChange={setReaderFilter}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          settings={settings}
        />

        {/* Dynamic View rendering based on currentTab */}
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
                onUpdateReader={handleUpdateReader}
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
        onSaveSettings={saveSettings}
        onRestoreBaseBooks={handleRestoreBaseBooks}
      />

      <BatchCoverSyncModal
        isOpen={isSyncCoversModalOpen}
        onClose={() => setIsSyncCoversModalOpen(false)}
        syncState={coverSync}
        books={books}
        onUpdateBook={handleUpdateBook}
        onSyncCompleted={(updated) => {
          if (updated > 0) {
            setSaveNotice(`🎉 Sincronização em 2º plano concluída: ${updated} capa(s) atualizada(s)!`);
          }
        }}
      />

      {/* Background Floating Status Widget (visible when sync is active and modal is closed) */}
      <BackgroundSyncFloatingWidget
        isRunning={coverSync.isRunning && !isSyncCoversModalOpen}
        currentIndex={coverSync.currentIndex}
        totalCount={coverSync.totalCount}
        currentBookTitle={coverSync.currentBookTitle}
        updatedCount={coverSync.updatedCount}
        onOpenModal={() => setIsSyncCoversModalOpen(true)}
        onCancel={coverSync.cancelSync}
      />

    </div>
  );
}
