import React from 'react';
import { 
  BookOpen, 
  Heart, 
  Plus, 
  Settings as SettingsIcon, 
  LogIn, 
  LogOut, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles,
  RefreshCw 
} from 'lucide-react';
import { User as FirebaseUser } from 'firebase/auth';
import { LibrarySettings } from '../../features/settings';

interface HeaderProps {
  settings: LibrarySettings;
  currentUser: FirebaseUser | null;
  onLogin: () => void;
  onLogout: () => void;
  onOpenAddModal: () => void;
  onOpenSettingsModal: () => void;
  onOpenSyncCoversModal?: () => void;
  totalBooks: number;
  readCount: number;
  isSyncing?: boolean;
  autoSync: boolean;
  onToggleAutoSync: () => void;
  onManualSync?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  settings,
  currentUser,
  onLogin,
  onLogout,
  onOpenAddModal,
  onOpenSettingsModal,
  onOpenSyncCoversModal,
  totalBooks,
  readCount,
  isSyncing,
  autoSync,
  onToggleAutoSync,
  onManualSync,
}) => {
  const goalPercent = Math.min(100, Math.round((readCount / (settings.yearlyGoal || 1)) * 100));

  return (
    <header className="bg-amber-50/90 dark:bg-stone-900/95 border-b border-amber-200/60 dark:border-stone-800 sticky top-0 z-30 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        
        {/* Main Header Bar */}
        <div className="flex items-center justify-between min-h-[3.75rem] sm:h-20 py-2 sm:py-0 gap-2 sm:gap-4">
          
          {/* Logo & Brand Title */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-2xl bg-amber-600 dark:bg-amber-700 text-amber-50 flex items-center justify-center shadow-md shadow-amber-900/10 shrink-0">
              <BookOpen className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2.2]" />
            </div>
            
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="font-serif text-lg sm:text-2xl font-bold tracking-tight text-stone-900 dark:text-stone-100 flex items-center gap-1.5 truncate">
                  <span>Nossa Estante</span>
                  <Heart className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-rose-500 text-rose-500 inline-block animate-pulse shrink-0" />
                </h1>

                {/* Desktop Auto-Update Toggle & Manual Sync (Hidden on mobile, placed below on mobile) */}
                <div className="hidden md:flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onToggleAutoSync}
                    className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-[11px] font-medium transition-all border shadow-xs cursor-pointer ${
                      autoSync
                        ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100'
                        : 'bg-stone-100 dark:bg-stone-800 border-stone-300 dark:border-stone-700 text-stone-600 dark:text-stone-400 hover:bg-stone-200'
                    }`}
                    title={
                      autoSync
                        ? 'Atualização automática ativa: alterações sincronizam em tempo real. Clique para pausar.'
                        : 'Atualização automática pausada. Clique para ativar.'
                    }
                  >
                    <span className="flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${autoSync ? 'bg-emerald-500 animate-pulse' : 'bg-stone-400'}`} />
                      <span className="font-semibold">{autoSync ? 'Auto-update: Ativo' : 'Auto-update: Desativado'}</span>
                    </span>
                    <span
                      className={`w-6 h-3.5 rounded-full p-0.5 transition-colors flex items-center ${
                        autoSync ? 'bg-emerald-600 justify-end' : 'bg-stone-300 dark:bg-stone-600 justify-start'
                      }`}
                    >
                      <span className="w-2.5 h-2.5 rounded-full bg-white shadow-xs" />
                    </span>
                  </button>

                  {!autoSync && onManualSync && (
                    <button
                      type="button"
                      onClick={onManualSync}
                      disabled={isSyncing}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-100 hover:bg-amber-200 text-amber-900 dark:bg-amber-950/70 dark:text-amber-200 border border-amber-300/80 transition-colors cursor-pointer"
                      title="Sincronizar acervo agora com o banco de dados"
                    >
                      <RefreshCw className={`w-3 h-3 text-amber-700 ${isSyncing ? 'animate-spin' : ''}`} />
                      <span>{isSyncing ? 'Sincronizando...' : 'Sincronizar Agora'}</span>
                    </button>
                  )}

                  {isSyncing && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                      <RefreshCw className="w-3 h-3 text-amber-600 animate-spin" />
                      Salvando...
                    </span>
                  )}
                </div>
              </div>

              {/* Subtitle with couple names and reading goal */}
              <p className="text-xs text-stone-500 dark:text-stone-400 hidden sm:block mt-0.5 truncate">
                {settings.eleName} & {settings.elaName} • {readCount} de {settings.yearlyGoal} livros lidos ({goalPercent}%)
              </p>
            </div>
          </div>

          {/* Right Action buttons */}
          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            {/* Total Books Pill (Desktop) */}
            <div
              className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-stone-700 bg-stone-100/90 dark:bg-stone-800/80 dark:text-stone-300 rounded-xl border border-stone-200/80 dark:border-stone-700"
              title="Total de livros no acervo do casal"
            >
              <BookOpen className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span>{totalBooks} Livros</span>
            </div>

            {/* Add Book Button */}
            <button
              onClick={onOpenAddModal}
              type="button"
              className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-4 py-2 bg-stone-900 hover:bg-stone-800 dark:bg-amber-600 dark:hover:bg-amber-700 text-white rounded-xl text-xs sm:text-sm font-semibold shadow-sm transition-transform active:scale-95 cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span className="hidden xs:inline sm:inline">Adicionar</span>
            </button>

            {/* Sync Covers Modal Trigger */}
            {onOpenSyncCoversModal && (
              <button
                onClick={onOpenSyncCoversModal}
                type="button"
                className="p-1.5 sm:p-2 text-amber-600 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300 rounded-xl hover:bg-amber-100/60 dark:hover:bg-stone-800 transition-colors cursor-pointer shrink-0"
                title="Sincronizar Capas das APIs"
              >
                <Sparkles className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            )}

            {/* Settings Modal Trigger */}
            <button
              onClick={onOpenSettingsModal}
              type="button"
              className="p-1.5 sm:p-2 text-stone-600 hover:text-stone-900 dark:text-stone-300 dark:hover:text-white rounded-xl hover:bg-amber-100/60 dark:hover:bg-stone-800 transition-colors cursor-pointer shrink-0"
              title="Configurações da Estante"
            >
              <SettingsIcon className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>

            {/* Google Profile / Login */}
            {currentUser ? (
              <div className="flex items-center gap-1 sm:gap-2 pl-1.5 sm:pl-2 border-l border-stone-300/70 dark:border-stone-700 shrink-0">
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
                  title="Sair da conta Google"
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

        {/* Mobile Secondary Sub-Bar (Auto-update + Progress) */}
        <div className="md:hidden flex items-center justify-between pb-2 pt-1 border-t border-amber-200/50 dark:border-stone-800/80 text-[11px] gap-2">
          {/* Mobile Auto-update Controls */}
          <div className="flex items-center gap-1.5 min-w-0">
            <button
              type="button"
              onClick={onToggleAutoSync}
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold transition-all border shrink-0 ${
                autoSync
                  ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                  : 'bg-stone-100 dark:bg-stone-800 border-stone-300 dark:border-stone-700 text-stone-600 dark:text-stone-400'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${autoSync ? 'bg-emerald-500 animate-pulse' : 'bg-stone-400'}`} />
              <span>{autoSync ? 'Auto: Ativo' : 'Auto: Pausado'}</span>
            </button>

            {!autoSync && onManualSync && (
              <button
                type="button"
                onClick={onManualSync}
                disabled={isSyncing}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 hover:bg-amber-200 text-amber-900 dark:bg-amber-950 dark:text-amber-200 border border-amber-300 shrink-0"
              >
                <RefreshCw className={`w-2.5 h-2.5 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>Salvar</span>
              </button>
            )}

            {isSyncing && (
              <span className="inline-flex items-center gap-1 text-[10px] text-amber-700 dark:text-amber-300 font-medium">
                <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                Salvando...
              </span>
            )}
          </div>

          {/* Reading Goal Progress for Mobile */}
          <span className="text-stone-500 dark:text-stone-400 font-medium text-[10px] truncate shrink-0">
            {readCount}/{settings.yearlyGoal} lidos ({goalPercent}%)
          </span>
        </div>

      </div>
    </header>
  );
};
