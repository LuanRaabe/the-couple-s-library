import React, { useEffect } from 'react';
import {
  X,
  LayoutGrid,
  Table as TableIcon,
  KanbanSquare,
  MessageSquareHeart,
  BarChart2,
  Plus,
  Settings as SettingsIcon,
  Sparkles,
  Wrench,
  BookOpen,
  Heart,
  Trophy,
  Check,
  ChevronRight,
  LogOut,
  User
} from 'lucide-react';
import { User as FirebaseUser } from 'firebase/auth';
import { ActiveTab } from './NavigationFilterBar';
import { LibrarySettings } from '@/features/settings';
import { isDevOrPreview } from '@/core/config/env';

interface NavigationSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  currentTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  settings: LibrarySettings;
  totalBooks: number;
  readCount: number;
  currentUser: FirebaseUser | null;
  onOpenAddModal: () => void;
  onOpenSettingsModal: () => void;
  onOpenSyncCoversModal?: () => void;
  onOpenDebugMenu?: () => void;
  onLogout?: () => void;
}

export const NavigationSidebar: React.FC<NavigationSidebarProps> = ({
  isOpen,
  onClose,
  currentTab,
  onSelectTab,
  settings,
  totalBooks,
  readCount,
  currentUser,
  onOpenAddModal,
  onOpenSettingsModal,
  onOpenSyncCoversModal,
  onOpenDebugMenu,
  onLogout,
}) => {
  const isPreview = isDevOrPreview();

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleTabClick = (tab: ActiveTab) => {
    onSelectTab(tab);
    onClose();
  };

  const navItems: {
    id: ActiveTab;
    label: string;
    description: string;
    icon: React.FC<any>;
    color: string;
  }[] = [
    {
      id: 'grid',
      label: 'Estante de Capas',
      description: 'Galeria visual e capas dos livros',
      icon: LayoutGrid,
      color: 'text-amber-600 dark:text-amber-400',
    },
    {
      id: 'table',
      label: 'Tabela Geral',
      description: 'Edição em lote, páginas e ordenação',
      icon: TableIcon,
      color: 'text-amber-600 dark:text-amber-400',
    },
    {
      id: 'kanban',
      label: 'Quadro de Arrastar',
      description: 'Organização por status de leitura',
      icon: KanbanSquare,
      color: 'text-amber-600 dark:text-amber-400',
    },
    {
      id: 'recommendations',
      label: 'Recomendações do Casal',
      description: 'Indicações mútuas e recados carinhosos',
      icon: MessageSquareHeart,
      color: 'text-rose-600 dark:text-rose-400',
    },
    {
      id: 'stats',
      label: 'Estatísticas & Meta',
      description: 'Gráficos de leitura e meta anual',
      icon: BarChart2,
      color: 'text-amber-600 dark:text-amber-400',
    },
  ];

  const yearlyGoal = settings.yearlyGoal || 40;
  const goalPercent = Math.min(100, Math.round((readCount / yearlyGoal) * 100));

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex md:justify-start items-center justify-center p-3 md:p-0 animate-in fade-in duration-200"
    >
      {/* 
        RESPONSIVE CONTAINER:
        - Desktop (md:): Lateral slide-out Drawer from the left (h-full w-84)
        - Mobile (<md): Centered Modal Dialog for tab selection (w-full max-w-sm rounded-3xl)
      */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="
          w-full max-w-sm md:max-w-none md:w-84 md:h-full md:rounded-none rounded-3xl
          bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100
          shadow-2xl border border-stone-200 dark:border-stone-800 md:border-y-0 md:border-l-0 md:border-r
          flex flex-col overflow-hidden max-h-[92vh] md:max-h-full
          animate-in slide-in-from-left-4 md:slide-in-from-left duration-200
        "
      >
        {/* Header of Sidebar / Modal */}
        <div className="p-4 sm:p-5 border-b border-stone-200 dark:border-stone-800 bg-[#faf8f5] dark:bg-stone-950 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-600 text-white flex items-center justify-center shadow-md font-serif text-lg font-bold">
              📚
            </div>
            <div>
              <h2 className="font-serif font-bold text-base text-stone-900 dark:text-stone-50 flex items-center gap-1.5 leading-tight">
                <span>Nossa Estante</span>
                <Heart className="w-3.5 h-3.5 fill-rose-500 text-rose-500 inline shrink-0" />
              </h2>
              <p className="text-xs font-semibold text-stone-600 dark:text-stone-300">
                {settings.eleName} & {settings.elaName}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-stone-600 hover:text-stone-900 dark:text-stone-300 dark:hover:text-white rounded-xl hover:bg-stone-200/60 dark:hover:bg-stone-800 transition-colors cursor-pointer"
            title="Fechar menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          
          {/* Section: Navegação Principal / Seleção de Aba */}
          <div>
            <div className="flex items-center justify-between mb-2 px-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
                Visualizações da Estante
              </span>
              <span className="text-[11px] font-semibold text-stone-400">
                {totalBooks} livros
              </span>
            </div>

            <nav className="space-y-1.5">
              {navItems.map((item) => {
                const isActive = currentTab === item.id;
                const IconComponent = item.icon;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleTabClick(item.id)}
                    className={`w-full text-left p-3 rounded-2xl transition-all flex items-center justify-between group cursor-pointer ${
                      isActive
                        ? 'bg-amber-100 text-amber-950 dark:bg-amber-950/80 dark:text-amber-100 border-2 border-amber-400/80 dark:border-amber-700 shadow-xs font-bold'
                        : 'bg-stone-50 hover:bg-stone-100 dark:bg-stone-800/40 dark:hover:bg-stone-800 text-stone-800 dark:text-stone-200 border border-stone-200/70 dark:border-stone-800 font-medium'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                          isActive
                            ? 'bg-amber-600 text-white shadow-xs'
                            : 'bg-stone-200/80 dark:bg-stone-700/80 text-stone-700 dark:text-stone-200 group-hover:bg-amber-100 dark:group-hover:bg-amber-950/60'
                        }`}
                      >
                        <IconComponent className={`w-4 h-4 ${isActive ? 'text-white' : item.color}`} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold truncate leading-tight">
                          {item.label}
                        </p>
                        <p className="text-[11px] text-stone-500 dark:text-stone-400 truncate mt-0.5">
                          {item.description}
                        </p>
                      </div>
                    </div>

                    <div className="shrink-0 ml-2">
                      {isActive ? (
                        <div className="w-6 h-6 rounded-full bg-amber-600 text-white flex items-center justify-center">
                          <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                        </div>
                      ) : (
                        <ChevronRight className="w-4 h-4 text-stone-400 group-hover:text-stone-600 dark:group-hover:text-stone-200 transition-transform group-hover:translate-x-0.5" />
                      )}
                    </div>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Section: Ações Principais */}
          <div className="pt-2 border-t border-stone-200 dark:border-stone-800">
            <span className="block text-[11px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-2 px-1">
              Ações Rápidas
            </span>

            <div className="space-y-2">
              {/* Adicionar Livro */}
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenAddModal();
                }}
                className="w-full p-3 rounded-2xl bg-stone-900 hover:bg-stone-800 text-white dark:bg-amber-600 dark:hover:bg-amber-500 font-bold text-sm flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>Adicionar Novo Livro</span>
              </button>

              {/* Configurações da Estante (Moved to Lateral Menu) */}
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenSettingsModal();
                }}
                className="w-full p-3 rounded-2xl bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-100 font-semibold text-xs flex items-center justify-between border border-stone-300/80 dark:border-stone-700 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-stone-200 dark:bg-stone-700 flex items-center justify-center text-stone-700 dark:text-stone-300">
                    <SettingsIcon className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-xs text-stone-900 dark:text-stone-100">Configurações da Estante</p>
                    <p className="text-[10px] text-stone-500 dark:text-stone-400">Nomes do casal e meta anual</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-stone-400" />
              </button>

              {/* Sincronização em segundo plano de capas */}
              {onOpenSyncCoversModal && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenSyncCoversModal();
                  }}
                  className="w-full p-2.5 rounded-2xl bg-stone-50 hover:bg-stone-100 dark:bg-stone-800/40 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300 font-semibold text-xs flex items-center justify-between border border-stone-200 dark:border-stone-800 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400 ml-1.5" />
                    <span className="text-stone-800 dark:text-stone-200 font-medium">Sincronizar Capas das APIs</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-stone-400" />
                </button>
              )}

              {/* Debug Menu no preview */}
              {isPreview && onOpenDebugMenu && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenDebugMenu();
                  }}
                  className="w-full p-2.5 rounded-2xl bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-950/70 text-amber-900 dark:text-amber-300 font-semibold text-xs flex items-center justify-between border border-amber-200 dark:border-amber-800 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <Wrench className="w-4 h-4 text-amber-600 ml-1.5" />
                    <span>Menu de Manutenção (Preview)</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-amber-500" />
                </button>
              )}
            </div>
          </div>

          {/* Section: Progresso da Meta do Casal */}
          <div className="p-3.5 rounded-2xl bg-amber-50/70 dark:bg-stone-800/60 border border-amber-200/80 dark:border-stone-700/70 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-stone-800 dark:text-stone-200">
              <span className="flex items-center gap-1.5 text-amber-800 dark:text-amber-300">
                <Trophy className="w-4 h-4 text-amber-600" />
                <span>Meta Anual do Casal</span>
              </span>
              <span>{goalPercent}%</span>
            </div>
            <div className="w-full bg-stone-200 dark:bg-stone-700 rounded-full h-2 overflow-hidden">
              <div
                className="bg-amber-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${goalPercent}%` }}
              />
            </div>
            <p className="text-[11px] text-stone-600 dark:text-stone-400">
              {readCount} de {yearlyGoal} livros concluídos juntos.
            </p>
          </div>

        </div>

        {/* Footer / User Auth Status */}
        <div className="p-3.5 border-t border-stone-200 dark:border-stone-800 bg-[#faf8f5] dark:bg-stone-950 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            {currentUser?.photoURL ? (
              <img
                src={currentUser.photoURL}
                alt="Foto"
                className="w-8 h-8 rounded-full border border-amber-400 object-cover shrink-0"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-amber-200 dark:bg-stone-700 flex items-center justify-center font-bold text-xs text-amber-900 dark:text-stone-200 shrink-0">
                {(currentUser?.displayName || currentUser?.email || 'U')[0].toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <p className="text-xs font-bold text-stone-900 dark:text-stone-100 truncate">
                {currentUser?.displayName || currentUser?.email || 'Conectado'}
              </p>
              <p className="text-[10px] text-stone-500 dark:text-stone-400 truncate">
                Sincronização em tempo real
              </p>
            </div>
          </div>

          {onLogout && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onLogout();
              }}
              className="p-2 text-stone-400 hover:text-rose-600 dark:text-stone-400 dark:hover:text-rose-400 rounded-xl hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors cursor-pointer shrink-0"
              title="Sair da conta"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
