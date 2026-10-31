import React, { useState, useRef, useEffect } from 'react';
import { 
  LayoutGrid, 
  Table as TableIcon, 
  KanbanSquare, 
  MessageSquareHeart, 
  BarChart2, 
  Search,
  ChevronDown,
  RefreshCw,
  SlidersHorizontal,
  X,
  Check,
  RotateCcw
} from 'lucide-react';
import { BookStatus } from '@/features/books';
import { LibrarySettings } from '@/features/settings';
import { OwnershipFilter } from '@/features/books/hooks/useBookFilters';

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
  ownershipFilter?: OwnershipFilter;
  onOwnershipFilterChange?: (val: OwnershipFilter) => void;
  wishlistCount?: number;
  ownedCount?: number;
  settings: LibrarySettings;
  onReloadFromDb?: () => Promise<void> | void;
  isRefreshing?: boolean;
  lastSyncTime?: number | null;
  isFromCache?: boolean;
  onTabChange?: (tab: ActiveTab) => void;
}

const TAB_CONFIG: Record<ActiveTab, { label: string; icon: React.FC<any>; color: string }> = {
  grid: { label: 'Estante de Capas', icon: LayoutGrid, color: 'text-amber-600 dark:text-amber-400' },
  table: { label: 'Tabela Geral', icon: TableIcon, color: 'text-amber-600 dark:text-amber-400' },
  kanban: { label: 'Quadro de Arrastar', icon: KanbanSquare, color: 'text-amber-600 dark:text-amber-400' },
  recommendations: { label: 'Recomendações', icon: MessageSquareHeart, color: 'text-rose-600 dark:text-rose-400' },
  stats: { label: 'Estatísticas & Meta', icon: BarChart2, color: 'text-amber-600 dark:text-amber-400' },
};

const STATUS_OPTIONS: { id: 'todos' | BookStatus; label: string }[] = [
  { id: 'todos', label: 'Todos os Status' },
  { id: 'quero_ler', label: 'Quero Ler' },
  { id: 'lendo', label: 'Lendo Agora' },
  { id: 'lido', label: 'Já Lido' },
  { id: 'pausado', label: 'Pausado' },
  { id: 'abandonado', label: 'Abandonado' },
];

export const NavigationFilterBar: React.FC<NavigationFilterBarProps> = ({
  currentTab,
  onOpenSidebar,
  searchQuery,
  onSearchChange,
  readerFilter,
  onReaderFilterChange,
  statusFilter,
  onStatusFilterChange,
  ownershipFilter = 'todos',
  onOwnershipFilterChange,
  wishlistCount,
  ownedCount,
  settings,
  onReloadFromDb,
  isRefreshing = false,
  lastSyncTime,
  isFromCache = false,
  onTabChange,
}) => {
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
  const filterMenuRef = useRef<HTMLDivElement>(null);

  const currentConfig = TAB_CONFIG[currentTab] || TAB_CONFIG.grid;
  const CurrentIcon = currentConfig.icon;

  // Active filters count
  const activeFilterCount =
    (readerFilter !== 'todos' ? 1 : 0) +
    (statusFilter !== 'todos' ? 1 : 0) +
    (ownershipFilter !== 'todos' ? 1 : 0);

  // Close filter dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (filterMenuRef.current && !filterMenuRef.current.contains(event.target as Node)) {
        setIsFilterMenuOpen(false);
      }
    }
    if (isFilterMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isFilterMenuOpen]);

  // Close filter popover on Escape
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && isFilterMenuOpen) {
        setIsFilterMenuOpen(false);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFilterMenuOpen]);

  const handleClearAllFilters = () => {
    onReaderFilterChange('todos');
    onStatusFilterChange('todos');
    if (onOwnershipFilterChange) onOwnershipFilterChange('todos');
  };

  const hasSearch = currentTab === 'grid' || currentTab === 'table' || currentTab === 'kanban';

  return (
    <div className="flex flex-col gap-2.5 pb-2">
      {/* 
        MAIN TOP BAR:
        - Mobile: Column layout. Tab Switcher is full width (w-full), search & filters below it.
        - Desktop (md:): Row layout. Tab Switcher has fixed comfortable width (w-72 to w-80), 
          search input fills all remaining width (flex-1).
      */}
      <div className="flex flex-col md:flex-row md:items-center gap-2.5 w-full">
        {/* Tab Switcher / Navigation Select */}
        <div className="relative w-full md:w-72 lg:w-80 shrink-0">
          <div className="w-full flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-300/80 dark:border-stone-800 shadow-xs hover:border-amber-400 dark:hover:border-amber-600 transition-all pointer-events-none group">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-stone-800 flex items-center justify-center text-amber-700 dark:text-amber-300 shrink-0">
                <CurrentIcon className="w-4 h-4" />
              </div>
              <div className="text-left min-w-0">
                <span className="block text-xs font-bold text-stone-900 dark:text-stone-100 truncate">
                  {currentConfig.label}
                </span>
                <span className="block text-[10px] text-stone-500 dark:text-stone-400">
                  Visualização da Biblioteca
                </span>
              </div>
            </div>
            <span className="shrink-0 text-[11px] font-semibold text-amber-700 dark:text-amber-400 flex items-center gap-1 bg-amber-50 dark:bg-stone-800/80 px-2 py-1 rounded-xl border border-amber-200/60 dark:border-stone-700">
              <span>Navegar</span>
              <ChevronDown className="w-3.5 h-3.5 group-hover:translate-y-0.5 transition-transform" />
            </span>
          </div>

          {/* Transparent select overlay for instant mobile/desktop dropdown picker */}
          <select
            value={currentTab}
            onChange={(e) => {
              const selected = e.target.value as ActiveTab;
              if (onTabChange) {
                onTabChange(selected);
              }
            }}
            aria-label="Selecionar modo de visualização da estante"
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer text-stone-900 dark:text-stone-100 bg-transparent text-sm"
          >
            <option value="grid">🖼️ Estante de Capas</option>
            <option value="table">📋 Tabela Geral</option>
            <option value="kanban">📌 Quadro de Arrastar</option>
            <option value="recommendations">💬 Recomendações do Casal</option>
            <option value="stats">📊 Estatísticas & Meta</option>
          </select>
        </div>

        {/* Search Input (Barra Longa) & Controls Bar */}
        {hasSearch ? (
          <div className="flex items-center gap-2 flex-1 w-full relative">
            {/* Long Search Input filling available width */}
            <div className="relative flex-1 min-w-0">
              <Search className="w-4 h-4 absolute left-3.5 top-3 text-stone-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Buscar livros por título, autor, categoria ou ISBN..."
                className="w-full pl-10 pr-9 py-2.5 text-xs sm:text-sm rounded-2xl border border-stone-300 dark:border-stone-750 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 placeholder:text-stone-400 focus:outline-hidden focus:ring-2 focus:ring-amber-500/40 shadow-xs transition-all"
              />
              {searchQuery.trim() && (
                <button
                  type="button"
                  onClick={() => onSearchChange('')}
                  className="absolute right-3 top-3 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 p-0.5 rounded-full hover:bg-stone-100 dark:hover:bg-stone-800"
                  title="Limpar busca"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Sandwich Filter Button */}
            <div className="relative" ref={filterMenuRef}>
              <button
                type="button"
                onClick={() => setIsFilterMenuOpen((prev) => !prev)}
                className={`flex items-center gap-2 px-3.5 py-2.5 rounded-2xl border transition-all cursor-pointer font-semibold text-xs shadow-xs shrink-0 ${
                  activeFilterCount > 0
                    ? 'bg-amber-600 text-white border-amber-600 shadow-amber-600/20'
                    : isFilterMenuOpen
                    ? 'bg-amber-50 dark:bg-stone-800 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-stone-700'
                    : 'bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-200 border-stone-300/80 dark:border-stone-800 hover:border-amber-400'
                }`}
                title="Abrir filtros de leitor, status e posse"
              >
                <SlidersHorizontal className="w-4 h-4" />
                <span className="hidden sm:inline">Filtros</span>
                {activeFilterCount > 0 && (
                  <span className="w-5 h-5 rounded-full bg-white text-amber-900 dark:bg-stone-900 dark:text-amber-300 text-[10px] font-bold flex items-center justify-center shadow-xs">
                    {activeFilterCount}
                  </span>
                )}
              </button>

              {/* Filter Popover Dropdown */}
              {isFilterMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-72 sm:w-84 p-4 rounded-3xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150 space-y-4 text-xs">
                  {/* Popover Header */}
                  <div className="flex items-center justify-between pb-2 border-b border-stone-100 dark:border-stone-800">
                    <div className="flex items-center gap-1.5 font-bold text-stone-900 dark:text-stone-100">
                      <SlidersHorizontal className="w-3.5 h-3.5 text-amber-600" />
                      <span>Filtros da Estante</span>
                    </div>
                    {activeFilterCount > 0 && (
                      <button
                        type="button"
                        onClick={handleClearAllFilters}
                        className="text-[11px] text-amber-600 dark:text-amber-400 hover:underline font-semibold cursor-pointer"
                      >
                        Limpar todos
                      </button>
                    )}
                  </div>

                  {/* Filter: Posse (Temos vs Lista de Desejos) */}
                  {onOwnershipFilterChange && (
                    <div className="space-y-1.5">
                      <label className="block font-bold text-[11px] uppercase tracking-wider text-stone-500 dark:text-stone-400">
                        Posse do Livro
                      </label>
                      <select
                        value={ownershipFilter}
                        onChange={(e) => onOwnershipFilterChange(e.target.value as OwnershipFilter)}
                        className="w-full text-xs font-semibold rounded-xl px-3 py-2 bg-stone-50 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 text-stone-800 dark:text-stone-200 cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-amber-500/40"
                      >
                        <option value="todos">Todos os Livros</option>
                        <option value="temos">
                          📦 Temos na Estante {ownedCount !== undefined ? `(${ownedCount})` : ''}
                        </option>
                        <option value="desejados">
                          🎁 Lista de Desejos {wishlistCount !== undefined ? `(${wishlistCount})` : ''}
                        </option>
                      </select>
                    </div>
                  )}

                  {/* Filter: Leitor */}
                  <div className="space-y-1.5">
                    <label className="block font-bold text-[11px] uppercase tracking-wider text-stone-500 dark:text-stone-400">
                      Leitor
                    </label>
                    <select
                      value={readerFilter}
                      onChange={(e) => onReaderFilterChange(e.target.value as any)}
                      className="w-full text-xs font-semibold rounded-xl px-3 py-2 bg-stone-50 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 text-stone-800 dark:text-stone-200 cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-amber-500/40"
                    >
                      <option value="todos">Todos os Leitores</option>
                      <option value="ambos">Casal ({settings.eleName} & {settings.elaName})</option>
                      <option value="ele">Apenas {settings.eleName}</option>
                      <option value="ela">Apenas {settings.elaName}</option>
                    </select>
                  </div>

                  {/* Filter: Status (except in Kanban) */}
                  {currentTab !== 'kanban' && (
                    <div className="space-y-1.5">
                      <label className="block font-bold text-[11px] uppercase tracking-wider text-stone-500 dark:text-stone-400">
                        Status de Leitura
                      </label>
                      <select
                        value={statusFilter}
                        onChange={(e) => onStatusFilterChange(e.target.value as any)}
                        className="w-full text-xs font-semibold rounded-xl px-3 py-2 bg-stone-50 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 text-stone-800 dark:text-stone-200 cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-amber-500/40"
                      >
                        {STATUS_OPTIONS.map((opt) => (
                          <option key={opt.id} value={opt.id}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Popover Footer button */}
                  <div className="pt-2 border-t border-stone-100 dark:border-stone-800 flex justify-end">
                    <button
                      type="button"
                      onClick={() => setIsFilterMenuOpen(false)}
                      className="px-4 py-1.5 rounded-xl bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 font-bold text-xs cursor-pointer hover:bg-stone-800"
                    >
                      Concluído
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Manual Reload from Database Button */}
            {onReloadFromDb && (
              <button
                type="button"
                onClick={() => onReloadFromDb()}
                disabled={isRefreshing}
                className="flex items-center gap-2 px-3 py-2.5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-300/80 dark:border-stone-800 shadow-xs hover:border-amber-400 dark:hover:border-amber-600 transition-all cursor-pointer disabled:opacity-60 text-xs font-semibold text-stone-700 dark:text-stone-300 shrink-0"
                title={
                  lastSyncTime
                    ? `Dados locais (IndexedDB).\nÚltimo sync com o banco: ${new Date(lastSyncTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}.\nClique para buscar alterações frescas do banco de dados.`
                    : 'Clique para sincronizar os dados frescos diretamente do banco de dados.'
                }
              >
                <RefreshCw className={`w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">
                  {isRefreshing ? 'Sincronizando...' : 'Recarregar Banco'}
                </span>
                {isFromCache && !isRefreshing && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300/60 dark:border-emerald-800" title="Biblioteca em cache no IndexedDB para economizar leituras do banco">
                    Cache
                  </span>
                )}
                {isRefreshing && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300/60 dark:border-amber-800 animate-pulse">
                    Banco
                  </span>
                )}
              </button>
            )}
          </div>
        ) : (
          /* When on stats or recommendations, show view info and reload button */
          <div className="flex items-center justify-between gap-3 flex-1 w-full bg-white dark:bg-stone-900 px-4 py-2 rounded-2xl border border-stone-300/80 dark:border-stone-800 shadow-xs">
            <div className="flex items-center gap-2 text-xs text-stone-600 dark:text-stone-400 font-medium truncate">
              {currentTab === 'recommendations' ? (
                <span>💬 Indicações e bilhetes de leitura do casal</span>
              ) : (
                <span>📊 Métricas gerais, progresso de páginas e metas</span>
              )}
            </div>

            {onReloadFromDb && (
              <button
                type="button"
                onClick={() => onReloadFromDb()}
                disabled={isRefreshing}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 hover:border-amber-400 dark:hover:border-amber-600 transition-all cursor-pointer disabled:opacity-60 text-xs font-semibold text-stone-700 dark:text-stone-300 shrink-0"
                title="Clique para sincronizar os dados frescos diretamente do banco de dados."
              >
                <RefreshCw className={`w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">
                  {isRefreshing ? 'Sincronizando...' : 'Recarregar Banco'}
                </span>
                {isFromCache && !isRefreshing && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300/60 dark:border-emerald-800">
                    Cache
                  </span>
                )}
                {isRefreshing && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300/60 dark:border-amber-800 animate-pulse">
                    Banco
                  </span>
                )}
              </button>
            )}
          </div>
        )}
      </div>

      {/* 
        ACTIVE FILTER CHIPS (Quick visual confirmation & 1-click removal)
      */}
      {hasSearch && activeFilterCount > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap text-[11px] pt-0.5">
          <span className="text-stone-400 text-[10px] uppercase font-bold tracking-wider mr-1">
            Filtros ativos:
          </span>

          {/* Posse chip */}
          {ownershipFilter !== 'todos' && onOwnershipFilterChange && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-violet-100 dark:bg-violet-950/80 text-violet-800 dark:text-violet-300 border border-violet-300/70 dark:border-violet-800 font-semibold">
              <span>Posse: {ownershipFilter === 'temos' ? 'Temos na Estante' : 'Lista de Desejos'}</span>
              <button
                type="button"
                onClick={() => onOwnershipFilterChange('todos')}
                className="hover:text-violet-950 dark:hover:text-white p-0.5"
                title="Remover filtro de posse"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {/* Reader chip */}
          {readerFilter !== 'todos' && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-300 border border-amber-300/70 dark:border-amber-800 font-semibold">
              <span>
                Leitor: {readerFilter === 'ele' ? settings.eleName : readerFilter === 'ela' ? settings.elaName : 'Casal'}
              </span>
              <button
                type="button"
                onClick={() => onReaderFilterChange('todos')}
                className="hover:text-amber-950 dark:hover:text-white p-0.5"
                title="Remover filtro de leitor"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {/* Status chip */}
          {statusFilter !== 'todos' && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-stone-200 dark:bg-stone-800 text-stone-800 dark:text-stone-200 border border-stone-300 dark:border-stone-700 font-semibold">
              <span>Status: {STATUS_OPTIONS.find((s) => s.id === statusFilter)?.label || statusFilter}</span>
              <button
                type="button"
                onClick={() => onStatusFilterChange('todos')}
                className="hover:text-stone-950 dark:hover:text-white p-0.5"
                title="Remover filtro de status"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {/* Clear all */}
          <button
            type="button"
            onClick={handleClearAllFilters}
            className="text-stone-500 hover:text-rose-600 dark:text-stone-400 dark:hover:text-rose-400 text-[10px] font-semibold underline ml-1 cursor-pointer"
          >
            Limpar todos
          </button>
        </div>
      )}
    </div>
  );
};
