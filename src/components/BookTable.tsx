import React, { useState, useMemo } from 'react';
import { 
  ArrowUpDown, 
  Star, 
  ExternalLink, 
  Trash2, 
  BookMarked, 
  Check, 
  Heart,
  MessageSquareHeart,
  Eye,
  RotateCcw
} from 'lucide-react';
import { Book, BookStatus, ReaderId, LibrarySettings } from '../types/book';
import { STATUS_LABELS, STATUS_COLORS, getReaderBadge, calculateProgress, calculateReadCount } from '../utils/bookHelpers';

interface BookTableProps {
  books: Book[];
  settings: LibrarySettings;
  onSelectBook: (book: Book) => void;
  onUpdateStatus: (bookId: string, newStatus: BookStatus) => void;
  onUpdateReader: (bookId: string, newReader: ReaderId) => void;
  onDeleteBook: (bookId: string) => void;
  onToggleFavorite: (bookId: string) => void;
}

type SortField = 'title' | 'authors' | 'status' | 'reader' | 'progress' | 'avgRating' | 'dateAdded';

export const BookTable: React.FC<BookTableProps> = ({
  books,
  settings,
  onSelectBook,
  onUpdateStatus,
  onUpdateReader,
  onDeleteBook,
  onToggleFavorite,
}) => {
  const [sortField, setSortField] = useState<SortField>('dateAdded');
  const [sortAsc, setSortAsc] = useState<boolean>(false);

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
          comparison = a.title.localeCompare(b.title);
          break;
        case 'authors':
          comparison = a.authors.localeCompare(b.authors);
          break;
        case 'status':
          comparison = a.status.localeCompare(b.status);
          break;
        case 'reader':
          comparison = a.assignedReader.localeCompare(b.assignedReader);
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

  if (books.length === 0) {
    return (
      <div className="text-center py-16 px-4 bg-white/60 dark:bg-stone-900/60 rounded-2xl border border-stone-200 dark:border-stone-800">
        <BookMarked className="w-12 h-12 mx-auto text-amber-500/70 mb-3" />
        <h3 className="font-serif text-lg font-semibold text-stone-800 dark:text-stone-200">
          Nenhum livro encontrado
        </h3>
        <p className="text-sm text-stone-500 dark:text-stone-400 mt-1 max-w-md mx-auto">
          Adicione um livro buscando no Google Livros ou usando os exemplos recomendados!
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
              <th scope="col" className="py-4 px-4 text-right">
                Ações
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100 dark:divide-stone-800/80">
            {sortedBooks.map((book) => {
              const readerBadge = getReaderBadge(book.assignedReader, settings.eleName, settings.elaName);
              const statusColor = STATUS_COLORS[book.status] || STATUS_COLORS.quero_ler;
              const progress = calculateProgress(book.currentPage, book.pageCount);
              const recCount = book.recommendations?.length || 0;

              return (
                <tr
                  key={book.id}
                  className="hover:bg-amber-50/40 dark:hover:bg-stone-800/50 transition-colors group"
                >
                  {/* Favorite star */}
                  <td className="p-4 text-center">
                    <button
                      type="button"
                      onClick={() => onToggleFavorite(book.id)}
                      className="p-1 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
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
                        <h4
                          onClick={() => onSelectBook(book)}
                          className="font-serif font-bold text-stone-900 dark:text-stone-100 hover:text-amber-700 dark:hover:text-amber-400 cursor-pointer truncate max-w-xs sm:max-w-md"
                        >
                          {book.title}
                        </h4>
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

                  {/* Editable Reader */}
                  <td className="py-3 px-4">
                    <select
                      value={book.assignedReader}
                      onChange={(e) => onUpdateReader(book.id, e.target.value as ReaderId)}
                      className={`text-xs font-semibold rounded-lg px-2.5 py-1 border transition-colors cursor-pointer bg-white dark:bg-stone-900 ${readerBadge.text} ${readerBadge.border}`}
                      title={`Alterar leitor responsável por este livro`}
                    >
                      <option value="ele">{settings.eleName}</option>
                      <option value="ela">{settings.elaName}</option>
                      <option value="ambos">Ambos (Casal)</option>
                    </select>
                  </td>

                  {/* Status dropdown & Re-reading badge */}
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1.5">
                      <select
                        value={book.status}
                        onChange={(e) => onUpdateStatus(book.id, e.target.value as BookStatus)}
                        className={`text-xs font-medium rounded-lg px-2.5 py-1 border transition-colors cursor-pointer bg-white dark:bg-stone-900 ${statusColor.text} ${statusColor.border}`}
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

                  {/* Progress */}
                  <td className="py-3 px-4 min-w-[140px]">
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="font-medium text-stone-700 dark:text-stone-300">{progress}%</span>
                        <span className="text-[11px] text-stone-400">
                          {book.currentPage || 0}/{book.pageCount || '?'} pág.
                        </span>
                      </div>
                      <div className="w-full bg-stone-100 dark:bg-stone-800 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-amber-600 dark:bg-amber-500 h-1.5 rounded-full transition-all duration-300"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  </td>

                  {/* Rating Ele */}
                  <td className="py-3 px-4">
                    {book.ratings?.ele !== undefined && book.ratings.ele > 0 ? (
                      <div className="flex items-center gap-1 font-semibold text-xs text-amber-700 dark:text-amber-400">
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
                        <span>{book.ratings.ele}</span>
                      </div>
                    ) : (
                      <span className="text-xs text-stone-400">—</span>
                    )}
                  </td>

                  {/* Rating Ela */}
                  <td className="py-3 px-4">
                    {book.ratings?.ela !== undefined && book.ratings.ela > 0 ? (
                      <div className="flex items-center gap-1 font-semibold text-xs text-rose-700 dark:text-rose-400">
                        <Star className="w-3.5 h-3.5 fill-rose-400 text-rose-500" />
                        <span>{book.ratings.ela}</span>
                      </div>
                    ) : (
                      <span className="text-xs text-stone-400">—</span>
                    )}
                  </td>

                  {/* Couple Recommendations */}
                  <td className="py-3 px-4 text-center">
                    {recCount > 0 ? (
                      <button
                        type="button"
                        onClick={() => onSelectBook(book)}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border border-rose-200 dark:border-rose-800 hover:bg-rose-100"
                      >
                        <Heart className="w-3 h-3 fill-rose-500" />
                        <span>{recCount}</span>
                      </button>
                    ) : (
                      <span className="text-xs text-stone-400">—</span>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => onSelectBook(book)}
                        className="p-1.5 text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
                        title="Ver detalhes e anotações"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteBook(book.id)}
                        className="p-1.5 text-stone-400 hover:text-rose-600 dark:text-stone-500 dark:hover:text-rose-400 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors opacity-0 group-hover:opacity-100"
                        title="Excluir livro"
                      >
                        <Trash2 className="w-4 h-4" />
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
