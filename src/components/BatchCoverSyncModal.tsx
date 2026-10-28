import React, { useEffect } from 'react';
import { X, Sparkles, Check, RefreshCw, Layers, Minimize2 } from 'lucide-react';
import { Book, BackgroundCoverSyncState } from '@/features/books';

interface BatchCoverSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  syncState: BackgroundCoverSyncState;
  books: Book[];
  onUpdateBook: (updatedBook: Book) => Promise<void>;
  onSyncCompleted?: (updatedCount: number, totalCount: number) => void;
}

export const BatchCoverSyncModal: React.FC<BatchCoverSyncModalProps> = ({
  isOpen,
  onClose,
  syncState,
  books,
  onUpdateBook,
  onSyncCompleted,
}) => {
  const {
    isRunning,
    currentIndex,
    totalCount,
    currentBookTitle,
    updatedCount,
    isFinished,
    provider,
    onlyWithoutCover,
    setProvider,
    setOnlyWithoutCover,
    startSync,
    cancelSync,
    resetStatus,
  } = syncState;

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

  const targetBooksCount = onlyWithoutCover
    ? books.filter((b) => !b.coverUrl || b.coverUrl.trim() === '').length
    : books.length;

  const handleStart = async () => {
    await startSync(books, onUpdateBook, onSyncCompleted);
  };

  const percent = totalCount > 0 ? Math.min(100, Math.round((currentIndex / totalCount) * 100)) : 0;

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-[#16171b] rounded-3xl w-full max-w-md shadow-2xl border border-stone-200 dark:border-[#282a32] p-5 space-y-4"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-stone-100 dark:border-[#22242a]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-100">
                Sincronizar Capas em Segundo Plano
              </h3>
              <p className="text-[11px] text-stone-500 dark:text-stone-400">
                Rápido, assíncrono e sem bloquear sua navegação
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 rounded-md hover:bg-stone-100 dark:hover:bg-[#202228] transition-colors"
            title="Fechar (a busca continua rodando em segundo plano se já iniciada)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Configuration mode */}
        {!isRunning && !isFinished && (
          <div className="space-y-3.5 text-xs text-stone-600 dark:text-stone-300">
            <p>
              Esta ferramenta consulta os acervos das APIs em paralelo para buscar capas de alta resolução. O processo roda de forma assíncrona para que você continue usando o app sem travar.
            </p>

            {/* Provider selection */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-stone-700 dark:text-stone-300">
                Fonte de busca de capas:
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { id: 'all', label: '⚡ Todas as APIs', desc: 'Open Library + Google + Brasil API (Mais rápido)' },
                  { id: 'openlibrary', label: '🏛️ Open Library', desc: 'Internet Archive (alta resolução)' },
                  { id: 'google', label: '🔍 Google Livros', desc: 'Catálogo geral Google' },
                  { id: 'brasilapi', label: '🇧🇷 Brasil API', desc: 'Base oficial de ISBN (CBL)' },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setProvider(item.id as any)}
                    className={`p-2 rounded-xl text-left border transition-all ${
                      provider === item.id
                        ? 'border-amber-500 bg-amber-500/10 text-stone-900 dark:text-stone-100'
                        : 'border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900/40 text-stone-600 dark:text-stone-400 hover:border-stone-300 dark:hover:border-stone-700'
                    }`}
                  >
                    <div className="font-semibold text-xs">{item.label}</div>
                    <div className="text-[10px] text-stone-500 dark:text-stone-400 mt-0.5 leading-tight">{item.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Filter option */}
            <div className="p-2.5 rounded-xl bg-stone-50 dark:bg-[#1a1b22] border border-stone-200/80 dark:border-stone-800 flex items-center justify-between">
              <div>
                <span className="font-medium text-stone-800 dark:text-stone-200 text-xs block">
                  Apenas livros sem capa
                </span>
                <span className="text-[10px] text-stone-500">
                  {targetBooksCount} livro(s) serão processados
                </span>
              </div>
              <input
                type="checkbox"
                checked={onlyWithoutCover}
                onChange={(e) => setOnlyWithoutCover(e.target.checked)}
                className="w-4 h-4 text-amber-600 rounded-sm focus:ring-amber-500 cursor-pointer"
              />
            </div>

            <div className="p-2.5 rounded-xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-900/40 text-[11px] text-amber-800 dark:text-amber-300 flex items-start gap-2">
              <span className="shrink-0 text-sm">💡</span>
              <span>
                Ao iniciar, você pode fechar esta janela: a sincronização continuará em <strong>segundo plano</strong> e exibirá um mini-painel flutuante enquanto você navega.
              </span>
            </div>
          </div>
        )}

        {/* Running progress view */}
        {isRunning && (
          <div className="space-y-3 py-2">
            <div className="flex justify-between text-xs font-medium text-stone-700 dark:text-stone-300">
              <span className="flex items-center gap-2">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-600" />
                Atualizando ({currentIndex} de {totalCount})...
              </span>
              <span className="font-mono font-bold text-amber-600 dark:text-amber-400">
                {percent}%
              </span>
            </div>

            <div className="w-full bg-stone-100 dark:bg-[#202228] rounded-full h-2 overflow-hidden">
              <div
                className="bg-amber-600 dark:bg-amber-500 h-2 rounded-full transition-all duration-200"
                style={{ width: `${percent}%` }}
              />
            </div>

            {currentBookTitle && (
              <p className="text-[11px] text-stone-500 dark:text-stone-400 truncate">
                Lendo: {currentBookTitle}
              </p>
            )}

            <div className="p-2.5 rounded-xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-900/40 text-[11px] text-amber-800 dark:text-amber-300">
              {updatedCount} nova(s) capa(s) encontrada(s) e salvas no Firebase até o momento.
            </div>

            <p className="text-[10px] text-stone-400 text-center">
              Você pode fechar esta janela. O processo continuará ativo em segundo plano!
            </p>
          </div>
        )}

        {/* Finished view */}
        {isFinished && (
          <div className="py-3 text-center space-y-2">
            <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
              <Check className="w-5 h-5 stroke-[2.5]" />
            </div>
            <h4 className="text-sm font-semibold text-stone-900 dark:text-stone-100">
              Sincronização Concluída!
            </h4>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              {updatedCount} capas foram atualizadas com sucesso e sincronizadas com a estante.
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="pt-2 flex justify-end gap-2 border-t border-stone-100 dark:border-[#22242a]">
          {!isRunning && !isFinished && (
            <>
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-1.5 text-xs font-medium text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-[#202228] rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleStart}
                className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Iniciar Sincronização</span>
              </button>
            </>
          )}

          {isRunning && (
            <>
              <button
                type="button"
                onClick={cancelSync}
                className="px-3 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors"
              >
                Cancelar Processo
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors"
              >
                <Minimize2 className="w-3.5 h-3.5" />
                <span>Rodar em 2º Plano</span>
              </button>
            </>
          )}

          {isFinished && (
            <button
              type="button"
              onClick={() => {
                resetStatus();
                onClose();
              }}
              className="px-4 py-1.5 bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 rounded-xl text-xs font-semibold hover:opacity-90 transition-opacity"
            >
              Fechar
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
