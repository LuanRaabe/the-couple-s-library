import React from 'react';
import { BookOpen, Heart, Plus, Settings as SettingsIcon, LogIn, LogOut, CheckCircle2, User, Sparkles } from 'lucide-react';
import { User as FirebaseUser } from 'firebase/auth';
import { LibrarySettings, ReaderId } from '../types/book';

interface HeaderProps {
  settings: LibrarySettings;
  activeReader: 'ele' | 'ela';
  setActiveReader: (reader: 'ele' | 'ela') => void;
  currentUser: FirebaseUser | null;
  onLogin: () => void;
  onLogout: () => void;
  onOpenAddModal: () => void;
  onOpenSettingsModal: () => void;
  onOpenSyncCoversModal?: () => void;
  onSeedSampleData: () => void;
  totalBooks: number;
  readCount: number;
  isSyncing?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  settings,
  activeReader,
  setActiveReader,
  currentUser,
  onLogin,
  onLogout,
  onOpenAddModal,
  onOpenSettingsModal,
  onOpenSyncCoversModal,
  onSeedSampleData,
  totalBooks,
  readCount,
  isSyncing,
}) => {
  return (
    <header className="bg-amber-50/80 dark:bg-stone-900/90 border-b border-amber-200/60 dark:border-stone-800 sticky top-0 z-30 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20 gap-4">
          
          {/* Logo & Title */}
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-600 dark:bg-amber-700 text-amber-50 flex items-center justify-center shadow-md shadow-amber-900/10">
              <BookOpen className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-serif text-xl sm:text-2xl font-bold tracking-tight text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
                  Nossa Estante
                  <Heart className="w-4 h-4 fill-rose-500 text-rose-500 inline-block animate-pulse" />
                </h1>
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  {isSyncing ? 'Sincronizando...' : 'Em tempo real'}
                </span>
              </div>
              <p className="text-xs text-stone-500 dark:text-stone-400 hidden sm:block">
                {settings.eleName} & {settings.elaName} • {readCount} de {settings.yearlyGoal} livros lidos ({Math.min(100, Math.round((readCount / (settings.yearlyGoal || 1)) * 100))}%)
              </p>
            </div>
          </div>

          {/* Center: Active Reader Selector ("Quem está na estante agora?") */}
          <div className="flex items-center bg-stone-200/70 dark:bg-stone-800 p-1 rounded-xl shadow-inner border border-stone-300/60 dark:border-stone-700">
            <button
              type="button"
              onClick={() => setActiveReader('ele')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                activeReader === 'ele'
                  ? 'bg-amber-600 text-white shadow-sm font-semibold'
                  : 'text-stone-700 dark:text-stone-300 hover:text-stone-900 hover:bg-stone-100/50 dark:hover:bg-stone-700/50'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-amber-300" />
              {settings.eleName || 'Ele'}
            </button>
            <button
              type="button"
              onClick={() => setActiveReader('ela')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                activeReader === 'ela'
                  ? 'bg-rose-600 text-white shadow-sm font-semibold'
                  : 'text-stone-700 dark:text-stone-300 hover:text-stone-900 hover:bg-stone-100/50 dark:hover:bg-stone-700/50'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-rose-300" />
              {settings.elaName || 'Theresa'}
            </button>
          </div>

          {/* Right Action buttons */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={onSeedSampleData}
              type="button"
              className="hidden lg:flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-amber-900 bg-amber-100 hover:bg-amber-200 dark:bg-amber-950/60 dark:text-amber-200 rounded-xl transition-colors border border-amber-300/60 dark:border-amber-800/60"
              title="Carregar todos os 84 livros com capas atualizadas"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span>Base do Casal (84)</span>
            </button>

            <button
              onClick={onOpenAddModal}
              type="button"
              className="flex items-center gap-1.5 px-3.5 sm:px-4 py-2 bg-stone-900 hover:bg-stone-800 dark:bg-amber-600 dark:hover:bg-amber-700 text-white rounded-xl text-xs sm:text-sm font-semibold shadow-sm transition-transform active:scale-95"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Adicionar Livro</span>
            </button>

            {onOpenSyncCoversModal && (
              <button
                onClick={onOpenSyncCoversModal}
                type="button"
                className="p-2 text-amber-600 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300 rounded-xl hover:bg-amber-100/60 dark:hover:bg-stone-800 transition-colors"
                title="Sincronizar Capas no Google Livros"
              >
                <Sparkles className="w-5 h-5" />
              </button>
            )}

            <button
              onClick={onOpenSettingsModal}
              type="button"
              className="p-2 text-stone-600 hover:text-stone-900 dark:text-stone-300 dark:hover:text-white rounded-xl hover:bg-amber-100/60 dark:hover:bg-stone-800 transition-colors"
              title="Configurações da Estante"
            >
              <SettingsIcon className="w-5 h-5" />
            </button>

            {currentUser ? (
              <div className="flex items-center gap-2 pl-2 border-l border-stone-300/70 dark:border-stone-700">
                {currentUser.photoURL ? (
                  <img
                    src={currentUser.photoURL}
                    alt={currentUser.displayName || 'Usuário'}
                    className="w-8 h-8 rounded-full border border-amber-300 shadow-sm"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-amber-200 dark:bg-stone-700 flex items-center justify-center text-amber-900 dark:text-stone-200 font-bold text-xs">
                    {(currentUser.displayName || currentUser.email || 'U')[0].toUpperCase()}
                  </div>
                )}
                <button
                  onClick={onLogout}
                  type="button"
                  className="p-1.5 text-stone-500 hover:text-rose-600 dark:text-stone-400 dark:hover:text-rose-400 transition-colors"
                  title="Sair da conta"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={onLogin}
                type="button"
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-stone-700 dark:text-stone-200 bg-white dark:bg-stone-800 hover:bg-stone-100 dark:hover:bg-stone-700 rounded-xl border border-stone-300 dark:border-stone-700 shadow-sm transition-all"
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
