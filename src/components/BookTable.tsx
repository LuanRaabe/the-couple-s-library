import React, { useState, useMemo } from 'react';
import { 
  ArrowUpDown, 
  Star, 
  Trash2, 
  BookMarked, 
  RotateCcw,
  Save,
  Undo2,
  Check
} from 'lucide-react';
import { Book, BookStatus, ReaderId, LibrarySettings } from '@/features/books';
import { STATUS_LABELS, STATUS_COLORS, getReaderBadge, calculateProgress, calculateReadCount } from '@/utils/bookHelpers';
import { useSessionDrafts } from '@/core/session/draft';

interface BookTableProps {
  books: Book[];
  settings: LibrarySettings;
  onSelectBook: (book: Book) => void;
  onUpdateStatus?: (bookId: string, newStatus: BookStatus) => void;
  onUpdateReader?: (bookId: string, newReader: ReaderId) => void;
  onUpdateBook?: (book: Book) => Promise<void>;
  onBatchUpdateBooks?: (books: Book[]) => Promise<any>;
  onDeleteBook: (bookId: string) => void;
  onToggleFavorite: (bookId: string) => void;
  onToggleOwned?: (bookId: string, newOwned: boolean) => void;
}

type SortField = 'title' | 'authors' | 'status' | 'reader' | 'progress' | 'avgRating' | 'dateAdded';

export const BookTable: React.FC<BookTableProps> = ({
  books,
  settings,
  onSelectBook,
  onUpdateBook,
  onDeleteBook,
  onToggleFavorite,
  onToggleOwned,
}) => {
  // Always default to alphabetical sorting A-Z as requested by user
  const [sortField, setSortField] = useState<SortField>('title');
  const [sortAsc, setSortAsc] = useState<boolean>(true);

  // Reactive drafts hook: guaranteed sync with sessionStorage across all tabs and edits
  const { draftsMap, hasDraft, getDraft, saveDraft, clearDraft } = useSessionDrafts();

  const [savingRows, setSavingRows] = useState<Record<string, boolean>>({});
  const [savedSuccessRows, setSavedSuccessRows] = useState<Record<string, boolean>>({});

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const sortedBooks = useMemo(() => {
    return [...books].sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'title':
          comparison = (a.title || '').localeCompare(b.title || '', 'pt-BR', { sensitivity: 'base' });
          break;
        case 'authors':
          comparison = (a.authors || '').localeCompare(b.authors || '', 'pt-BR', { sensitivity: 'base' });
          break;
        case 'status':
          comparison = (a.status || '').localeCompare(b.status || '', 'pt-BR', { sensitivity: 'base' });
          break;
        case 'reader':
          comparison = (a.assignedReader || '').localeCompare(b.assignedReader || '', 'pt-BR', { sensitivity: 'base' });
          break;
        case 'progress': {
          const progA = calculateProgress(a.currentPage, a.pageCount);
          const progB = calculateProgress(b.currentPage, b.pageCount);
          comparison = progA - progB;
          break;
        }
        case 'avgRating': {
          const rateA = ((a.ratings?.ele || 0) + (a.ratings?.ela || 0)) / ((a.ratings?.ele ? 1 : 0) + (a.ratings?.ela ? 1 : 0) || 1);
          const rateB = ((b.ratings?.ele || 0) + (b.ratings?.ela || 0)) / ((b.ratings?.ele ? 1 : 0) + (b.ratings?.ela ? 1 : 0) || 1);
          comparison = rateA - rateB;
          break;
        }
        case 'dateAdded':
        default:
          comparison = (a.dateAdded || '').localeCompare(b.dateAdded || '');
          break;
      }
      return sortAsc ? comparison : -comparison;
    });
  }, [books, sortField, sortAsc]);

  // Update a book's draft in the table and persist in sessionStorage with event notification
  const handleRowFieldChange = (bookId: string, updates: Partial<Book>) => {
    saveDraft(bookId, updates);
  };

  // Discard draft for a specific row
  const handleDiscardRow = (bookId: string) => {
    clearDraft(bookId);
  };

  // Save row draft to the database, and only remove from session on completion
  const handleSaveRow = async (book: Book) => {
    const draft = getDraft(book.id);
    if (!draft || !onUpdateBook) return;

    setSavingRows((prev) => ({ ...prev, [book.id]: true }));
    try {
      const mergedBook: Book = {
        ...book,
        ...draft,
        updatedAt: new Date().toISOString(),
      };
      await onUpdateBook(mergedBook);

      // ONLY on database success, delete draft from sessionStorage
      clearDraft(book.id);

      // Show temporary checkmark
      setSavedSuccessRows((prev) => ({ ...prev, [book.id]: true }));
      setTimeout(() => {
        setSavedSuccessRows((prev) => ({ ...prev, [book.id]: false }));
      }, 3000);
    } catch (err) {
      console.error('Error saving row:', err);
    } finally {
      setSavingRows((prev) => ({ ...prev, [book.id]: false }));
    }
  };

  if (books.length === 0) {
    return (
      <div className="text-center py-16 px-4 bg-white/60 dark:bg-stone-900/60 rounded-2xl border border-stone-200 dark:border-stone-800">
        <BookMarked className="w-12 h-12 mx-auto text-amber-500/70 mb-3" />
        <h3 className="font-serif text-lg font-semibold text-stone-800 dark:text-stone-200">
          Nenhum livro encontrado
        </h3>
        <p className="text-sm text-stone-500 dark:text-stone-400 mt-1 max-w-md mx-auto">
          Adicione um livro buscando no catálogo ou verifique os filtros ativos!
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-stone-600 dark:text-stone-300">
          <thead className="bg-amber-50/60 dark:bg-stone-800/80 text-stone-800 dark:text-stone-200 text-xs font-semibold uppercase tracking-wider border-b border-stone-200 dark:border-stone-800">
            <tr>
              <th scope="col" className="p-4 w-12 text-center">
                ★
              </th>
              <th scope="col" className="py-4 px-4 cursor-pointer select-none" onClick={() => handleSort('title')}>
                <div className="flex items-center gap-1.5 hover:text-amber-700 dark:hover:text-amber-400">
                  <span>Livro / Autor</span>
                  <ArrowUpDown className="w-3.5 h-3.5 opacity-60" />
                </div>
              </th>
              <th scope="col" className="py-4 px-4 cursor-pointer select-none" onClick={() => handleSort('reader')}>
                <div className="flex items-center gap-1.5 hover:text-amber-700 dark:hover:text-amber-400">
                  <span>Leitor</span>
                  <ArrowUpDown className="w-3.5 h-3.5 opacity-60" />
                </div>
              </th>
              <th scope="col" className="py-4 px-4 cursor-pointer select-none" onClick={() => handleSort('status')}>
                <div className="flex items-center gap-1.5 hover:text-amber-700 dark:hover:text-amber-400">
                  <span>Status</span>
                  <ArrowUpDown className="w-3.5 h-3.5 opacity-60" />
                </div>
              </th>
              <th scope="col" className="py-4 px-3 text-center">
                Posse
              </th>
              <th scope="col" className="py-4 px-4 cursor-pointer select-none" onClick={() => handleSort('progress')}>
                <div className="flex items-center gap-1.5 hover:text-amber-700 dark:hover:text-amber-400">
                  <span>Progresso</span>
                  <ArrowUpDown className="w-3.5 h-3.5 opacity-60" />
                </div>
              </th>
              <th scope="col" className="py-4 px-4">
                <span className="text-amber-800 dark:text-amber-300">{settings.eleName}</span>
              </th>
              <th scope="col" className="py-4 px-4">
                <span className="text-rose-800 dark:text-rose-300">{settings.elaName}</span>
              </th>
              <th scope="col" className="py-4 px-4 text-center">
                Recomendações
              </th>
              <th scope="col" className="py-4 px-4 text-right min-w-[140px]">
                Ações
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100 dark:divide-stone-800/80">
            {sortedBooks.map((book) => {
              const rowDraft = draftsMap[book.id];
              const effectiveStatus: BookStatus = rowDraft?.status || book.status;
              const effectiveReader: ReaderId = rowDraft?.assignedReader || book.assignedReader;
              const effectiveCurrentPage = rowDraft?.currentPage !== undefined ? rowDraft.currentPage : (book.currentPage || 0);
              const effectivePageCount = rowDraft?.pageCount !== undefined ? rowDraft.pageCount : (book.pageCount || 0);
              const effectiveOwned: boolean = rowDraft?.owned !== undefined ? rowDraft.owned : (book.owned !== false);
              const rowHasDraft = hasDraft(book.id);
              const isSavingThisRow = !!savingRows[book.id];
              const isSavedSuccess = !!savedSuccessRows[book.id];

              const readerBadge = getReaderBadge(effectiveReader, settings.eleName, settings.elaName);
              const statusColor = STATUS_COLORS[effectiveStatus] || STATUS_COLORS.quero_ler;
              const progress = calculateProgress(effectiveCurrentPage, effectivePageCount);
              const recCount = book.recommendations?.length || 0;

              return (
                <tr
                  key={book.id}
                  className={`transition-colors group ${
                    rowHasDraft 
                      ? 'bg-amber-50/60 dark:bg-amber-950/20' 
                      : 'hover:bg-amber-50/40 dark:hover:bg-stone-800/50'
                  }`}
                >
                  {/* Favorite star */}
                  <td className="p-4 text-center">
                    <button
                      type="button"
                      onClick={() => onToggleFavorite(book.id)}
                      className="p-1 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors cursor-pointer"
                      title={book.favorite ? 'Remover dos favoritos' : 'Marcar como favorito'}
                    >
                      <Star
                        className={`w-4 h-4 transition-transform active:scale-125 ${
                          book.favorite
                            ? 'fill-amber-400 text-amber-500'
                            : 'text-stone-300 dark:text-stone-600 hover:text-amber-400'
                        }`}
                      />
                    </button>
                  </td>

                  {/* Cover & Title */}
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div
                        onClick={() => onSelectBook(book)}
                        className="w-10 h-14 shrink-0 rounded bg-stone-200 dark:bg-stone-800 overflow-hidden shadow-xs cursor-pointer hover:opacity-90 transition-opacity"
                      >
                        {book.coverUrl ? (
                          <img
                            src={book.coverUrl}
                            alt={book.title}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[10px] text-stone-400 p-1 text-center font-serif">
                            {book.title.slice(0, 3)}
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h4
                            onClick={() => onSelectBook(book)}
                            className="font-serif font-bold text-stone-900 dark:text-stone-100 hover:text-amber-700 dark:hover:text-amber-400 cursor-pointer truncate max-w-xs sm:max-w-md"
                          >
                            {book.title}
                          </h4>
                          {rowHasDraft && (
                            <span 
                              className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-200 shrink-0"
                              title="Alterações salvas na sessão do navegador"
                            >
                              Rascunho
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-stone-500 dark:text-stone-400 truncate">
                          {book.authors || 'Autor Desconhecido'}
                        </p>
                        {book.categories && book.categories.length > 0 && (
                          <span className="inline-block mt-0.5 text-[10px] text-stone-400 dark:text-stone-500">
                            {book.categories.slice(0, 2).join(' • ')}
                          </span>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Editable Reader Dropdown */}
                  <td className="py-3 px-4">
                    <select
                      value={effectiveReader}
                      onChange={(e) => handleRowFieldChange(book.id, { assignedReader: e.target.value as ReaderId })}
                      className={`text-xs font-semibold rounded-lg px-2.5 py-1 border transition-colors cursor-pointer bg-white dark:bg-stone-900 ${readerBadge.text} ${readerBadge.border}`}
                      title="Alterar leitor (Clique em Salvar para persistir no banco)"
                    >
                      <option value="ele">{settings.eleName}</option>
                      <option value="ela">{settings.elaName}</option>
                      <option value="ambos">Ambos (Casal)</option>
                    </select>
                  </td>

                  {/* Editable Status dropdown & Re-reading badge */}
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1.5">
                      <select
                        value={effectiveStatus}
                        onChange={(e) => handleRowFieldChange(book.id, { status: e.target.value as BookStatus })}
                        className={`text-xs font-medium rounded-lg px-2.5 py-1 border transition-colors cursor-pointer bg-white dark:bg-stone-900 ${statusColor.text} ${statusColor.border}`}
                        title="Alterar status (Clique em Salvar para persistir no banco)"
                      >
                        <option value="quero_ler">Quero Ler</option>
                        <option value="lendo">Lendo</option>
                        <option value="lido">Lido</option>
                        <option value="pausado">Pausado</option>
                        <option value="abandonado">Abandonado</option>
                      </select>
                      {calculateReadCount(book) > 1 && (
                        <span
                          className="inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-purple-100 text-purple-800 dark:bg-purple-950/70 dark:text-purple-300 border border-purple-200 dark:border-purple-800 shrink-0"
                          title={`Lido e relido ${calculateReadCount(book)} vezes`}
                        >
                          <RotateCcw className="w-2.5 h-2.5" />
                          <span>{calculateReadCount(book)}x</span>
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Posse / Ownership: Temos vs Lista de Desejos */}
                  <td className="py-3 px-3 text-center">
                    <button
                      type="button"
                      onClick={() => handleRowFieldChange(book.id, { owned: !effectiveOwned })}
                      className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-lg border transition-colors cursor-pointer ${
                        effectiveOwned
                          ? 'bg-stone-50 dark:bg-stone-800 text-stone-700 dark:text-stone-300 border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-750'
                          : 'bg-violet-50 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-800 hover:bg-violet-100 dark:hover:bg-violet-900/60'
                      }`}
                      title={
                        effectiveOwned
                          ? 'Temos na estante. Clique para marcar como Lista de Desejos'
                          : 'Na Lista de Desejos. Clique para marcar como exemplar na estante'
                      }
                    >
                      <span>{effectiveOwned ? '📦 Temos' : '🎁 Desejo'}</span>
                    </button>
                  </td>

                  {/* Progress with inline quick-edit */}
                  <td className="py-3 px-4 min-w-[150px]">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min="0"
                            max={effectivePageCount > 0 ? effectivePageCount : 9999}
                            value={effectiveCurrentPage}
                            onChange={(e) => {
                              const val = Math.max(0, parseInt(e.target.value) || 0);
                              handleRowFieldChange(book.id, {
                                currentPage: val,
                                ...(val >= effectivePageCount && effectivePageCount > 0 ? { status: 'lido' } : {})
                              });
                            }}
                            className="w-14 px-1 py-0.5 text-xs text-stone-800 dark:text-stone-200 bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 rounded-md font-mono text-center focus:outline-hidden focus:ring-1 focus:ring-amber-500"
                            title="Editar página atual (Salva como rascunho na sessão)"
                          />
                          <span className="text-stone-400 text-[11px]">/ {effectivePageCount || '?'}</span>
                        </div>
                        <span className="font-semibold text-stone-600 dark:text-stone-400 text-[11px]">
                          {progress}%
                        </span>
                      </div>
                      <div className="w-full bg-stone-200 dark:bg-stone-700 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-amber-600 h-1.5 rounded-full transition-all"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  </td>

                  {/* Ratings Ele */}
                  <td className="py-3 px-4">
                    {book.ratings?.ele ? (
                      <span className="inline-flex items-center gap-1 font-semibold text-amber-700 dark:text-amber-400">
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
                        {book.ratings.ele}
                      </span>
                    ) : (
                      <span className="text-stone-300 dark:text-stone-600">—</span>
                    )}
                  </td>

                  {/* Ratings Ela */}
                  <td className="py-3 px-4">
                    {book.ratings?.ela ? (
                      <span className="inline-flex items-center gap-1 font-semibold text-rose-700 dark:text-rose-400">
                        <Star className="w-3.5 h-3.5 fill-rose-400 text-rose-500" />
                        {book.ratings.ela}
                      </span>
                    ) : (
                      <span className="text-stone-300 dark:text-stone-600">—</span>
                    )}
                  </td>

                  {/* Recommendations */}
                  <td className="py-3 px-4 text-center">
                    {recCount > 0 ? (
                      <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                        ♥ {recCount}
                      </span>
                    ) : (
                      <span className="text-stone-300 dark:text-stone-600">—</span>
                    )}
                  </td>

                  {/* Actions (with Save button if drafted) */}
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {isSavedSuccess && (
                        <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-0.5">
                          <Check className="w-3.5 h-3.5" />
                          <span>Salvo!</span>
                        </span>
                      )}

                      {rowHasDraft && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleDiscardRow(book.id)}
                            className="p-1.5 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors cursor-pointer"
                            title="Descartar rascunho da sessão"
                          >
                            <Undo2 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            disabled={isSavingThisRow}
                            onClick={() => handleSaveRow(book)}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                            title="Salvar alterações no banco de dados"
                          >
                            <Save className="w-3 h-3" />
                            <span>{isSavingThisRow ? '...' : 'Salvar'}</span>
                          </button>
                        </>
                      )}

                      <button
                        type="button"
                        onClick={() => onSelectBook(book)}
                        className="px-2 py-1 text-xs font-semibold text-stone-600 dark:text-stone-300 hover:text-amber-700 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-stone-800 rounded-lg transition-colors cursor-pointer"
                      >
                        Abrir
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm(`Excluir "${book.title}" da estante?`)) {
                            clearDraft(book.id);
                            onDeleteBook(book.id);
                          }
                        }}
                        className="p-1.5 text-stone-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                        title="Excluir livro"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
