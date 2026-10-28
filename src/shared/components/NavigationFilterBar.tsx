import React from 'react';
import { 
  LayoutGrid, 
  Table as TableIcon, 
  KanbanSquare, 
  MessageSquareHeart, 
  BarChart2, 
  Search,
  Menu,
  ChevronDown
} from 'lucide-react';
import { BookStatus } from '@/features/books';
import { LibrarySettings } from '@/features/settings';

export type ActiveTab = 'grid' | 'table' | 'kanban' | 'recommendations' | 'stats';

interface NavigationFilterBarProps {
  currentTab: ActiveTab;
  onOpenSidebar: () => void;
  searchQuery: string;
  onSearchChange: (val: string) => void;
  readerFilter: 'todos' | 'ele' | 'ela' | 'ambos';
  onReaderFilterChange: (val: 'todos' | 'ele' | 'ela' | 'ambos') => void;
  statusFilter: 'todos' | BookStatus;
  onStatusFilterChange: (val: 'todos' | BookStatus) => void;
  settings: LibrarySettings;
}

const TAB_CONFIG: Record<ActiveTab, { label: string; icon: React.FC<any>; color: string }> = {
  grid: { label: 'Estante de Capas', icon: LayoutGrid, color: 'text-amber-600 dark:text-amber-400' },
  table: { label: 'Tabela Geral', icon: TableIcon, color: 'text-amber-600 dark:text-amber-400' },
  kanban: { label: 'Quadro de Arrastar', icon: KanbanSquare, color: 'text-amber-600 dark:text-amber-400' },
  recommendations: { label: 'Recomendações', icon: MessageSquareHeart, color: 'text-rose-600 dark:text-rose-400' },
  stats: { label: 'Estatísticas & Meta', icon: BarChart2, color: 'text-amber-600 dark:text-amber-400' },
};

export const NavigationFilterBar: React.FC<NavigationFilterBarProps> = ({
  currentTab,
  onOpenSidebar,
  searchQuery,
  onSearchChange,
  readerFilter,
  onReaderFilterChange,
  statusFilter,
  onStatusFilterChange,
  settings,
}) => {
  const currentConfig = TAB_CONFIG[currentTab] || TAB_CONFIG.grid;
  const CurrentIcon = currentConfig.icon;

  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-1">
      {/* Active Tab Badge with quick drawer trigger */}
      <button
        type="button"
        onClick={onOpenSidebar}
        className="self-start md:self-auto flex items-center gap-2.5 px-3.5 py-2 rounded-2xl bg-white dark:bg-stone-900 border border-stone-300/80 dark:border-stone-800 shadow-xs hover:border-amber-400 dark:hover:border-amber-600 transition-all cursor-pointer group"
        title="Clique para alternar a visualização ou abrir o menu"
      >
        <div className="w-6 h-6 rounded-lg bg-amber-100 dark:bg-stone-800 flex items-center justify-center text-amber-700 dark:text-amber-300">
          <CurrentIcon className="w-3.5 h-3.5" />
        </div>
        <div className="text-left">
          <span className="block text-xs font-bold text-stone-900 dark:text-stone-100">
            {currentConfig.label}
          </span>
        </div>
        <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-400 flex items-center gap-0.5 ml-1 bg-amber-50 dark:bg-stone-800/80 px-2 py-0.5 rounded-lg border border-amber-200/60 dark:border-stone-700">
          <span>Trocar aba</span>
          <ChevronDown className="w-3 h-3 group-hover:translate-y-0.5 transition-transform" />
        </span>
      </button>

      {/* Search & Filter Bar (shown on Grid, Table, Kanban) */}
      {(currentTab === 'grid' || currentTab === 'table' || currentTab === 'kanban') && (
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Search input */}
          <div className="relative flex-1 sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-stone-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Buscar título, autor..."
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-stone-300 dark:border-stone-750 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 placeholder:text-stone-400 focus:outline-hidden focus:ring-2 focus:ring-amber-500/40"
            />
          </div>

          {/* Filter Reader */}
          <select
            value={readerFilter}
            onChange={(e) => onReaderFilterChange(e.target.value as any)}
            className="text-xs rounded-xl px-2.5 py-1.5 bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-750 text-stone-800 dark:text-stone-200 font-semibold cursor-pointer"
          >
            <option value="todos">Todos os Livros</option>
            <option value="ambos">Casal ({settings.eleName} & {settings.elaName})</option>
            <option value="ele">Apenas {settings.eleName}</option>
            <option value="ela">Apenas {settings.elaName}</option>
          </select>

          {/* Filter Status (except when in Kanban) */}
          {currentTab !== 'kanban' && (
            <select
              value={statusFilter}
              onChange={(e) => onStatusFilterChange(e.target.value as any)}
              className="text-xs rounded-xl px-2.5 py-1.5 bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-750 text-stone-800 dark:text-stone-200 font-semibold cursor-pointer"
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
