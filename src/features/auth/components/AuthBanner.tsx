import React from 'react';
import { BookOpen, Heart, LogIn } from 'lucide-react';

interface AuthBannerProps {
  onLogin: () => void;
  eleName: string;
  elaName: string;
}

export const AuthBanner: React.FC<AuthBannerProps> = ({ onLogin, eleName, elaName }) => {
  return (
    <div className="bg-gradient-to-r from-amber-500/15 via-rose-500/15 to-purple-500/15 border border-amber-300/80 dark:border-stone-800 rounded-3xl p-6 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-amber-600 text-white flex items-center justify-center shrink-0 shadow-md">
          <BookOpen className="w-6 h-6" />
        </div>
        <div>
          <h2 className="font-serif font-bold text-lg text-stone-900 dark:text-stone-100 flex items-center gap-2">
            Bem-vindos à Estante de {eleName} & {elaName}!
            <Heart className="w-4 h-4 text-rose-500 fill-rose-500 inline" />
          </h2>
          <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-400 mt-0.5">
            Conecte sua conta Google para sincronizar as leituras, notas e recomendações em tempo real entre {eleName} e {elaName}.
          </p>
        </div>
      </div>
      <button
        onClick={onLogin}
        type="button"
        className="px-5 py-2.5 bg-stone-900 hover:bg-stone-800 dark:bg-amber-600 dark:hover:bg-amber-700 text-white rounded-xl text-xs sm:text-sm font-semibold shadow-md shrink-0 flex items-center gap-2 transition-transform active:scale-95"
      >
        <LogIn className="w-4 h-4" />
        <span>Entrar com Google</span>
      </button>
    </div>
  );
};
