import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useLibraryContext } from '@/shared/context/LibraryContext';
import { NavigationFilterBar } from '@/shared/components/NavigationFilterBar';
import { RecommendationsView } from '@/components/RecommendationsView';

export const RecommendationsPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    books,
    settings,
    activeReader,
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
        currentTab="recommendations"
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
          if (tab === 'recommendations') return;
          if (tab === 'stats') {
            navigate('/stats');
          } else {
            navigate(`/books?view=${tab}`);
          }
        }}
      />

      <RecommendationsView
        books={books}
        settings={settings}
        activeReader={activeReader}
        onSelectBook={(book) => navigate(`/books/${book.id}`)}
        onOpenAddModal={() => navigate('/books/new')}
      />
    </div>
  );
};
