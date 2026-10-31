import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useLibraryContext } from '@/shared/context/LibraryContext';
import { NavigationFilterBar } from '@/shared/components/NavigationFilterBar';
import { StatsView } from '@/components/StatsView';

export const StatsPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    books,
    settings,
    handleReloadFromFirestore,
    isRefreshing,
    lastSyncTime,
    isFromCache,
    onOpenSidebar,
  } = useLibraryContext();

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Universal Navigation Selector Bar */}
      <NavigationFilterBar
        currentTab="stats"
        onOpenSidebar={onOpenSidebar}
        searchQuery=""
        onSearchChange={() => {}}
        readerFilter="todos"
        onReaderFilterChange={() => {}}
        statusFilter="todos"
        onStatusFilterChange={() => {}}
        settings={settings}
        onReloadFromDb={handleReloadFromFirestore}
        isRefreshing={isRefreshing}
        lastSyncTime={lastSyncTime}
        isFromCache={isFromCache}
        onTabChange={(tab) => {
          if (tab === 'stats') return;
          if (tab === 'recommendations') {
            navigate('/recommendations');
          } else {
            navigate(`/books?view=${tab}`);
          }
        }}
      />

      <StatsView
        books={books}
        settings={settings}
        onSelectBook={(book) => navigate(`/books/${book.id}`)}
      />
    </div>
  );
};
