/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { RefreshCw, Heart } from 'lucide-react';

// FDD Feature Hooks & Types
import { useAuth } from './features/auth';
import { useLibrarySettings, SettingsModal } from './features/settings';
import { useBooks, useBookFilters, useBackgroundCoverSync, Book } from './features/books';

// Shared Components
import { Header } from './shared/components/Header';
import { NavigationFilterBar, ActiveTab } from './shared/components/NavigationFilterBar';
import { NavigationSidebar } from './shared/components/NavigationSidebar';
import { NotificationToast } from './shared/components/NotificationToast';

// Feature Views, Modals & Gate Screens
import { LoginPage } from './components/LoginPage';
import { DebugMenu } from './components/DebugMenu';
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
  // Auth feature slice with maintenance bypass capability
  const { 
    currentUser, 
    isMaintenanceMode,
    authInitialized,
    loginWithGoogle, 
    logoutUser,
    enableMaintenanceBypass,
    disableMaintenanceBypass,
  } = useAuth();

  // State trigger to re-read Firestore when DB collection target changes in Debug Menu
  const [dbTargetTrigger, setDbTargetTrigger] = useState<number>(0);

  // Settings feature slice
  const { settings, saveSettings } = useLibrarySettings(currentUser);

  // Books feature slice
  const {
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
    handleDeleteBook,
  } = useBooks(currentUser, dbTargetTrigger);

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

  // Navigation tab persisted across reloads in localStorage
  const [currentTab, setCurrentTab] = useState<ActiveTab>(() => {
    try {
      const saved = localStorage.getItem('nossa_estante_active_tab');
      if (saved && ['grid', 'table', 'kanban', 'recommendations', 'stats'].includes(saved)) {
        return saved as ActiveTab;
      }
    } catch {
      // ignore
    }
    return 'grid';
  });

  const handleSelectTab = (tab: ActiveTab) => {
    setCurrentTab(tab);
    try {
      localStorage.setItem('nossa_estante_active_tab', tab);
    } catch {
      // ignore
    }
  };

  // Reader context for detail modal annotations/sessions
  const [activeReader, setActiveReader] = useState<'ele' | 'ela'>(() => {
    return (localStorage.getItem('nossa_estante_active_reader') as 'ele' | 'ela') || 'ele';
  });

  // Modal & Sidebar states
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isSyncCoversModalOpen, setIsSyncCoversModalOpen] = useState(false);
  const [isDebugMenuOpen, setIsDebugMenuOpen] = useState(false);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);

  // Background cover synchronization
  const coverSync = useBackgroundCoverSync();

  // 1. Initial Auth Loading Gate
  if (!authInitialized) {
    return (
      <div className="min-h-screen bg-[#faf8f5] dark:bg-stone-950 flex flex-col items-center justify-center p-4">
        <RefreshCw className="w-8 h-8 animate-spin text-amber-600 mb-3" />
        <p className="font-serif text-sm text-stone-500">
          Carregando Nossa Estante...
        </p>
      </div>
    );
  }

  // 2. Mandatory Login Screen Gate (Books are only accessible after authentication or maintenance bypass)
  if (!currentUser) {
    return (
      <>
        <LoginPage
          onLogin={loginWithGoogle}
          onEnableMaintenance={enableMaintenanceBypass}
          onOpenDebugMenu={() => setIsDebugMenuOpen(true)}
          eleName={settings.eleName}
          elaName={settings.elaName}
        />

        <DebugMenu
          isOpen={isDebugMenuOpen}
          onClose={() => setIsDebugMenuOpen(false)}
          isMaintenanceMode={isMaintenanceMode}
          onEnableMaintenance={enableMaintenanceBypass}
          onDisableMaintenance={disableMaintenanceBypass}
          onDbTargetChanged={() => setDbTargetTrigger(Date.now())}
        />
      </>
    );
  }

  // 3. Authenticated Bookshelf Experience
  return (
    <div className="min-h-screen bg-[#faf8f5] dark:bg-stone-950 text-stone-800 dark:text-stone-200 flex flex-col font-sans selection:bg-amber-200 dark:selection:bg-amber-900 selection:text-amber-950">
      
      {/* Header with Lateral Sanduíche Button */}
      <Header
        settings={settings}
        currentUser={currentUser}
        onLogin={loginWithGoogle}
        onLogout={logoutUser}
        onOpenAddModal={() => setIsAddModalOpen(true)}
        onOpenSidebar={() => setIsSidebarOpen(true)}
        onOpenSettingsModal={() => setIsSettingsModalOpen(true)}
        onOpenSyncCoversModal={() => setIsSyncCoversModalOpen(true)}
        totalBooks={books.length}
        readCount={readCount}
        isSyncing={isSyncing}
        isMaintenanceMode={isMaintenanceMode}
        onOpenDebugMenu={() => setIsDebugMenuOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        
        {/* Global Notifications */}
        <NotificationToast
          saveNotice={saveNotice}
          onCloseSaveNotice={() => setSaveNotice(null)}
          seedNotice={seedNotice}
          onCloseSeedNotice={() => setSeedNotice(null)}
          errorNotice={errorNotice}
          onCloseErrorNotice={() => setErrorNotice(null)}
        />

        {/* Navigation Filter Bar */}
        <NavigationFilterBar
          currentTab={currentTab}
          onOpenSidebar={() => setIsSidebarOpen(true)}
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
                onUpdateBook={handleUpdateBook}
                onBatchUpdateBooks={handleBatchUpdateBooks}
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

      {/* Lateral Navigation Sidebar (Desktop drawer / Mobile tab selection modal) */}
      <NavigationSidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        currentTab={currentTab}
        onSelectTab={handleSelectTab}
        settings={settings}
        totalBooks={books.length}
        readCount={readCount}
        currentUser={currentUser}
        onOpenAddModal={() => setIsAddModalOpen(true)}
        onOpenSettingsModal={() => setIsSettingsModalOpen(true)}
        onOpenSyncCoversModal={() => setIsSyncCoversModalOpen(true)}
        onOpenDebugMenu={() => setIsDebugMenuOpen(true)}
        onLogout={logoutUser}
      />

      {/* Modals - Conditionally rendered to guarantee constant hooks and clean unmounting */}
      {isAddModalOpen && (
        <AddBookModal
          isOpen={true}
          onClose={() => setIsAddModalOpen(false)}
          onAddBook={handleAddBook}
          settings={settings}
          activeReader={activeReader}
        />
      )}

      {selectedBook && (
        <BookDetailModal
          book={selectedBook}
          isOpen={true}
          onClose={() => setSelectedBook(null)}
          settings={settings}
          activeReader={activeReader}
          onUpdateBook={handleUpdateBook}
          onDeleteBook={handleDeleteBook}
        />
      )}

      {isSettingsModalOpen && (
        <SettingsModal
          isOpen={true}
          onClose={() => setIsSettingsModalOpen(false)}
          settings={settings}
          onSaveSettings={saveSettings}
        />
      )}

      {isSyncCoversModalOpen && (
        <BatchCoverSyncModal
          isOpen={true}
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
      )}

      {/* Background Floating Status Widget */}
      <BackgroundSyncFloatingWidget
        isRunning={coverSync.isRunning && !isSyncCoversModalOpen}
        currentIndex={coverSync.currentIndex}
        totalCount={coverSync.totalCount}
        currentBookTitle={coverSync.currentBookTitle}
        updatedCount={coverSync.updatedCount}
        onOpenModal={() => setIsSyncCoversModalOpen(true)}
        onCancel={coverSync.cancelSync}
      />

      {/* Debug and Maintenance Menu */}
      {isDebugMenuOpen && (
        <DebugMenu
          isOpen={true}
          onClose={() => setIsDebugMenuOpen(false)}
          isMaintenanceMode={isMaintenanceMode}
          onEnableMaintenance={enableMaintenanceBypass}
          onDisableMaintenance={disableMaintenanceBypass}
          onDbTargetChanged={() => setDbTargetTrigger(Date.now())}
        />
      )}

    </div>
  );
}
