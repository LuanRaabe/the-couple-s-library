import React from 'react';
import { 
  BookOpen, 
  Heart, 
  Plus, 
  LogIn, 
  LogOut, 
  RefreshCw,
  Loader2,
  ShieldAlert,
  Menu
} from 'lucide-react';
import { User as FirebaseUser } from 'firebase/auth';
import { LibrarySettings } from '@/features/settings';
import { isDevOrPreview, getDbTarget } from '@/core/config/env';

interface HeaderProps {
  settings: LibrarySettings;
  currentUser: FirebaseUser | null;
  onLogin: () => void;
  onLogout: () => void;
  onOpenAddModal: () => void;
  onOpenSidebar: () => void;
  onOpenSettingsModal?: () => void;
  onOpenSyncCoversModal?: () => void;
  totalBooks: number;
  readCount: number;
  isSyncing?: boolean;
  isMaintenanceMode?: boolean;
  onOpenDebugMenu?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  settings,
  currentUser,
  onLogin,
  onLogout,
  onOpenAddModal,
  onOpenSidebar,
  totalBooks,
  readCount,
  isSyncing,
  isMaintenanceMode,
  onOpenDebugMenu,
}) => {
  const goalPercent = Math.min(100, Math.round((readCount / (settings.yearlyGoal || 1)) * 100));
  const isPreview = isDevOrPreview();
  const dbTarget = getDbTarget();

  return (
    <header className="bg-amber-50/90 dark:bg-stone-900/95 border-b border-amber-200/60 dark:border-stone-800 sticky top-0 z-30 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        
        {/* Main Header Bar */}
        <div className="flex items-center justify-between h-16 sm:h-20 gap-2 sm:gap-4">
          
          {/* Hamburger Menu Button & Logo */}
          <div className="flex items-center gap-2 sm:gap-3.5 min-w-0">
            {/* Hamburger Sanduíche Button */}
            <button
              type="button"
              onClick={onOpenSidebar}
              className="p-2 sm:p-2.5 rounded-2xl bg-white hover:bg-stone-100 dark:bg-stone-800 dark:hover:bg-stone-750 text-stone-900 dark:text-stone-100 border border-stone-300/80 dark:border-stone-750 shadow-xs transition-colors cursor-pointer shrink-0 flex items-center gap-1.5 active:scale-95"
              title="Abrir navegação lateral"
            >
              <Menu className="w-5 h-5 text-stone-800 dark:text-stone-200 stroke-[2.2]" />
              <span className="hidden sm:inline text-xs font-bold text-stone-800 dark:text-stone-200">
                Menu
              </span>
            </button>

            <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-2xl bg-amber-600 dark:bg-amber-700 text-amber-50 flex items-center justify-center shadow-md shadow-amber-900/10 shrink-0">
              <BookOpen className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2.2]" />
            </div>
            
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="font-serif text-lg sm:text-2xl font-bold tracking-tight text-stone-900 dark:text-stone-100 flex items-center gap-1.5 truncate">
                  <span>Nossa Estante</span>
                  <Heart className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-rose-500 text-rose-500 inline-block animate-pulse shrink-0" />
                </h1>

                {/* Maintenance Mode Pill */}
                {isMaintenanceMode && (
                  <button
                    type="button"
                    onClick={onOpenDebugMenu}
                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-200 dark:bg-amber-950/80 text-amber-950 dark:text-amber-200 border border-amber-400 dark:border-amber-700 hover:bg-amber-300 transition-colors cursor-pointer shrink-0"
                    title="Modo Manutenção. Clique para abrir menu de depuração."
                  >
                    <ShieldAlert className="w-3 h-3 text-amber-700 dark:text-amber-400" />
                    <span>Modo Manutenção</span>
                  </button>
                )}

                {/* Database Target Pill in Preview/Dev */}
                {isPreview && onOpenDebugMenu && (
                  <button
                    type="button"
                    onClick={onOpenDebugMenu}
                    className={`hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold border transition-colors cursor-pointer shrink-0 ${
                      dbTarget === 'books_preview'
                        ? 'bg-amber-100/80 text-amber-900 border-amber-300 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800'
                        : 'bg-emerald-100/80 text-emerald-900 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800'
                    }`}
                    title="Banco Firestore selecionado. Clique para alternar."
                  >
                    <span>DB: {dbTarget}</span>
                  </button>
                )}

                {/* Saving Indicator */}
                {isSyncing && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                    <Loader2 className="w-3 h-3 text-amber-600 animate-spin" />
                    <span>Salvando...</span>
                  </span>
                )}
              </div>

              {/* Subtitle with couple names and reading goal */}
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5 truncate">
                {settings.eleName} & {settings.elaName} • {readCount} de {settings.yearlyGoal} livros lidos ({goalPercent}%)
              </p>
            </div>
          </div>

          {/* Right Action buttons */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            {/* Total Books Pill */}
            <div
              className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-stone-700 bg-white dark:bg-stone-800/90 dark:text-stone-300 rounded-xl border border-stone-200/80 dark:border-stone-700"
              title="Total de livros no acervo do casal"
            >
              <BookOpen className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span>{totalBooks} Livros</span>
            </div>

            {/* Add Book Button */}
            <button
              onClick={onOpenAddModal}
              type="button"
              className="flex items-center gap-1 sm:gap-1.5 px-3 sm:px-4 py-2 bg-stone-900 hover:bg-stone-800 dark:bg-amber-600 dark:hover:bg-amber-700 text-white rounded-xl text-xs sm:text-sm font-semibold shadow-sm transition-transform active:scale-95 cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span className="hidden xs:inline sm:inline">Adicionar Livro</span>
              <span className="xs:hidden">Livro</span>
            </button>

            {/* Google Profile / Login */}
            {currentUser ? (
              <div className="flex items-center gap-1 sm:gap-2 pl-1 sm:pl-2 border-l border-stone-300/70 dark:border-stone-700 shrink-0">
                {currentUser.photoURL ? (
                  <img
                    src={currentUser.photoURL}
                    alt={currentUser.displayName || 'Usuário'}
                    className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border border-amber-300 shadow-xs object-cover shrink-0"
                  />
                ) : (
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-amber-200 dark:bg-stone-700 flex items-center justify-center text-amber-900 dark:text-stone-200 font-bold text-xs shrink-0">
                    {(currentUser.displayName || currentUser.email || 'U')[0].toUpperCase()}
                  </div>
                )}
                <button
                  onClick={onLogout}
                  type="button"
                  className="p-1 sm:p-1.5 text-stone-400 hover:text-rose-600 dark:text-stone-500 dark:hover:text-rose-400 transition-colors cursor-pointer shrink-0"
                  title="Sair da conta"
                >
                  <LogOut className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={onLogin}
                type="button"
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-stone-700 dark:text-stone-200 bg-white dark:bg-stone-800 hover:bg-stone-100 dark:hover:bg-stone-700 rounded-xl border border-stone-300 dark:border-stone-700 shadow-xs transition-all cursor-pointer shrink-0"
                title="Entrar com conta Google"
              >
                <LogIn className="w-3.5 h-3.5 text-amber-600" />
                <span className="hidden sm:inline">Entrar</span>
              </button>
            )}
          </div>
        </div>

      </div>
    </header>
  );
};
