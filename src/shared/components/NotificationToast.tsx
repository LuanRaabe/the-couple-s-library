import React from 'react';
import { CheckCircle2, Sparkles, AlertCircle, X } from 'lucide-react';

interface NotificationToastProps {
  saveNotice: string | null;
  onCloseSaveNotice: () => void;
  seedNotice: string | null;
  onCloseSeedNotice: () => void;
  errorNotice: string | null;
  onCloseErrorNotice: () => void;
}

export const NotificationToast: React.FC<NotificationToastProps> = ({
  saveNotice,
  onCloseSaveNotice,
  seedNotice,
  onCloseSeedNotice,
  errorNotice,
  onCloseErrorNotice,
}) => {
  return (
    <div className="space-y-3">
      {/* Auto-save notification */}
      {saveNotice && (
        <div className="bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 p-3.5 rounded-2xl text-xs sm:text-sm flex items-center justify-between shadow-sm animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-medium">{saveNotice}</span>
          </div>
          <button
            onClick={onCloseSaveNotice}
            className="font-bold underline ml-2 text-xs"
          >
            Fechar
          </button>
        </div>
      )}

      {/* Database sync / seed notification */}
      {seedNotice && (
        <div className="bg-amber-50 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 p-3.5 rounded-2xl text-xs sm:text-sm flex items-center justify-between shadow-sm animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
            <span className="font-medium">{seedNotice}</span>
          </div>
          <button
            onClick={onCloseSeedNotice}
            className="font-bold underline ml-2 text-xs"
          >
            Fechar
          </button>
        </div>
      )}

      {/* Error notification */}
      {errorNotice && (
        <div className="bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-300 p-3.5 rounded-2xl text-xs flex items-center justify-between shadow-sm animate-in fade-in">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorNotice}</span>
          </div>
          <button
            onClick={onCloseErrorNotice}
            className="font-bold underline ml-2 text-xs"
          >
            Fechar
          </button>
        </div>
      )}
    </div>
  );
};
