import React from 'react';
import { 
  Trophy, 
  BookOpen, 
  BookmarkCheck, 
  Star, 
  Sparkles, 
  BarChart3, 
  Flame, 
  Layers,
  Heart
} from 'lucide-react';
import { Book, LibrarySettings } from '@/features/books';

interface StatsViewProps {
  books: Book[];
  settings: LibrarySettings;
  onSelectBook: (book: Book) => void;
}

export const StatsView: React.FC<StatsViewProps> = ({
  books,
  settings,
  onSelectBook,
}) => {
  const readBooks = books.filter((b) => b.status === 'lido');
  const readingBooks = books.filter((b) => b.status === 'lendo');
  const wishlistBooks = books.filter((b) => b.status === 'quero_ler');

  // Breakdown by reader
  const readByEle = readBooks.filter((b) => b.assignedReader === 'ele' || b.assignedReader === 'ambos').length;
  const readByEla = readBooks.filter((b) => b.assignedReader === 'ela' || b.assignedReader === 'ambos').length;
  const readBoth = readBooks.filter((b) => b.assignedReader === 'ambos').length;

  // Total pages read
  const totalPagesRead = books.reduce((acc, b) => {
    if (b.status === 'lido') {
      return acc + (b.pageCount || 0);
    }
    return acc + (b.currentPage || 0);
  }, 0);

  // Average ratings
  let eleRatingSum = 0;
  let eleRatingCount = 0;
  let elaRatingSum = 0;
  let elaRatingCount = 0;

  books.forEach((b) => {
    if (b.ratings?.ele !== undefined && b.ratings.ele > 0) {
      eleRatingSum += b.ratings.ele;
      eleRatingCount += 1;
    }
    if (b.ratings?.ela !== undefined && b.ratings.ela > 0) {
      elaRatingSum += b.ratings.ela;
      elaRatingCount += 1;
    }
  });

  const avgEleRating = eleRatingCount > 0 ? (eleRatingSum / eleRatingCount).toFixed(1) : '—';
  const avgElaRating = elaRatingCount > 0 ? (elaRatingSum / elaRatingCount).toFixed(1) : '—';

  // Goal progress
  const yearlyGoal = settings.yearlyGoal || 24;
  const goalProgress = Math.min(100, Math.round((readBooks.length / yearlyGoal) * 100));

  // Top rated books
  const ratedBooks = books
    .filter((b) => (b.ratings?.ele || 0) > 0 || (b.ratings?.ela || 0) > 0)
    .map((b) => {
      const ele = b.ratings?.ele || 0;
      const ela = b.ratings?.ela || 0;
      const count = (ele > 0 ? 1 : 0) + (ela > 0 ? 1 : 0);
      const avg = count > 0 ? (ele + ela) / count : 0;
      return { book: b, avg };
    })
    .sort((a, b) => b.avg - a.avg)
    .slice(0, 5);

  // Top genres
  const genreCounts: Record<string, number> = {};
  books.forEach((b) => {
    b.categories?.forEach((c) => {
      genreCounts[c] = (genreCounts[c] || 0) + 1;
    });
  });
  const topGenres = Object.entries(genreCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Couple Reading Goal Card */}
      <div className="bg-gradient-to-br from-amber-600 via-amber-700 to-rose-700 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none transform translate-x-10 translate-y-10">
          <Trophy className="w-80 h-80" />
        </div>

        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-semibold mb-3">
            <Flame className="w-3.5 h-3.5 text-amber-300" />
            Meta Literária do Casal 2026
          </div>
          <h2 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight">
            {readBooks.length} de {yearlyGoal} livros concluídos
          </h2>
          <p className="text-amber-100 text-sm mt-1">
            {readBooks.length >= yearlyGoal
              ? '🎉 Parabéns! Vocês atingiram a meta anual de leitura juntos!'
              : `Faltam apenas ${yearlyGoal - readBooks.length} livros para completar o desafio do ano!`}
          </p>

          {/* Goal progress bar */}
          <div className="mt-5 space-y-2">
            <div className="flex justify-between text-xs font-semibold text-amber-100">
              <span>Progresso geral</span>
              <span>{goalProgress}%</span>
            </div>
            <div className="w-full bg-black/25 rounded-full h-3 overflow-hidden backdrop-blur-xs p-0.5 border border-white/20">
              <div
                className="bg-gradient-to-r from-amber-300 to-rose-300 h-full rounded-full transition-all duration-700"
                style={{ width: `${goalProgress}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Read */}
        <div className="bg-white dark:bg-stone-900 rounded-2xl p-5 border border-stone-200 dark:border-stone-800 shadow-xs">
          <div className="flex items-center justify-between text-stone-500 mb-2">
            <span className="text-xs font-medium">Livros Lidos</span>
            <BookmarkCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="font-serif text-2xl font-bold text-stone-900 dark:text-stone-100">
            {readBooks.length}
          </p>
          <span className="text-[11px] text-stone-400">
            {readBoth} lidos em conjunto
          </span>
        </div>

        {/* In Progress */}
        <div className="bg-white dark:bg-stone-900 rounded-2xl p-5 border border-stone-200 dark:border-stone-800 shadow-xs">
          <div className="flex items-center justify-between text-stone-500 mb-2">
            <span className="text-xs font-medium">Lendo Agora</span>
            <BookOpen className="w-4 h-4 text-amber-600" />
          </div>
          <p className="font-serif text-2xl font-bold text-stone-900 dark:text-stone-100">
            {readingBooks.length}
          </p>
          <span className="text-[11px] text-stone-400">
            {wishlistBooks.length} na lista de desejos
          </span>
        </div>

        {/* Total Pages Read */}
        <div className="bg-white dark:bg-stone-900 rounded-2xl p-5 border border-stone-200 dark:border-stone-800 shadow-xs">
          <div className="flex items-center justify-between text-stone-500 mb-2">
            <span className="text-xs font-medium">Páginas Lidas</span>
            <Layers className="w-4 h-4 text-purple-600" />
          </div>
          <p className="font-serif text-2xl font-bold text-stone-900 dark:text-stone-100">
            {totalPagesRead.toLocaleString('pt-BR')}
          </p>
          <span className="text-[11px] text-stone-400">
            Pelo casal no total
          </span>
        </div>

        {/* Total Books in Library */}
        <div className="bg-white dark:bg-stone-900 rounded-2xl p-5 border border-stone-200 dark:border-stone-800 shadow-xs">
          <div className="flex items-center justify-between text-stone-500 mb-2">
            <span className="text-xs font-medium">Acervo Total</span>
            <BarChart3 className="w-4 h-4 text-sky-600" />
          </div>
          <p className="font-serif text-2xl font-bold text-stone-900 dark:text-stone-100">
            {books.length}
          </p>
          <span className="text-[11px] text-stone-400">
            Cadastrados na estante
          </span>
        </div>
      </div>

      {/* Reader Comparison and Ratings */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Comparison card */}
        <div className="bg-white dark:bg-stone-900 rounded-2xl p-6 border border-stone-200 dark:border-stone-800 shadow-xs space-y-5">
          <h3 className="font-serif font-bold text-base text-stone-900 dark:text-stone-100 flex items-center gap-2">
            <Heart className="w-4 h-4 text-rose-500 fill-rose-500" />
            Quem Leu Mais? ({settings.eleName} vs {settings.elaName})
          </h3>

          <div className="space-y-4">
            {/* Ele */}
            <div>
              <div className="flex justify-between text-xs font-medium mb-1">
                <span className="text-amber-800 dark:text-amber-300 font-bold">{settings.eleName}</span>
                <span className="text-stone-600 dark:text-stone-400">{readByEle} livros lidos</span>
              </div>
              <div className="w-full bg-stone-100 dark:bg-stone-800 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-amber-600 h-2.5 rounded-full"
                  style={{ width: `${readBooks.length > 0 ? (readByEle / readBooks.length) * 100 : 0}%` }}
                />
              </div>
            </div>

            {/* Ela */}
            <div>
              <div className="flex justify-between text-xs font-medium mb-1">
                <span className="text-rose-800 dark:text-rose-300 font-bold">{settings.elaName}</span>
                <span className="text-stone-600 dark:text-stone-400">{readByEla} livros lidos</span>
              </div>
              <div className="w-full bg-stone-100 dark:bg-stone-800 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-rose-600 h-2.5 rounded-full"
                  style={{ width: `${readBooks.length > 0 ? (readByEla / readBooks.length) * 100 : 0}%` }}
                />
              </div>
            </div>
          </div>

          {/* Average ratings comparison */}
          <div className="pt-4 border-t border-stone-100 dark:border-stone-800 grid grid-cols-2 gap-4 text-center">
            <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-xl border border-amber-200/50 dark:border-amber-900/50">
              <span className="text-xs text-stone-500 block">Média de {settings.eleName}</span>
              <div className="flex items-center justify-center gap-1 mt-1 text-lg font-bold text-amber-700 dark:text-amber-400">
                <Star className="w-4 h-4 fill-amber-400 text-amber-500" />
                <span>{avgEleRating}</span>
              </div>
            </div>

            <div className="p-3 bg-rose-50 dark:bg-rose-950/30 rounded-xl border border-rose-200/50 dark:border-rose-900/50">
              <span className="text-xs text-stone-500 block">Média de {settings.elaName}</span>
              <div className="flex items-center justify-center gap-1 mt-1 text-lg font-bold text-rose-700 dark:text-rose-400">
                <Star className="w-4 h-4 fill-rose-400 text-rose-500" />
                <span>{avgElaRating}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Top rated books of the couple */}
        <div className="bg-white dark:bg-stone-900 rounded-2xl p-6 border border-stone-200 dark:border-stone-800 shadow-xs space-y-4">
          <h3 className="font-serif font-bold text-base text-stone-900 dark:text-stone-100 flex items-center gap-2">
            <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
            Livros Mais Amados do Casal
          </h3>

          {ratedBooks.length === 0 ? (
            <p className="text-xs text-stone-400 py-6 text-center">
              Avalie seus livros com estrelas para ver o ranking dos favoritos do casal!
            </p>
          ) : (
            <div className="space-y-2.5">
              {ratedBooks.map(({ book, avg }, idx) => (
                <div
                  key={book.id}
                  onClick={() => onSelectBook(book)}
                  className="flex items-center justify-between p-2 rounded-xl hover:bg-stone-50 dark:hover:bg-stone-800 cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="font-serif font-bold text-sm text-stone-400 w-4">
                      #{idx + 1}
                    </span>
                    <div className="w-8 h-11 bg-stone-200 dark:bg-stone-700 rounded overflow-hidden shrink-0">
                      {book.coverUrl ? (
                        <img src={book.coverUrl} alt={book.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[8px] text-stone-400">
                          {book.title.slice(0, 2)}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-stone-800 dark:text-stone-200 truncate max-w-[200px]">
                        {book.title}
                      </h4>
                      <p className="text-[10px] text-stone-400 truncate">{book.authors}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 font-bold text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/60 px-2 py-1 rounded-lg">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
                    <span>{avg.toFixed(1)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Top Genres tags */}
          {topGenres.length > 0 && (
            <div className="pt-3 border-t border-stone-100 dark:border-stone-800">
              <span className="text-[11px] font-semibold text-stone-400 block mb-2">Gêneros Favoritos:</span>
              <div className="flex flex-wrap gap-1.5">
                {topGenres.map(([genre, count]) => (
                  <span
                    key={genre}
                    className="text-[11px] px-2.5 py-1 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 font-medium"
                  >
                    {genre} ({count})
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
