import React, { useState } from 'react';
import { Save, Loader2, AlertCircle, Check, X, RotateCcw } from 'lucide-react';
import { Book, BatchProgressCallback, BatchSaveResult } from '@/features/books';
import { useSessionDrafts } from '@/core/session/draft';

interface FloatingBatchSaveBarProps {
  books: Book[];
  onBatchUpdateBooks: (books: Book[], onProgress?: BatchProgressCallback) => Promise<BatchSaveResult | void>;
  onUpdateBook?: (book: Book) => Promise<void>;
}

export const FloatingBatchSaveBar: React.FC<FloatingBatchSaveBarProps> = ({
  books,
  onBatchUpdateBooks,
  onUpdateBook,
}) => {
  const { draftIds, draftCount, draftsMap, clearAllDrafts, clearDraft } = useSessionDrafts();

  const [isSaving, setIsSaving] = useState(false);
  const [batchError, setBatchError] = useState<string | null>(null);

  // Real-time batch progress modal state
  const [batchModalOpen, setBatchModalOpen] = useState(false);
  const [batchProgress, setBatchProgress] = useState<{
    completed: number;
    total: number;
    currentTitle: string;
    percent: number;
  }>({ completed: 0, total: 0, currentTitle: '', percent: 0 });
  const [batchSaveDone, setBatchSaveDone] = useState(false);

  if (draftCount === 0) return null;

  const handleDiscardAll = () => {
    if (window.confirm(`Descartar todas as alterações de ${draftCount} livro(s) salvas nesta sessão?`)) {
      clearAllDrafts();
      setBatchError(null);
    }
  };

  const handleSaveAll = async () => {
    if (draftCount === 0 || isSaving) return;

    setIsSaving(true);
    setBatchError(null);
    setBatchSaveDone(false);
    setBatchModalOpen(true);
    setBatchProgress({
      completed: 0,
      total: draftCount,
      currentTitle: 'Iniciando atualização dos livros...',
      percent: 0,
    });

    try {
      const mergedBooks: Book[] = [];
      for (const id of draftIds) {
        const original = books.find((b) => b.id === id);
        const draft = draftsMap[id];
        if (original && draft) {
          mergedBooks.push({
            ...original,
            ...draft,
            updatedAt: new Date().toISOString(),
          });
        }
      }

      if (mergedBooks.length === 0) {
        // In case draft IDs did not match in-memory books, clear dangling drafts
        clearAllDrafts();
        setIsSaving(false);
        setBatchModalOpen(false);
        return;
      }

      const onProgressHandler: BatchProgressCallback = (completed, total, currentTitle) => {
        setBatchProgress({
          completed,
          total,
          currentTitle: currentTitle || '',
          percent: total > 0 ? Math.min(100, Math.round((completed / total) * 100)) : 0,
        });
      };

      if (onBatchUpdateBooks) {
        const res = await onBatchUpdateBooks(mergedBooks, onProgressHandler);
        if (res && !res.success) {
          // Clear only successfully saved drafts
          const failedSet = new Set(res.failedBookIds);
          draftIds.forEach((id) => {
            if (!failedSet.has(id)) {
              clearDraft(id);
            }
          });
          setBatchError(`${res.savedCount} salvos com sucesso, mas ${res.failedBookIds.length} livro(s) falharam.`);
          setIsSaving(false);
          return;
        }
      } else if (onUpdateBook) {
        let count = 0;
        for (const book of mergedBooks) {
          onProgressHandler(count, mergedBooks.length, book.title);
          await onUpdateBook(book);
          clearDraft(book.id);
          count++;
          onProgressHandler(count, mergedBooks.length, book.title);
        }
      }

      // ONLY on database success, delete all drafts from session
      clearAllDrafts();
      setBatchSaveDone(true);

      setTimeout(() => {
        setBatchModalOpen(false);
        setIsSaving(false);
      }, 1200);
    } catch (err: any) {
      console.error('Error saving batch of books:', err);
      setBatchError('Não foi possível salvar todos os livros no banco. Seus rascunhos continuam seguros na sessão.');
      setIsSaving(false);
    }
  };

  return (
    <>
      {/* Floating Sticky Save Bar (always visible in bottom right when drafts exist) */}
      <aside aria-label="Alterações pendentes de salvamento" className="fixed bottom-6 left-4 right-4 sm:left-auto sm:right-8 sm:max-w-xl z-40 bg-stone-900/95 dark:bg-stone-850/95 backdrop-blur-md text-stone-100 p-4 rounded-2xl shadow-2xl border border-amber-500/50 flex flex-col sm:flex-row items-center justify-between gap-3 animate-in slide-in-from-bottom-5 duration-200">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500 text-stone-950 flex items-center justify-center font-bold text-sm shrink-0 shadow-md">
            {draftCount}
          </div>
          <div>
            <p className="text-xs font-bold text-white flex items-center gap-1.5">
              <span>
                {draftCount === 1
                  ? '1 livro com alteração pendente'
                  : `${draftCount} livros com alterações pendentes`}
              </span>
              <span className="text-[10px] bg-amber-400/20 text-amber-300 px-1.5 py-0.5 rounded font-mono">
                Sessão
              </span>
            </p>
            <p className="text-[11px] text-stone-300">
              Alterações salvas na sessão. Clique em salvar para persistir no banco de dados.
            </p>
            {batchError && (
              <p className="text-[11px] text-rose-300 mt-0.5 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                <span>{batchError}</span>
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end shrink-0">
          <button
            type="button"
            onClick={handleDiscardAll}
            disabled={isSaving}
            className="px-2.5 py-1.5 text-xs font-semibold text-stone-300 hover:text-white hover:bg-stone-800 rounded-lg transition-colors cursor-pointer"
          >
            Descartar
          </button>

          <button
            type="button"
            onClick={handleSaveAll}
            disabled={isSaving}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md hover:shadow-emerald-950/40 transition-all cursor-pointer disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Salvando ({draftCount})...</span>
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" />
                <span>Salvar Todas as Alterações ({draftCount})</span>
              </>
            )}
          </button>
        </div>
      </aside>

      {/* Real-Time Batch Save Progress Modal */}
      {batchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#16171b] rounded-3xl w-full max-w-md shadow-2xl border border-stone-200 dark:border-[#282a32] p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100 dark:border-[#22242a]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <Save className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-100">
                    Salvando Livros no Banco
                  </h3>
                  <p className="text-[11px] text-stone-500 dark:text-stone-400">
                    Sincronizando alterações com o banco de dados em tempo real
                  </p>
                </div>
              </div>
              {!isSaving && (
                <button
                  onClick={() => setBatchModalOpen(false)}
                  className="p-1.5 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 rounded-md hover:bg-stone-100 dark:hover:bg-[#202228] transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="space-y-3 py-2">
              <div className="flex justify-between text-xs font-medium text-stone-700 dark:text-stone-300">
                <span className="flex items-center gap-2">
                  {!batchSaveDone ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                  ) : (
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                  )}
                  {batchSaveDone ? (
                    'Salvo com sucesso!'
                  ) : (
                    `Salvando (${batchProgress.completed} de ${batchProgress.total})...`
                  )}
                </span>
                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                  {batchProgress.percent}%
                </span>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-stone-100 dark:bg-[#202228] rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-emerald-600 dark:bg-emerald-500 h-2.5 rounded-full transition-all duration-200"
                  style={{ width: `${batchProgress.percent}%` }}
                />
              </div>

              {batchProgress.currentTitle && (
                <p className="text-[11px] text-stone-500 dark:text-stone-400 truncate">
                  Livro atual: <strong className="text-stone-800 dark:text-stone-200">{batchProgress.currentTitle}</strong>
                </p>
              )}

              {batchError && (
                <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-[11px] text-rose-700 dark:text-rose-300 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{batchError}</span>
                </div>
              )}

              {batchSaveDone && (
                <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 text-[11px] text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                  <Check className="w-4 h-4 shrink-0 text-emerald-600" />
                  <span>Todas as edições foram gravadas com sucesso no banco de dados!</span>
                </div>
              )}
            </div>

            {batchError && !isSaving && (
              <div className="pt-2 flex justify-end gap-2 border-t border-stone-100 dark:border-[#22242a]">
                <button
                  type="button"
                  onClick={() => setBatchModalOpen(false)}
                  className="px-3.5 py-1.5 text-xs font-medium text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-[#202228] rounded-xl transition-colors"
                >
                  Fechar
                </button>
                <button
                  type="button"
                  onClick={handleSaveAll}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Tentar Novamente</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};
