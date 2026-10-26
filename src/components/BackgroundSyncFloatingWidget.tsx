import React from 'react';
import { RefreshCw, Maximize2, X, Sparkles, CheckCircle2 } from 'lucide-react';

interface BackgroundSyncFloatingWidgetProps {
  isRunning: boolean;
  currentIndex: number;
  totalCount: number;
  currentBookTitle: string;
  updatedCount: number;
  onOpenModal: () => void;
  onCancel: () => void;
}

export const BackgroundSyncFloatingWidget: React.FC<BackgroundSyncFloatingWidgetProps> = ({
  isRunning,
  currentIndex,
  totalCount,
  currentBookTitle,
  updatedCount,
  onOpenModal,
  onCancel,
}) => {
  if (!isRunning) return null;

  const percent = totalCount > 0 ? Math.min(100, Math.round((currentIndex / totalCount) * 100)) : 0;

  return (
    <div className="fixed bottom-4 right-4 z-40 max-w-sm w-[calc(100vw-2rem)] sm:w-84 animate-in slide-in-from-bottom-5 duration-300">
      <div className="bg-white/95 dark:bg-stone-900/95 backdrop-blur-md rounded-2xl p-3.5 shadow-2xl border border-amber-300/80 dark:border-amber-800/80 ring-1 ring-amber-500/20">
        
        {/* Header line */}
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-6 h-6 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            </div>
            <span className="text-xs font-bold text-stone-900 dark:text-stone-100 truncate">
              Buscando Capas em 2º Plano
            </span>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={onOpenModal}
              title="Abrir detalhes da sincronização"
              className="p-1 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-md transition-colors"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={onCancel}
              title="Cancelar sincronização"
              className="p-1 text-stone-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-md transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-stone-100 dark:bg-stone-800 rounded-full h-1.5 overflow-hidden my-2">
          <div
            className="bg-amber-600 dark:bg-amber-500 h-1.5 rounded-full transition-all duration-200"
            style={{ width: `${percent}%` }}
          />
        </div>

        {/* Meta & Stats */}
        <div className="flex items-center justify-between text-[11px] text-stone-500 dark:text-stone-400">
          <span className="font-medium text-amber-700 dark:text-amber-300">
            {currentIndex} de {totalCount} ({percent}%)
          </span>
          <span>
            {updatedCount} capa{updatedCount === 1 ? '' : 's'} atualizada{updatedCount === 1 ? '' : 's'}
          </span>
        </div>

        {currentBookTitle && (
          <p className="text-[10px] text-stone-400 dark:text-stone-500 truncate mt-1">
            {currentBookTitle}
          </p>
        )}
      </div>
    </div>
  );
};
