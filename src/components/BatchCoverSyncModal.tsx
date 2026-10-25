import React, { useState } from 'react';
import { X, Sparkles, Check, RefreshCw, AlertCircle, BookOpen } from 'lucide-react';
import { Book } from '../types/book';
import { fetchCoverForBook } from '../services/bookSearch';

interface BatchCoverSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  books: Book[];
  onUpdateBook: (updatedBook: Book) => Promise<void>;
}

export const BatchCoverSyncModal: React.FC<BatchCoverSyncModalProps> = ({
  isOpen,
  onClose,
  books,
  onUpdateBook,
}) => {
  const [isRunning, setIsRunning] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentBookTitle, setCurrentBookTitle] = useState('');
  const [updatedCount, setUpdatedCount] = useState(0);
  const [isFinished, setIsFinished] = useState(false);

  if (!isOpen) return null;

  const handleStartSync = async () => {
    setIsRunning(true);
    setIsFinished(false);
    setUpdatedCount(0);

    let count = 0;
    for (let i = 0; i < books.length; i++) {
      const book = books[i];
      setCurrentIndex(i + 1);
      setCurrentBookTitle(book.title);

      try {
        const link = await fetchCoverForBook(book.title, book.authors);
        if (link && link !== book.coverUrl) {
          await onUpdateBook({
            ...book,
            coverUrl: link,
            updatedAt: new Date().toISOString(),
          });
          count++;
          setUpdatedCount(count);
        }
      } catch (err) {
        console.warn(`Could not sync cover for ${book.title}:`, err);
      }

      // Small delay between requests to be polite to APIs
      await new Promise((r) => setTimeout(r, 200));
    }

    setIsRunning(false);
    setIsFinished(true);
  };

  const percent = books.length > 0 ? Math.round((currentIndex / books.length) * 100) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#16171b] rounded-2xl w-full max-w-md shadow-2xl border border-stone-200 dark:border-[#282a32] p-5 space-y-4">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-stone-100 dark:border-[#22242a]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-100">
                Sincronizar Capas (Google & Open Library)
              </h3>
              <p className="text-[11px] text-stone-500 dark:text-stone-400">
                Busca capas oficiais em alta resolução combinando Google Livros e Open Library
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isRunning}
            className="p-1.5 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 rounded-md hover:bg-stone-100 dark:hover:bg-[#202228] disabled:opacity-30"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        {!isRunning && !isFinished && (
          <div className="space-y-3 text-xs text-stone-600 dark:text-stone-300">
            <p>
              Esta ferramenta percorre os <strong>{books.length} livros</strong> da sua estante e consulta o Google Livros e o acervo do Open Library para buscar e atualizar capas com a melhor qualidade disponível.
            </p>
            <div className="p-3 rounded-xl bg-amber-50/60 dark:bg-[#1a1b22] border border-amber-200/50 dark:border-amber-900/40 text-[11px] text-amber-800 dark:text-amber-300">
              💡 As capas encontradas são salvas automaticamente no Firebase e sincronizadas em tempo real para você e Theresa.
            </div>

          </div>
        )}

        {/* Running progress */}
        {isRunning && (
          <div className="space-y-3 py-2">
            <div className="flex justify-between text-xs font-medium text-stone-700 dark:text-stone-300">
              <span className="flex items-center gap-2">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-600" />
                Atualizando ({currentIndex} de {books.length})...
              </span>
              <span className="font-mono">{percent}%</span>
            </div>

            <div className="w-full bg-stone-100 dark:bg-[#202228] rounded-full h-2 overflow-hidden">
              <div
                className="bg-amber-600 h-2 rounded-full transition-all duration-200"
                style={{ width: `${percent}%` }}
              />
            </div>

            <p className="text-[11px] text-stone-500 dark:text-stone-400 truncate">
              {currentBookTitle}
            </p>

            <span className="text-[10px] text-stone-400 block">
              {updatedCount} capas atualizadas até o momento.
            </span>
          </div>
        )}

        {/* Finished */}
        {isFinished && (
          <div className="py-3 text-center space-y-2">
            <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
              <Check className="w-5 h-5 stroke-[2.5]" />
            </div>
            <h4 className="text-sm font-semibold text-stone-900 dark:text-stone-100">
              Sincronização Concluída!
            </h4>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              {updatedCount} capas foram atualizadas com sucesso a partir da Google Livros API.
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="pt-2 flex justify-end gap-2 border-t border-stone-100 dark:border-[#22242a]">
          {!isRunning && !isFinished && (
            <>
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-1.5 text-xs font-medium text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-[#202228] rounded-lg"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleStartSync}
                className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Iniciar Sincronização</span>
              </button>
            </>
          )}

          {isFinished && (
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 rounded-lg text-xs font-semibold"
            >
              Fechar
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
