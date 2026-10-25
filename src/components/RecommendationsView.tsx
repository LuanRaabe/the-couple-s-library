import React from 'react';
import { Heart, MessageSquareHeart, Sparkles, BookOpen, ArrowRight, UserCheck } from 'lucide-react';
import { Book, LibrarySettings } from '../types/book';

interface RecommendationsViewProps {
  books: Book[];
  settings: LibrarySettings;
  activeReader: 'ele' | 'ela';
  onSelectBook: (book: Book) => void;
  onOpenAddModal: () => void;
}

export const RecommendationsView: React.FC<RecommendationsViewProps> = ({
  books,
  settings,
  activeReader,
  onSelectBook,
  onOpenAddModal,
}) => {
  // Extract all recommendations across all books
  const allRecs: {
    recId: string;
    book: Book;
    from: 'ele' | 'ela';
    to: 'ele' | 'ela';
    message: string;
    date: string;
    readStatus?: string;
  }[] = [];

  books.forEach((book) => {
    if (book.recommendations && book.recommendations.length > 0) {
      book.recommendations.forEach((rec) => {
        allRecs.push({
          recId: rec.id,
          book,
          from: rec.from,
          to: rec.to,
          message: rec.message,
          date: rec.date,
          readStatus: rec.readStatus,
        });
      });
    }
  });

  // Sort by date newest first
  allRecs.sort((a, b) => b.date.localeCompare(a.date));

  const forActiveReader = allRecs.filter((r) => r.to === activeReader);
  const byActiveReader = allRecs.filter((r) => r.from === activeReader);

  const activeReaderName = activeReader === 'ele' ? settings.eleName : settings.elaName;
  const partnerName = activeReader === 'ele' ? settings.elaName : settings.eleName;

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="bg-gradient-to-r from-rose-500/10 via-amber-500/10 to-purple-500/10 dark:from-rose-950/30 dark:to-purple-950/30 p-6 rounded-3xl border border-rose-200/60 dark:border-rose-900/40">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-rose-500 text-white flex items-center justify-center shadow-lg shadow-rose-500/20">
              <MessageSquareHeart className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                Recomendações de Amor
                <Sparkles className="w-4 h-4 text-amber-500" />
              </h2>
              <p className="text-sm text-stone-600 dark:text-stone-400">
                Livros que {settings.eleName} e {settings.elaName} indicaram um para o outro com bilhetinhos e motivos especiais.
              </p>
            </div>
          </div>
          <div className="text-xs font-semibold px-3 py-1.5 rounded-full bg-white/80 dark:bg-stone-800 shadow-xs border border-rose-200 dark:border-stone-700 text-rose-700 dark:text-rose-300">
            {allRecs.length} {allRecs.length === 1 ? 'indicação compartilhada' : 'indicações compartilhadas'}
          </div>
        </div>
      </div>

      {allRecs.length === 0 ? (
        <div className="text-center py-20 px-4 bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800">
          <Heart className="w-16 h-16 mx-auto text-rose-300 dark:text-rose-800 mb-3 animate-bounce" />
          <h3 className="font-serif text-lg font-bold text-stone-800 dark:text-stone-200">
            Nenhuma recomendação ainda
          </h3>
          <p className="text-sm text-stone-500 dark:text-stone-400 mt-1 max-w-md mx-auto">
            Abra qualquer livro da estante e clique em "Recomendar ao Amor" para deixar uma dedicatória dizendo por que o outro vai amar ler!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {allRecs.map((item) => {
            const senderName = item.from === 'ele' ? settings.eleName : settings.elaName;
            const recipientName = item.to === 'ele' ? settings.eleName : settings.elaName;
            const isForMe = item.to === activeReader;

            return (
              <div
                key={item.recId}
                className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Header of recommendation */}
                  <div className="flex items-center justify-between pb-3 mb-3 border-b border-stone-100 dark:border-stone-800">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                      <span className="text-xs font-bold text-stone-800 dark:text-stone-200">
                        {senderName}
                      </span>
                      <ArrowRight className="w-3 h-3 text-stone-400" />
                      <span className="text-xs font-bold text-stone-800 dark:text-stone-200">
                        {recipientName}
                      </span>
                      {isForMe && (
                        <span className="ml-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                          Para você
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-stone-400">{item.date}</span>
                  </div>

                  {/* Recommendation Message */}
                  <blockquote className="italic font-serif text-sm text-stone-700 dark:text-stone-300 mb-4 pl-3 border-l-2 border-rose-400 bg-rose-50/40 dark:bg-stone-800/50 py-2 pr-2 rounded-r-lg">
                    "{item.message}"
                  </blockquote>

                  {/* Associated Book Preview */}
                  <div
                    onClick={() => onSelectBook(item.book)}
                    className="flex items-center gap-3 p-2.5 rounded-xl bg-stone-50 dark:bg-stone-800/70 hover:bg-amber-50 dark:hover:bg-stone-800 border border-stone-200/80 dark:border-stone-700/60 cursor-pointer transition-colors"
                  >
                    <div className="w-12 h-16 shrink-0 bg-stone-200 dark:bg-stone-700 rounded overflow-hidden shadow-xs">
                      {item.book.coverUrl ? (
                        <img
                          src={item.book.coverUrl}
                          alt={item.book.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[10px] text-stone-400 font-serif">
                          Livro
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="font-serif font-bold text-xs sm:text-sm text-stone-900 dark:text-stone-100 truncate">
                        {item.book.title}
                      </h4>
                      <p className="text-xs text-stone-500 dark:text-stone-400 truncate">
                        {item.book.authors}
                      </p>
                      <span className="inline-block mt-1 text-[10px] font-medium px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
                        {item.book.status === 'lido' ? 'Já lido' : item.book.status === 'lendo' ? 'Em leitura' : 'Na lista'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-stone-100 dark:border-stone-800 flex justify-end">
                  <button
                    type="button"
                    onClick={() => onSelectBook(item.book)}
                    className="text-xs font-semibold text-rose-600 dark:text-rose-400 hover:text-rose-700 flex items-center gap-1"
                  >
                    <span>Ver detalhes do livro</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
