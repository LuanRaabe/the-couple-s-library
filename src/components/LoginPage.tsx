import React from 'react';
import { BookOpen, Heart, Sparkles, Star, Wrench, ShieldAlert } from 'lucide-react';
import { isDevOrPreview, getDbTarget } from '@/core/config/env';

interface LoginPageProps {
  onLogin: () => Promise<any>;
  onEnableMaintenance: () => void;
  onOpenDebugMenu: () => void;
  eleName?: string;
  elaName?: string;
  sessionExpired?: boolean;
  sessionExpiredReason?: string | null;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  onLogin,
  onEnableMaintenance,
  onOpenDebugMenu,
  eleName = 'Luan',
  elaName = 'Theresa',
  sessionExpired,
  sessionExpiredReason,
}) => {
  const isPreview = isDevOrPreview();
  const dbTarget = getDbTarget();

  return (
    <div className="min-h-screen bg-[#faf8f5] dark:bg-stone-950 text-stone-800 dark:text-stone-200 flex flex-col justify-between selection:bg-amber-200 selection:text-amber-950 font-sans">
      
      {/* Top Bar with Debug Trigger */}
      <header className="w-full max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-2xl bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-200 flex items-center justify-center font-serif font-black text-lg shadow-xs">
            📚
          </div>
          <span className="font-serif font-bold text-base text-stone-900 dark:text-stone-100 tracking-tight">
            Nossa Estante
          </span>
        </div>

        {/* Debug button in preview or dev */}
        {isPreview && (
          <button
            type="button"
            onClick={onOpenDebugMenu}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-amber-100 dark:bg-stone-800 text-amber-900 dark:text-amber-300 hover:bg-amber-200 border border-amber-300 dark:border-stone-700 transition-colors shadow-xs cursor-pointer"
          >
            <Wrench className="w-3.5 h-3.5" />
            <span>Debug Menu (Preview)</span>
          </button>
        )}
      </header>

      {/* Main Landing / Auth Card */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-md bg-white dark:bg-stone-900 rounded-3xl p-6 sm:p-8 shadow-xl border border-stone-200/80 dark:border-stone-800 text-center space-y-6">
          
          {/* Session Expired Reauthentication Alert */}
          {sessionExpired && (
            <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800 text-left space-y-1.5 animate-in fade-in duration-200">
              <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200 font-bold text-xs">
                <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Sessão expirada por inatividade</span>
              </div>
              <p className="text-[11px] text-amber-800/90 dark:text-amber-300 leading-relaxed">
                {sessionExpiredReason || 'Para sua segurança e garantir que as gravações continuem funcionando, faça login novamente com o Google. Seus rascunhos continuam salvos no navegador!'}
              </p>
            </div>
          )}

          {/* Couple Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-50 dark:bg-rose-950/60 border border-rose-200/60 dark:border-rose-900 text-rose-800 dark:text-rose-300 text-xs font-semibold">
            <Heart className="w-3.5 h-3.5 fill-rose-500 text-rose-500 animate-pulse" />
            <span>Biblioteca do Casal • {eleName} & {elaName}</span>
          </div>

          {/* Heading */}
          <div className="space-y-2">
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-stone-900 dark:text-stone-100 leading-tight">
              Bem-vindo ao nosso cantinho de leituras
            </h1>
            <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400 max-w-sm mx-auto">
              Acesse com sua conta Google para sincronizar os livros, avaliações, resenhas e releituras em tempo real.
            </p>
          </div>

          {/* Features Highlights */}
          <div className="grid grid-cols-2 gap-2 text-left pt-2">
            <div className="p-3 rounded-2xl bg-amber-50/50 dark:bg-stone-800/50 border border-amber-100 dark:border-stone-700/60 space-y-1">
              <span className="flex items-center gap-1.5 font-bold text-xs text-amber-900 dark:text-amber-300">
                <BookOpen className="w-3.5 h-3.5 text-amber-600" />
                <span>Leituras & Releituras</span>
              </span>
              <p className="text-[11px] text-stone-500 dark:text-stone-400">
                Acompanhe o progresso e o histórico de cada mês e ano.
              </p>
            </div>

            <div className="p-3 rounded-2xl bg-rose-50/50 dark:bg-stone-800/50 border border-rose-100 dark:border-stone-700/60 space-y-1">
              <span className="flex items-center gap-1.5 font-bold text-xs text-rose-900 dark:text-rose-300">
                <Star className="w-3.5 h-3.5 fill-rose-400 text-rose-500" />
                <span>Notas Individuais</span>
              </span>
              <p className="text-[11px] text-stone-500 dark:text-stone-400">
                Avaliações de 1 a 5 estrelas e anotações privadas de cada um.
              </p>
            </div>
          </div>

          {/* Google Sign-in Button */}
          <div className="pt-2 space-y-3">
            <button
              type="button"
              onClick={onLogin}
              className="w-full py-3.5 px-4 bg-stone-900 hover:bg-stone-800 text-white dark:bg-stone-100 dark:hover:bg-stone-200 dark:text-stone-900 rounded-2xl font-semibold text-sm flex items-center justify-center gap-3 shadow-md hover:shadow-lg transition-all cursor-pointer active:scale-[0.99]"
            >
              {/* Google G Logo SVG */}
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Entrar com o Google</span>
            </button>

            <p className="text-[11px] text-stone-500 dark:text-stone-400">
              Ao clicar, uma janela/aba do Google é aberta para autenticar sua conta com segurança e retorna automaticamente à estante.
            </p>
          </div>

          {/* Maintenance Bypass Option (Only for Preview / Dev) */}
          {isPreview && (
            <div className="pt-4 border-t border-stone-100 dark:border-stone-800 text-left space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-800 dark:text-amber-300">
                <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
                <span>Opções de Preview & Manutenção</span>
              </div>
              <p className="text-[11px] text-stone-500 dark:text-stone-400">
                Você pode entrar diretamente sem login do Google para testar e manter o applet.
              </p>
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={onEnableMaintenance}
                  className="flex-1 py-2 px-3 bg-amber-50 hover:bg-amber-100 text-amber-900 dark:bg-stone-800 dark:hover:bg-stone-700 dark:text-amber-300 rounded-xl text-xs font-semibold border border-amber-200 dark:border-stone-700 transition-colors cursor-pointer text-center"
                >
                  Navegar sem Login
                </button>
                <button
                  type="button"
                  onClick={onOpenDebugMenu}
                  className="py-2 px-3 bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 rounded-xl text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1"
                >
                  <Wrench className="w-3 h-3" />
                  <span>Menu</span>
                </button>
              </div>
            </div>
          )}

        </div>
      </main>

      {/* Footer */}
      <footer className="py-4 text-center text-xs text-stone-400">
        Nossa Estante • Feito com amor para {eleName} & {elaName} ❤️
      </footer>

    </div>
  );
};
