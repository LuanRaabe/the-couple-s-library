import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Heart } from 'lucide-react';
import { useAuth } from '@/features/auth';
import { useLibrarySettings, SettingsModal } from '@/features/settings';
import { useBooks, useBookFilters, useBackgroundCoverSync } from '@/features/books';
import { Header } from '@/shared/components/Header';
import { NavigationSidebar } from '@/shared/components/NavigationSidebar';
import { NotificationToast } from '@/shared/components/NotificationToast';
import { BatchCoverSyncModal } from '@/components/BatchCoverSyncModal';
import { DebugMenu } from '@/components/DebugMenu';
import { BackgroundSyncFloatingWidget } from '@/components/BackgroundSyncFloatingWidget';
import { FloatingBatchSaveBar } from '@/shared/components/FloatingBatchSaveBar';
import { LibraryOutletContext } from '@/shared/context/LibraryContext';

export const AppLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Auth feature slice
  const {
    currentUser,
    isMaintenanceMode,
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
  } = useBooks(currentUser, dbTargetTrigger);

  // Books search & filtering slice
  const {
    searchQuery,
    setSearchQuery,
    readerFilter,
    setReaderFilter,
    statusFilter,
    setStatusFilter,
    ownershipFilter,
    setOwnershipFilter,
    filteredBooks,
    readCount,
    wishlistCount,
    ownedCount,
  } = useBookFilters(books);

  // Active Reader Context for sessions and notes
  const [activeReader, setActiveReader] = useState<'ele' | 'ela'>(() => {
    return (localStorage.getItem('nossa_estante_active_reader') as 'ele' | 'ela') || 'ele';
  });

  const handleSetActiveReader = (reader: 'ele' | 'ela') => {
    setActiveReader(reader);
    try {
      localStorage.setItem('nossa_estante_active_reader', reader);
    } catch {}
  };

  // Modals & Sidebar states
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSyncCoversModalOpen, setIsSyncCoversModalOpen] = useState(false);
  const [isDebugMenuOpen, setIsDebugMenuOpen] = useState(false);

  // Background cover synchronization
  const coverSync = useBackgroundCoverSync();

  // Determine current active navigation tab based on location
  const getCurrentTab = (): 'grid' | 'table' | 'kanban' | 'recommendations' | 'stats' => {
    if (location.pathname.startsWith('/recommendations')) return 'recommendations';
    if (location.pathname.startsWith('/stats')) return 'stats';
    const params = new URLSearchParams(location.search);
    const view = params.get('view');
    if (view === 'table') return 'table';
    if (view === 'kanban') return 'kanban';
    return 'grid';
  };

  const handleSelectTab = (tab: 'grid' | 'table' | 'kanban' | 'recommendations' | 'stats') => {
    if (tab === 'grid') navigate('/books?view=grid');
    else if (tab === 'table') navigate('/books?view=table');
    else if (tab === 'kanban') navigate('/books?view=kanban');
    else if (tab === 'recommendations') navigate('/recommendations');
    else if (tab === 'stats') navigate('/stats');
  };

  // Build context value for all child routes
  const outletContext: LibraryOutletContext = {
    books,
    isLoading,
    isSyncing,
    isRefreshing,
    lastSyncTime,
    isFromCache,
    handleReloadFromFirestore,
    handleUpdateStatus,
    handleUpdateReader,
    handleToggleFavorite,
    handleToggleOwned,
    handleAddBook,
    handleUpdateBook,
    handleBatchUpdateBooks,
    handleDeleteBook,
    settings,
    saveSettings,
    activeReader,
    setActiveReader: handleSetActiveReader,
    searchQuery,
    setSearchQuery,
    readerFilter,
    setReaderFilter,
    statusFilter,
    setStatusFilter,
    ownershipFilter,
    setOwnershipFilter,
    filteredBooks,
    readCount,
    wishlistCount,
    ownedCount,
    onOpenSidebar: () => setIsSidebarOpen(true),
    onOpenSyncCoversModal: () => setIsSyncCoversModalOpen(true),
    onOpenDebugMenu: () => setIsDebugMenuOpen(true),
  };

  return (
    <div className="min-h-screen bg-[#faf8f5] dark:bg-stone-950 text-stone-800 dark:text-stone-200 flex flex-col font-sans selection:bg-amber-200 dark:selection:bg-amber-900 selection:text-amber-950">
      
      {/* Global Header */}
      <Header
        settings={settings}
        currentUser={currentUser}
        onLogin={loginWithGoogle}
        onLogout={logoutUser}
        onOpenAddModal={() => navigate('/books/new')}
        onOpenSidebar={() => setIsSidebarOpen(true)}
        onOpenSettingsModal={() => navigate('/settings')}
        onOpenSyncCoversModal={() => setIsSyncCoversModalOpen(true)}
        totalBooks={books.length}
        readCount={readCount}
        isSyncing={isSyncing}
        isMaintenanceMode={isMaintenanceMode}
        onOpenDebugMenu={() => setIsDebugMenuOpen(true)}
      />

      {/* Main Routed Content Area */}
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

        {/* Route Outlet */}
        <Outlet context={outletContext} />

      </main>

      {/* Footer */}
      <footer className="mt-auto py-6 border-t border-stone-200/60 dark:border-stone-800/80 text-center text-xs text-stone-400">
        <p className="flex items-center justify-center gap-1">
          Nossa Estante • Feito com carinho para {settings.eleName} & {settings.elaName}
          <Heart className="w-3 h-3 text-rose-500 fill-rose-500 inline" />
        </p>
      </footer>

      {/* Lateral Navigation Sidebar */}
      <NavigationSidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        currentTab={getCurrentTab()}
        onSelectTab={handleSelectTab}
        settings={settings}
        totalBooks={books.length}
        readCount={readCount}
        currentUser={currentUser}
        onOpenAddModal={() => {
          setIsSidebarOpen(false);
          navigate('/books/new');
        }}
        onOpenSettingsModal={() => {
          setIsSidebarOpen(false);
          navigate('/settings');
        }}
        onOpenSyncCoversModal={() => {
          setIsSidebarOpen(false);
          setIsSyncCoversModalOpen(true);
        }}
        onOpenDebugMenu={() => {
          setIsSidebarOpen(false);
          setIsDebugMenuOpen(true);
        }}
        onLogout={logoutUser}
        onReloadFromDb={handleReloadFromFirestore}
        isRefreshing={isRefreshing}
        lastSyncTime={lastSyncTime}
      />

      {/* Batch Floating Save Bar for quick table updates */}
      <FloatingBatchSaveBar
        books={books}
        onBatchUpdateBooks={handleBatchUpdateBooks}
        onUpdateBook={handleUpdateBook}
      />

      {/* Background Cover Sync Floating Widget */}
      <BackgroundSyncFloatingWidget
        isRunning={coverSync.isRunning}
        currentIndex={coverSync.currentIndex}
        totalCount={coverSync.totalCount}
        currentBookTitle={coverSync.currentBookTitle}
        updatedCount={coverSync.updatedCount}
        onOpenModal={() => setIsSyncCoversModalOpen(true)}
        onCancel={coverSync.cancelSync}
      />

      {/* Sync Covers Dialog */}
      {isSyncCoversModalOpen && (
        <BatchCoverSyncModal
          isOpen={true}
          onClose={() => setIsSyncCoversModalOpen(false)}
          syncState={coverSync}
          books={books}
          onUpdateBook={handleUpdateBook}
          onSyncCompleted={(updated) => {
            if (updated > 0) {
              setSaveNotice(`🎉 Sincronização concluída: ${updated} capa(s) atualizada(s)!`);
            }
          }}
        />
      )}

      {/* Debug Menu Dialog */}
      <DebugMenu
        isOpen={isDebugMenuOpen}
        onClose={() => setIsDebugMenuOpen(false)}
        isMaintenanceMode={isMaintenanceMode}
        onEnableMaintenance={enableMaintenanceBypass}
        onDisableMaintenance={disableMaintenanceBypass}
        onDbTargetChanged={() => setDbTargetTrigger(Date.now())}
        onSyncProductionSpreadsheet={handleSyncProductionSpreadsheet}
      />

    </div>
  );
};
