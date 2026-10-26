import React from 'react';
import { 
  LayoutGrid, 
  Table as TableIcon, 
  KanbanSquare, 
  MessageSquareHeart, 
  BarChart2, 
  Search 
} from 'lucide-react';
import { BookStatus } from '../../features/books/types';
import { LibrarySettings } from '../../features/settings/types';

export type ActiveTab = 'grid' | 'table' | 'kanban' | 'recommendations' | 'stats';

interface NavigationFilterBarProps {
  currentTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  searchQuery: string;
  onSearchChange: (val: string) => void;
  readerFilter: 'todos' | 'ele' | 'ela' | 'ambos';
  onReaderFilterChange: (val: 'todos' | 'ele' | 'ela' | 'ambos') => void;
  statusFilter: 'todos' | BookStatus;
  onStatusFilterChange: (val: 'todos' | BookStatus) => void;
  settings: LibrarySettings;
}

export const NavigationFilterBar: React.FC<NavigationFilterBarProps> = ({
  currentTab,
  onSelectTab,
  searchQuery,
  onSearchChange,
  readerFilter,
  onReaderFilterChange,
  statusFilter,
  onStatusFilterChange,
  settings,
}) => {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-1">
      {/* 5 Main Tabs */}
      <div className="flex items-center bg-stone-200/70 dark:bg-stone-900 p-1.5 rounded-2xl border border-stone-300/70 dark:border-stone-800 overflow-x-auto shadow-inner">
        <button
          type="button"
          onClick={() => onSelectTab('grid')}
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
          onClick={() => onSelectTab('table')}
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
          onClick={() => onSelectTab('kanban')}
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
          onClick={() => onSelectTab('recommendations')}
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
          onClick={() => onSelectTab('stats')}
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
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Filtrar por título, autor..."
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-stone-300/80 dark:border-stone-800 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 placeholder:text-stone-400 focus:outline-hidden focus:ring-2 focus:ring-amber-500/40"
            />
          </div>

          {/* Filter Reader */}
          <select
            value={readerFilter}
            onChange={(e) => onReaderFilterChange(e.target.value as any)}
            className="text-xs rounded-xl px-2.5 py-1.5 bg-white dark:bg-stone-900 border border-stone-300/80 dark:border-stone-800 text-stone-800 dark:text-stone-200 font-medium cursor-pointer"
          >
            <option value="todos">Todos os Livros (Acervo Geral)</option>
            <option value="ambos">Base do Casal (Lidos em Conjunto)</option>
            <option value="ele">Apenas {settings.eleName}</option>
            <option value="ela">Apenas {settings.elaName}</option>
          </select>

          {/* Filter Status (except when in Kanban) */}
          {currentTab !== 'kanban' && (
            <select
              value={statusFilter}
              onChange={(e) => onStatusFilterChange(e.target.value as any)}
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
  );
};
