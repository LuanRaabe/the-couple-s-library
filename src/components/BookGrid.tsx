import React from 'react';
import { Star, Heart, BookOpen, MessageSquareHeart, RotateCcw } from 'lucide-react';
import { Book, BookStatus, LibrarySettings } from '@/features/books';
import { STATUS_LABELS, STATUS_COLORS, getReaderBadge, calculateProgress, calculateReadCount } from '@/utils/bookHelpers';

interface BookGridProps {
  books: Book[];
  settings: LibrarySettings;
  onSelectBook: (book: Book) => void;
  onUpdateStatus: (bookId: string, newStatus: BookStatus) => void;
  onToggleFavorite: (bookId: string) => void;
}

export const BookGrid: React.FC<BookGridProps> = ({
  books,
  settings,
  onSelectBook,
  onUpdateStatus,
  onToggleFavorite,
}) => {
  if (books.length === 0) {
    return (
      <div className="text-center py-20 px-4 bg-white/60 dark:bg-stone-900/60 rounded-3xl border border-stone-200 dark:border-stone-800">
        <BookOpen className="w-14 h-14 mx-auto text-amber-500/60 mb-3" />
        <h3 className="font-serif text-lg font-bold text-stone-800 dark:text-stone-200">
          Nenhum livro na estante
        </h3>
        <p className="text-sm text-stone-500 dark:text-stone-400 mt-1 max-w-sm mx-auto">
          Adicione seus títulos favoritos ou pesquise na Google Livros!
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6">
      {books.map((book) => {
        const readerBadge = getReaderBadge(book.assignedReader, settings.eleName, settings.elaName);
        const statusColor = STATUS_COLORS[book.status] || STATUS_COLORS.quero_ler;
        const progress = calculateProgress(book.currentPage, book.pageCount);
        const hasRecs = book.recommendations && book.recommendations.length > 0;

        return (
          <div
            key={book.id}
            className="group relative flex flex-col bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-sm hover:shadow-xl hover:border-amber-400/60 dark:hover:border-amber-600/60 transition-all duration-200 overflow-hidden"
          >
            {/* Top Badges */}
            <div className="absolute top-2.5 inset-x-2.5 z-10 flex items-center justify-between pointer-events-none">
              <span
                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full backdrop-blur-md shadow-xs border ${readerBadge.bg} ${readerBadge.text} ${readerBadge.border}`}
              >
                {readerBadge.label}
              </span>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleFavorite(book.id);
                }}
                className="pointer-events-auto p-1.5 rounded-full bg-white/80 dark:bg-stone-900/80 backdrop-blur-md hover:bg-white dark:hover:bg-stone-900 text-stone-400 hover:text-amber-500 shadow-xs transition-transform active:scale-125"
                title={book.favorite ? 'Favorito' : 'Favoritar'}
              >
                <Star
                  className={`w-3.5 h-3.5 ${
                    book.favorite ? 'fill-amber-400 text-amber-500' : 'text-stone-400'
                  }`}
                />
              </button>
            </div>

            {/* Book Cover Container */}
            <div
              onClick={() => onSelectBook(book)}
              className="relative aspect-2/3 bg-stone-100 dark:bg-stone-800/80 cursor-pointer overflow-hidden flex items-center justify-center p-2"
            >
              {book.coverUrl ? (
                <img
                  src={book.coverUrl}
                  alt={book.title}
                  className="w-full h-full object-cover rounded-md shadow-md group-hover:scale-105 transition-transform duration-300"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              ) : (
                <div className="w-full h-full rounded-md border border-stone-300 dark:border-stone-700 bg-amber-50 dark:bg-stone-800 p-3 flex flex-col justify-between text-center">
                  <span className="text-[10px] uppercase font-bold text-stone-400">Livro</span>
                  <p className="font-serif font-bold text-xs text-stone-700 dark:text-stone-300 line-clamp-3">
                    {book.title}
                  </p>
                  <span className="text-[9px] text-stone-400 line-clamp-1">{book.authors}</span>
                </div>
              )}

              {/* Recommendation Ribbon if present */}
              {hasRecs && (
                <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-rose-500/90 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full shadow-md backdrop-blur-xs">
                  <Heart className="w-3 h-3 fill-white" />
                  <span>Recomendado</span>
                </div>
              )}

              {/* Quick Status Pill & Re-reading badge */}
              <div className="absolute bottom-2 right-2 flex items-center gap-1">
                {calculateReadCount(book) > 1 && (
                  <span
                    className="inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-md shadow-md backdrop-blur-md bg-purple-600/90 text-white"
                    title={`Livro lido e relido ${calculateReadCount(book)} vezes`}
                  >
                    <RotateCcw className="w-2.5 h-2.5" />
                    <span>{calculateReadCount(book)}x</span>
                  </span>
                )}
                <span
                  className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md shadow-md backdrop-blur-md border ${statusColor.bg} ${statusColor.text} ${statusColor.border}`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${statusColor.dot}`} />
                  {STATUS_LABELS[book.status]}
                </span>
              </div>
            </div>

            {/* Book Info Section */}
            <div
              onClick={() => onSelectBook(book)}
              className="p-3 flex-1 flex flex-col justify-between cursor-pointer space-y-2"
            >
              <div>
                <h4 className="font-serif font-bold text-xs sm:text-sm text-stone-900 dark:text-stone-100 line-clamp-2 leading-snug group-hover:text-amber-700 dark:group-hover:text-amber-400 transition-colors">
                  {book.title}
                </h4>
                <p className="text-[11px] text-stone-500 dark:text-stone-400 line-clamp-1 mt-0.5">
                  {book.authors || 'Autor Desconhecido'}
                </p>
              </div>

              {/* Progress Bar (if reading or read) */}
              {(book.status === 'lendo' || book.status === 'lido' || (book.currentPage && book.currentPage > 0)) && (
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] text-stone-500 dark:text-stone-400">
                    <span>{progress}%</span>
                    <span>
                      {book.currentPage || 0}/{book.pageCount || '?'} pág.
                    </span>
                  </div>
                  <div className="w-full bg-stone-100 dark:bg-stone-800 rounded-full h-1 overflow-hidden">
                    <div
                      className="bg-amber-600 dark:bg-amber-500 h-1 rounded-full transition-all"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Dual Ratings Badge */}
              <div className="pt-1.5 border-t border-stone-100 dark:border-stone-800/80 flex items-center justify-between text-[11px]">
                {/* Ele */}
                <div className="flex items-center gap-1 text-amber-700 dark:text-amber-400" title={`Nota de ${settings.eleName}`}>
                  <Star className="w-3 h-3 fill-amber-400 text-amber-500" />
                  <span className="font-semibold">{book.ratings?.ele !== undefined && book.ratings.ele > 0 ? book.ratings.ele : '—'}</span>
                  <span className="text-[9px] text-stone-400">({settings.eleName[0]})</span>
                </div>

                {/* Ela */}
                <div className="flex items-center gap-1 text-rose-700 dark:text-rose-400" title={`Nota de ${settings.elaName}`}>
                  <Star className="w-3 h-3 fill-rose-400 text-rose-500" />
                  <span className="font-semibold">{book.ratings?.ela !== undefined && book.ratings.ela > 0 ? book.ratings.ela : '—'}</span>
                  <span className="text-[9px] text-stone-400">({settings.elaName[0]})</span>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
