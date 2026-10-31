import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft,
  Star, 
  Heart, 
  BookOpen, 
  Clock, 
  Plus, 
  Trash2, 
  RotateCcw,
  Edit3,
  Calendar,
  MessageSquareHeart,
  Info,
  CheckCircle2,
  Bookmark,
  ChevronDown
} from 'lucide-react';
import { 
  Book, 
  ReadingLog, 
  BookRecommendation, 
  ReadPeriod,
  ReaderId
} from '@/features/books';
import { 
  STATUS_LABELS, 
  STATUS_COLORS, 
  getReaderBadge, 
  calculateProgress, 
  MONTH_NAMES, 
  calculateReadCount 
} from '@/utils/bookHelpers';
import { LibrarySettings } from '@/features/settings';

interface BookDetailPageProps {
  book: Book;
  onBack: () => void;
  settings: LibrarySettings;
  activeReader: 'ele' | 'ela';
  onUpdateBook: (updatedBook: Book) => Promise<void>;
  onDeleteBook: (bookId: string) => Promise<void>;
}

export const BookDetailPage: React.FC<BookDetailPageProps> = ({
  book,
  onBack,
  settings,
  activeReader,
  onUpdateBook,
}) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'reviews' | 'progress' | 'recommendations' | 'info'>('reviews');

  // Reading session log inputs
  const [newLogPages, setNewLogPages] = useState<number>(10);
  const [newLogNotes, setNewLogNotes] = useState<string>('');

  // Recommendation input
  const [recMessage, setRecMessage] = useState<string>('');

  // Releitura period inputs
  const [readMonth, setReadMonth] = useState<number>(() => new Date().getMonth() + 1);
  const [readYear, setReadYear] = useState<number>(() => new Date().getFullYear());
  const [readReader, setReadReader] = useState<ReaderId>(activeReader);
  const [readNote, setReadNote] = useState<string>('');
  const [showAddPeriodForm, setShowAddPeriodForm] = useState<boolean>(false);

  // Toggle favorite
  const handleToggleFavorite = async () => {
    await onUpdateBook({
      ...book,
      favorite: !book.favorite,
    });
  };

  // Add reading session log
  const handleAddReadingLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLogPages || newLogPages <= 0) return;

    const previousLogged = (book.readingLogs || []).reduce((acc, log) => acc + log.pagesRead, 0);
    const totalPagesLogged = previousLogged + Number(newLogPages);

    const newLog: ReadingLog = {
      id: Date.now().toString(),
      date: new Date().toISOString().split('T')[0],
      pagesRead: Number(newLogPages),
      currentPage: book.pageCount ? Math.min(book.pageCount, totalPagesLogged) : totalPagesLogged,
      reader: activeReader,
      notes: newLogNotes.trim() || undefined,
    };

    const updatedLogs = [newLog, ...(book.readingLogs || [])];
    let nextStatus = book.status;
    if (book.pageCount && totalPagesLogged >= book.pageCount) {
      nextStatus = 'lido';
    } else if (book.status === 'quero_ler') {
      nextStatus = 'lendo';
    }

    await onUpdateBook({
      ...book,
      readingLogs: updatedLogs,
      currentPage: book.pageCount ? Math.min(book.pageCount, totalPagesLogged) : totalPagesLogged,
      status: nextStatus,
    });

    setNewLogNotes('');
  };

  // Delete reading session log
  const handleDeleteReadingLog = async (logId: string) => {
    const updatedLogs = (book.readingLogs || []).filter((l) => l.id !== logId);
    const totalPagesLogged = updatedLogs.reduce((acc, log) => acc + log.pagesRead, 0);

    await onUpdateBook({
      ...book,
      readingLogs: updatedLogs,
      currentPage: book.pageCount ? Math.min(book.pageCount, totalPagesLogged) : totalPagesLogged,
    });
  };

  // Add recommendation
  const handleAddRecommendation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recMessage.trim()) return;

    const newRec: BookRecommendation = {
      id: Date.now().toString(),
      from: activeReader,
      to: activeReader === 'ele' ? 'ela' : 'ele',
      message: recMessage.trim(),
      date: new Date().toISOString(),
    };

    const updatedRecs = [newRec, ...(book.recommendations || [])];
    await onUpdateBook({
      ...book,
      recommendations: updatedRecs,
    });
    setRecMessage('');
  };

  // Add read cycle / period
  const handleAddReadPeriod = async (e: React.FormEvent) => {
    e.preventDefault();
    const newPeriod: ReadPeriod = {
      id: Date.now().toString(),
      month: readMonth,
      year: readYear,
      reader: readReader,
      notes: readNote.trim() || undefined,
    };

    const updatedPeriods = [...(book.readPeriods || []), newPeriod];
    await onUpdateBook({
      ...book,
      readPeriods: updatedPeriods,
      readCount: updatedPeriods.length,
      status: book.status === 'quero_ler' ? 'lido' : book.status,
    });

    setReadNote('');
    setShowAddPeriodForm(false);
  };

  // Delete read period
  const handleDeleteReadPeriod = async (periodId: string) => {
    const updatedPeriods = (book.readPeriods || []).filter((p) => p.id !== periodId);
    await onUpdateBook({
      ...book,
      readPeriods: updatedPeriods,
      readCount: updatedPeriods.length > 0 ? updatedPeriods.length : (book.status === 'lido' ? 1 : 0),
    });
  };

  // Update notes/ratings
  const handleUpdateRating = async (reader: 'ele' | 'ela', starVal: number) => {
    const currentVal = book.ratings?.[reader] || 0;
    const newRatings = {
      ...(book.ratings || {}),
      [reader]: currentVal === starVal ? 0 : starVal,
    };
    await onUpdateBook({
      ...book,
      ratings: newRatings,
    });
  };

  const handleUpdateNotes = async (reader: 'ele' | 'ela', newNote: string) => {
    const newNotes = {
      ...(book.notes || {}),
      [reader]: newNote,
    };
    await onUpdateBook({
      ...book,
      notes: newNotes,
    });
  };

  const progressPercent = calculateProgress(book.currentPage, book.pageCount);
  const readCountValue = calculateReadCount(book);
  const readerBadge = getReaderBadge(book.assignedReader, settings.eleName, settings.elaName);
  const statusColor = STATUS_COLORS[book.status];

  return (
    <div className="w-full pb-20 animate-in fade-in duration-200">
      
      {/* Top Navigation & Action Bar */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-stone-200/80 dark:border-stone-800">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="p-2 sm:px-3 sm:py-2 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors flex items-center gap-1.5 font-medium text-xs sm:text-sm cursor-pointer shadow-2xs shrink-0"
            title="Voltar para a Estante"
          >
            <ArrowLeft className="w-4 h-4 text-amber-600" />
            <span className="hidden sm:inline">Voltar para a Estante</span>
            <span className="sm:hidden">Voltar</span>
          </button>
          
          <div className="min-w-0">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
              Visualização da Obra
            </span>
            <h1 className="font-serif text-lg sm:text-xl font-bold text-stone-900 dark:text-stone-100 truncate">
              {book.title}
            </h1>
          </div>
        </div>

        {/* Top Actions: Favorite & Link to Edit Page */}
        <div className="flex items-center gap-2 self-end sm:self-center">
          <button
            type="button"
            onClick={handleToggleFavorite}
            className={`p-2 sm:px-3 sm:py-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs ${
              book.favorite
                ? 'bg-amber-500 text-white border-amber-600'
                : 'bg-white dark:bg-stone-900 text-stone-600 dark:text-stone-400 border-stone-200 dark:border-stone-800 hover:bg-stone-50'
            }`}
            title="Favoritar livro"
          >
            <Star className={`w-4 h-4 ${book.favorite ? 'fill-white' : ''}`} />
            <span>{book.favorite ? 'Favorito' : 'Favoritar'}</span>
          </button>

          {/* Prominent Edit Button navigating to /books/:bookId/edit */}
          <button
            type="button"
            onClick={() => navigate(`/books/${book.id}/edit`)}
            className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-sm transition-colors"
            title="Editar informações da obra e trocar capa"
          >
            <Edit3 className="w-4 h-4" />
            <span>Editar Livro</span>
          </button>
        </div>
      </div>

      {/* Hero Book Section: Clean, focused solely on presentation */}
      <div className="bg-white dark:bg-stone-900 rounded-3xl p-5 sm:p-8 border border-stone-200/80 dark:border-stone-800 shadow-xs mb-6">
        <div className="flex flex-col md:flex-row gap-6 lg:gap-8 items-start">
          
          {/* Pristine Book Cover (No clutter or edit buttons) */}
          <div className="flex flex-col items-center gap-3 w-full sm:w-auto shrink-0">
            <div className="w-36 sm:w-44 aspect-2/3 rounded-2xl overflow-hidden bg-stone-100 dark:bg-stone-800 shadow-xl border border-stone-200/60 dark:border-stone-700/60 flex items-center justify-center">
              {book.coverUrl ? (
                <img
                  src={book.coverUrl}
                  alt={book.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center p-3 text-center text-stone-400">
                  <BookOpen className="w-10 h-10 mb-2 opacity-50" />
                  <span className="text-xs font-serif">{book.title.slice(0, 20)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Details & Badges */}
          <div className="flex-1 min-w-0 space-y-4">
            
            {/* Badges Bar */}
            <div className="flex flex-wrap items-center gap-2">
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${readerBadge.bg} ${readerBadge.text} ${readerBadge.border}`}>
                {readerBadge.label}
              </span>
              <span className={`text-xs font-bold px-2.5 py-1 rounded-lg border ${statusColor.bg} ${statusColor.text} ${statusColor.border}`}>
                {STATUS_LABELS[book.status]}
              </span>
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${
                book.owned === false
                  ? 'bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-300 border-violet-300 dark:border-violet-800'
                  : 'bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300 border-stone-200 dark:border-stone-700'
              }`}>
                {book.owned === false ? '🎁 Lista de Desejos' : '📦 Temos na Estante'}
              </span>

              {readCountValue > 0 && (
                <span className={`flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full border ${
                  readCountValue > 1
                    ? 'bg-purple-100 text-purple-800 dark:bg-purple-950/70 dark:text-purple-300 border-purple-300 dark:border-purple-800'
                    : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                }`}>
                  <RotateCcw className="w-3 h-3" />
                  <span>{readCountValue === 1 ? 'Lido 1x' : `Lido ${readCountValue}x (Releitura)`}</span>
                </span>
              )}
            </div>

            {/* Title & Authors */}
            <div>
              <h2 className="font-serif text-2xl sm:text-3xl font-bold text-stone-900 dark:text-stone-100 leading-tight">
                {book.title}
              </h2>
              <p className="text-sm sm:text-base text-stone-600 dark:text-stone-400 mt-1 font-medium">
                {book.authors || 'Autor Desconhecido'}
              </p>
            </div>

            {/* Quick Metadata Stats Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs pt-2">
              <div className="bg-stone-50 dark:bg-stone-800/60 p-2.5 rounded-xl border border-stone-200/60 dark:border-stone-700/60">
                <span className="text-[10px] text-stone-400 block font-medium">Páginas Lidas</span>
                <span className="font-semibold text-stone-800 dark:text-stone-200">
                  {book.currentPage || 0} de {book.pageCount || '?'}
                </span>
              </div>
              <div className="bg-stone-50 dark:bg-stone-800/60 p-2.5 rounded-xl border border-stone-200/60 dark:border-stone-700/60">
                <span className="text-[10px] text-stone-400 block font-medium">Progresso</span>
                <span className="font-semibold text-amber-600 dark:text-amber-400">
                  {progressPercent}%
                </span>
              </div>
              <div className="bg-stone-50 dark:bg-stone-800/60 p-2.5 rounded-xl border border-stone-200/60 dark:border-stone-700/60">
                <span className="text-[10px] text-stone-400 block font-medium">Editora</span>
                <span className="font-semibold text-stone-800 dark:text-stone-200 truncate block">
                  {book.publisher || 'Não informada'}
                </span>
              </div>
              <div className="bg-stone-50 dark:bg-stone-800/60 p-2.5 rounded-xl border border-stone-200/60 dark:border-stone-700/60">
                <span className="text-[10px] text-stone-400 block font-medium">Ano da Edição</span>
                <span className="font-semibold text-stone-800 dark:text-stone-200">
                  {book.publishedDate ? book.publishedDate.slice(0, 4) : '—'}
                </span>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Menu de Opções / Seletor de Seções (Zero Scroll Lateral) */}
      <div className="mb-6 space-y-3">
        {/* Mobile: Seletor Select Dropdown (100% da largura, zero scroll lateral) */}
        <div className="block sm:hidden">
          <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-1.5 flex items-center justify-between">
            <span>Seção do Livro</span>
            <span className="text-[10px] text-amber-700 dark:text-amber-400 font-semibold bg-amber-50 dark:bg-stone-800 px-2 py-0.5 rounded-full border border-amber-200/60 dark:border-stone-700">
              {activeTab === 'reviews' && '⭐ Avaliações'}
              {activeTab === 'progress' && '📖 Progresso'}
              {activeTab === 'recommendations' && '💬 Recomendações'}
              {activeTab === 'info' && 'ℹ️ Ficha Técnica'}
            </span>
          </label>
          <div className="relative">
            <select
              value={activeTab}
              onChange={(e) => setActiveTab(e.target.value as any)}
              className="w-full appearance-none px-4 py-3 text-xs font-bold rounded-2xl bg-white dark:bg-stone-900 border-2 border-amber-500/30 dark:border-amber-500/40 text-stone-900 dark:text-stone-100 shadow-xs focus:outline-hidden focus:ring-2 focus:ring-amber-500/50 cursor-pointer pr-10"
              aria-label="Escolher seção do livro"
            >
              <option value="reviews">⭐ Avaliações & Resenhas do Casal</option>
              <option value="progress">
                📖 Progresso & Releituras {book.readingLogs?.length ? `(${book.readingLogs.length})` : ''}
              </option>
              <option value="recommendations">
                💬 Recomendações {book.recommendations?.length ? `(${book.recommendations.length})` : ''}
              </option>
              <option value="info">ℹ️ Ficha Técnica & Sinopse Completa</option>
            </select>
            <ChevronDown className="w-4 h-4 text-amber-600 dark:text-amber-400 absolute right-3.5 top-3.5 pointer-events-none" />
          </div>

          {/* Mobile 2x2 grid buttons for 1-tap fast switching without lateral scrolling */}
          <div className="grid grid-cols-2 gap-1.5 mt-2">
            <button
              type="button"
              onClick={() => setActiveTab('reviews')}
              className={`py-2 px-2.5 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer border ${
                activeTab === 'reviews'
                  ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                  : 'bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-300 border-stone-200 dark:border-stone-800'
              }`}
            >
              <Star className="w-3 h-3" />
              <span>Avaliações</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('progress')}
              className={`py-2 px-2.5 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer border ${
                activeTab === 'progress'
                  ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                  : 'bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-300 border-stone-200 dark:border-stone-800'
              }`}
            >
              <BookOpen className="w-3 h-3" />
              <span>Progresso {book.readingLogs?.length ? `(${book.readingLogs.length})` : ''}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('recommendations')}
              className={`py-2 px-2.5 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer border ${
                activeTab === 'recommendations'
                  ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                  : 'bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-300 border-stone-200 dark:border-stone-800'
              }`}
            >
              <MessageSquareHeart className="w-3 h-3" />
              <span>Recomendações {book.recommendations?.length ? `(${book.recommendations.length})` : ''}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('info')}
              className={`py-2 px-2.5 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer border ${
                activeTab === 'info'
                  ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                  : 'bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-300 border-stone-200 dark:border-stone-800'
              }`}
            >
              <Info className="w-3 h-3" />
              <span>Ficha Técnica</span>
            </button>
          </div>
        </div>

        {/* Desktop & Tablet: Symmetrical 4-Column Segmented Menu (zero overflow, zero scroll) */}
        <div className="hidden sm:grid sm:grid-cols-4 gap-2 p-1.5 bg-stone-100 dark:bg-stone-850 rounded-2xl border border-stone-200/80 dark:border-stone-800">
          <button
            type="button"
            onClick={() => setActiveTab('reviews')}
            className={`py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === 'reviews'
                ? 'bg-white dark:bg-stone-900 text-amber-700 dark:text-amber-300 shadow-xs border border-stone-200/80 dark:border-stone-750'
                : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200 hover:bg-white/50 dark:hover:bg-stone-800/50'
            }`}
          >
            <Star className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">⭐ Avaliações & Resenhas</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('progress')}
            className={`py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === 'progress'
                ? 'bg-white dark:bg-stone-900 text-amber-700 dark:text-amber-300 shadow-xs border border-stone-200/80 dark:border-stone-750'
                : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200 hover:bg-white/50 dark:hover:bg-stone-800/50'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">📖 Progresso</span>
            {book.readingLogs?.length ? (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-bold">
                {book.readingLogs.length}
              </span>
            ) : null}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('recommendations')}
            className={`py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === 'recommendations'
                ? 'bg-white dark:bg-stone-900 text-rose-600 dark:text-rose-400 shadow-xs border border-stone-200/80 dark:border-stone-750'
                : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200 hover:bg-white/50 dark:hover:bg-stone-800/50'
            }`}
          >
            <MessageSquareHeart className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">💬 Recomendações</span>
            {book.recommendations?.length ? (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 font-bold">
                {book.recommendations.length}
              </span>
            ) : null}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('info')}
            className={`py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === 'info'
                ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-xs border border-stone-200/80 dark:border-stone-750'
                : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200 hover:bg-white/50 dark:hover:bg-stone-800/50'
            }`}
          >
            <Info className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">ℹ️ Ficha Técnica</span>
          </button>
        </div>
      </div>

      {/* Tab Panels */}
      <div>
        
        {/* TAB 1: AVALIAÇÕES */}
        {activeTab === 'reviews' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Avaliação Ele */}
            <div className="bg-white dark:bg-stone-900 rounded-3xl p-5 sm:p-6 border border-stone-200/80 dark:border-stone-800 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-serif text-base font-bold text-stone-800 dark:text-stone-200 flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-blue-500"></span>
                  <span>Avaliação de {settings.eleName}</span>
                </h3>
                <span className="text-xs text-stone-400">Ele</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-600 dark:text-stone-400 mb-1.5">
                  Nota (1 a 5 estrelas):
                </label>
                <div className="flex items-center gap-1.5">
                  {[1, 2, 3, 4, 5].map((starVal) => {
                    const currentVal = book.ratings?.ele || 0;
                    const isFilled = starVal <= currentVal;

                    return (
                      <button
                        key={starVal}
                        type="button"
                        onClick={() => handleUpdateRating('ele', starVal)}
                        className="p-1 hover:scale-110 transition-transform cursor-pointer"
                      >
                        <Star
                          className={`w-7 h-7 ${
                            isFilled
                              ? 'text-amber-400 fill-amber-400'
                              : 'text-stone-300 dark:text-stone-700'
                          }`}
                        />
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-600 dark:text-stone-400 mb-1.5">
                  Resenha e Impressões:
                </label>
                <textarea
                  rows={4}
                  defaultValue={book.notes?.ele || ''}
                  onBlur={(e) => handleUpdateNotes('ele', e.target.value)}
                  placeholder={`O que ${settings.eleName} achou deste livro...`}
                  className="w-full p-3.5 text-xs sm:text-sm rounded-2xl border border-stone-300 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-800/60 text-stone-900 dark:text-stone-100 focus:bg-white dark:focus:bg-stone-800 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600"
                />
              </div>
            </div>

            {/* Avaliação Ela */}
            <div className="bg-white dark:bg-stone-900 rounded-3xl p-5 sm:p-6 border border-stone-200/80 dark:border-stone-800 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-serif text-base font-bold text-stone-800 dark:text-stone-200 flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-rose-500"></span>
                  <span>Avaliação de {settings.elaName}</span>
                </h3>
                <span className="text-xs text-stone-400">Ela</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-600 dark:text-stone-400 mb-1.5">
                  Nota (1 a 5 estrelas):
                </label>
                <div className="flex items-center gap-1.5">
                  {[1, 2, 3, 4, 5].map((starVal) => {
                    const currentVal = book.ratings?.ela || 0;
                    const isFilled = starVal <= currentVal;

                    return (
                      <button
                        key={starVal}
                        type="button"
                        onClick={() => handleUpdateRating('ela', starVal)}
                        className="p-1 hover:scale-110 transition-transform cursor-pointer"
                      >
                        <Star
                          className={`w-7 h-7 ${
                            isFilled
                              ? 'text-amber-400 fill-amber-400'
                              : 'text-stone-300 dark:text-stone-700'
                          }`}
                        />
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-600 dark:text-stone-400 mb-1.5">
                  Resenha e Impressões:
                </label>
                <textarea
                  rows={4}
                  defaultValue={book.notes?.ela || ''}
                  onBlur={(e) => handleUpdateNotes('ela', e.target.value)}
                  placeholder={`O que ${settings.elaName} achou deste livro...`}
                  className="w-full p-3.5 text-xs sm:text-sm rounded-2xl border border-stone-300 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-800/60 text-stone-900 dark:text-stone-100 focus:bg-white dark:focus:bg-stone-800 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600"
                />
              </div>
            </div>

          </div>
        )}

        {/* TAB 2: PROGRESSO & RELEITURAS */}
        {activeTab === 'progress' && (
          <div className="space-y-6">
            
            {/* Visual Progress Bar Card */}
            <div className="bg-white dark:bg-stone-900 rounded-3xl p-5 sm:p-6 border border-stone-200/80 dark:border-stone-800 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-serif text-base font-bold text-stone-800 dark:text-stone-200">
                    Progresso da Leitura
                  </h3>
                  <p className="text-xs text-stone-400">
                    {book.currentPage || 0} de {book.pageCount || '?'} páginas lidas ({progressPercent}%)
                  </p>
                </div>
                <div className="text-right">
                  <span className="font-serif text-xl sm:text-2xl font-bold text-amber-600">
                    {progressPercent}%
                  </span>
                </div>
              </div>

              <div className="w-full h-3 bg-stone-100 dark:bg-stone-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 to-amber-600 rounded-full transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              {/* Quick Reading Session Logger */}
              <form onSubmit={handleAddReadingLog} className="pt-3 border-t border-stone-100 dark:border-stone-800 flex flex-col sm:flex-row gap-3 items-end">
                <div className="w-full sm:w-44">
                  <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                    Páginas Lidas Hoje:
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={newLogPages}
                    onChange={(e) => setNewLogPages(Number(e.target.value))}
                    className="w-full h-11 px-3.5 text-sm rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-800/60 text-stone-900 dark:text-stone-100"
                  />
                </div>

                <div className="w-full sm:flex-1">
                  <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                    Nota da Sessão (Opcional):
                  </label>
                  <input
                    type="text"
                    value={newLogNotes}
                    onChange={(e) => setNewLogNotes(e.target.value)}
                    placeholder="Ex: Capítulo 4 concluído..."
                    className="w-full h-11 px-3.5 text-sm rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-800/60 text-stone-900 dark:text-stone-100"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full sm:w-auto h-11 px-5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 shadow-2xs transition-colors shrink-0 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Registrar Sessão</span>
                </button>
              </form>
            </div>

            {/* Reading Sessions History */}
            <div className="bg-white dark:bg-stone-900 rounded-3xl p-5 sm:p-6 border border-stone-200/80 dark:border-stone-800 shadow-xs space-y-3">
              <h3 className="font-serif text-base font-bold text-stone-800 dark:text-stone-200">
                Histórico de Leituras Registradas
              </h3>

              {book.readingLogs && book.readingLogs.length > 0 ? (
                <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                  {book.readingLogs.map((log) => (
                    <div
                      key={log.id}
                      className="p-3 bg-stone-50 dark:bg-stone-800/50 rounded-2xl border border-stone-200/60 dark:border-stone-800 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-stone-400 text-[11px]">{log.date}</span>
                        <span className="font-semibold text-amber-700 dark:text-amber-400">
                          +{log.pagesRead} páginas
                        </span>
                        {log.notes && (
                          <span className="text-stone-600 dark:text-stone-400 italic">
                            "{log.notes}"
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteReadingLog(log.id)}
                        className="text-stone-400 hover:text-rose-500 p-1"
                        title="Excluir este registro"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-stone-400 py-4 text-center">
                  Nenhuma sessão registrada ainda. Registre acima suas páginas lidas!
                </p>
              )}
            </div>

            {/* Releituras / Ciclos de Leitura */}
            <div className="bg-white dark:bg-stone-900 rounded-3xl p-5 sm:p-6 border border-stone-200/80 dark:border-stone-800 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-serif text-base font-bold text-stone-800 dark:text-stone-200">
                    Ciclos de Leitura & Releituras
                  </h3>
                  <p className="text-xs text-stone-400">
                    Histórico de conclusões da leitura
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddPeriodForm(!showAddPeriodForm)}
                  className="px-3 py-1.5 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800 rounded-xl text-xs font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Nova Releitura</span>
                </button>
              </div>

              {showAddPeriodForm && (
                <form onSubmit={handleAddReadPeriod} className="p-4 bg-stone-50 dark:bg-stone-800/60 rounded-2xl border border-stone-200 dark:border-stone-700 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">Mês:</label>
                      <select
                        value={readMonth}
                        onChange={(e) => setReadMonth(Number(e.target.value))}
                        className="w-full h-10 px-3 text-xs rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800"
                      >
                        {MONTH_NAMES.map((name, idx) => (
                          <option key={name} value={idx + 1}>{name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">Ano:</label>
                      <input
                        type="number"
                        value={readYear}
                        onChange={(e) => setReadYear(Number(e.target.value))}
                        className="w-full h-10 px-3 text-xs rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">Quem leu:</label>
                      <select
                        value={readReader}
                        onChange={(e) => setReadReader(e.target.value as ReaderId)}
                        className="w-full h-10 px-3 text-xs rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800"
                      >
                        <option value="ele">{settings.eleName} (Ele)</option>
                        <option value="ela">{settings.elaName} (Ela)</option>
                        <option value="ambos">Ambos</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">Nota da Releitura:</label>
                    <input
                      type="text"
                      value={readNote}
                      onChange={(e) => setReadNote(e.target.value)}
                      placeholder="Ex: Segunda leitura para o clube do livro"
                      className="w-full h-10 px-3 text-xs rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800"
                    />
                  </div>

                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowAddPeriodForm(false)}
                      className="px-3 py-1.5 text-xs text-stone-500 hover:text-stone-700"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold"
                    >
                      Salvar Leitura
                    </button>
                  </div>
                </form>
              )}

              {book.readPeriods && book.readPeriods.length > 0 ? (
                <div className="space-y-2">
                  {book.readPeriods.map((period) => (
                    <div
                      key={period.id}
                      className="p-3 bg-stone-50 dark:bg-stone-800/40 rounded-2xl border border-stone-200/60 dark:border-stone-800 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-semibold text-stone-800 dark:text-stone-200">
                          {MONTH_NAMES[period.month - 1]} de {period.year}
                        </span>
                        <span className="text-[11px] text-stone-500">
                          ({period.reader === 'ele' ? settings.eleName : period.reader === 'ela' ? settings.elaName : 'Ambos'})
                        </span>
                        {period.notes && (
                          <span className="text-stone-400 italic">"{period.notes}"</span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteReadPeriod(period.id)}
                        className="text-stone-400 hover:text-rose-500 p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-stone-400 py-3 text-center">
                  Nenhum ciclo de leitura registrado ainda.
                </p>
              )}
            </div>

          </div>
        )}

        {/* TAB 3: RECOMENDAÇÕES */}
        {activeTab === 'recommendations' && (
          <div className="bg-white dark:bg-stone-900 rounded-3xl p-5 sm:p-6 border border-stone-200/80 dark:border-stone-800 shadow-xs space-y-4">
            <h3 className="font-serif text-base font-bold text-stone-800 dark:text-stone-200">
              Recomendações entre o Casal
            </h3>

            {/* Recommendation Form */}
            <form onSubmit={handleAddRecommendation} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  Escrever recomendação de {activeReader === 'ele' ? settings.eleName : settings.elaName} para {activeReader === 'ele' ? settings.elaName : settings.eleName}:
                </label>
                <textarea
                  rows={3}
                  value={recMessage}
                  onChange={(e) => setRecMessage(e.target.value)}
                  placeholder="Por que você recomenda este livro? Diga o que achou de especial..."
                  className="w-full p-3.5 text-xs sm:text-sm rounded-2xl border border-stone-300 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-800/60 text-stone-900 dark:text-stone-100 focus:bg-white dark:focus:bg-stone-800"
                />
              </div>
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={!recMessage.trim()}
                  className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-2xs cursor-pointer"
                >
                  <MessageSquareHeart className="w-4 h-4" />
                  <span>Enviar Recomendação</span>
                </button>
              </div>
            </form>

            {/* Recommendations List */}
            <div className="pt-4 border-t border-stone-100 dark:border-stone-800 space-y-3">
              {book.recommendations && book.recommendations.length > 0 ? (
                book.recommendations.map((rec) => (
                  <div
                    key={rec.id}
                    className="p-4 bg-rose-50/60 dark:bg-rose-950/30 border border-rose-200/60 dark:border-rose-900/40 rounded-2xl text-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-rose-800 dark:text-rose-300">
                        De {rec.from === 'ele' ? settings.eleName : settings.elaName} para {rec.to === 'ele' ? settings.eleName : settings.elaName}
                      </span>
                      <span className="text-[10px] text-stone-400">
                        {rec.date ? new Date(rec.date).toLocaleDateString() : ''}
                      </span>
                    </div>
                    <p className="text-stone-700 dark:text-stone-300 leading-relaxed">
                      "{rec.message}"
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-xs text-stone-400 py-6 text-center">
                  Ainda não há recomendações registradas para este livro.
                </p>
              )}
            </div>
          </div>
        )}

        {/* TAB 4: FICHA TÉCNICA & SINOPSE (Pura Leitura) */}
        {activeTab === 'info' && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-stone-900 rounded-3xl p-5 sm:p-7 border border-stone-200/80 dark:border-stone-800 shadow-xs space-y-5">
              <h3 className="font-serif text-base font-bold text-stone-800 dark:text-stone-200">
                Ficha Técnica da Edição
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
                <div className="p-3 bg-stone-50 dark:bg-stone-800/50 rounded-2xl border border-stone-200/60 dark:border-stone-800">
                  <span className="text-[11px] text-stone-400 block font-medium">Editora</span>
                  <span className="font-semibold text-stone-800 dark:text-stone-200 text-sm mt-0.5 block">
                    {book.publisher || 'Não informada'}
                  </span>
                </div>

                <div className="p-3 bg-stone-50 dark:bg-stone-800/50 rounded-2xl border border-stone-200/60 dark:border-stone-800">
                  <span className="text-[11px] text-stone-400 block font-medium">Ano / Data de Publicação</span>
                  <span className="font-semibold text-stone-800 dark:text-stone-200 text-sm mt-0.5 block">
                    {book.publishedDate || 'Não informado'}
                  </span>
                </div>

                <div className="p-3 bg-stone-50 dark:bg-stone-800/50 rounded-2xl border border-stone-200/60 dark:border-stone-800">
                  <span className="text-[11px] text-stone-400 block font-medium">Total de Páginas</span>
                  <span className="font-semibold text-stone-800 dark:text-stone-200 text-sm mt-0.5 block">
                    {book.pageCount ? `${book.pageCount} páginas` : 'Não informado'}
                  </span>
                </div>

                <div className="p-3 bg-stone-50 dark:bg-stone-800/50 rounded-2xl border border-stone-200/60 dark:border-stone-800 sm:col-span-2 md:col-span-1">
                  <span className="text-[11px] text-stone-400 block font-medium">Código ISBN</span>
                  <span className="font-mono text-stone-800 dark:text-stone-200 text-xs mt-0.5 block">
                    {book.isbn || 'Não cadastrado'}
                  </span>
                </div>

                <div className="p-3 bg-stone-50 dark:bg-stone-800/50 rounded-2xl border border-stone-200/60 dark:border-stone-800 sm:col-span-2">
                  <span className="text-[11px] text-stone-400 block font-medium">Gênero / Categorias</span>
                  <span className="font-semibold text-stone-800 dark:text-stone-200 text-xs mt-0.5 block">
                    {Array.isArray(book.categories) ? book.categories.join(', ') : (book.categories || 'Não especificadas')}
                  </span>
                </div>
              </div>

              {/* Synopsis */}
              <div className="pt-3 border-t border-stone-100 dark:border-stone-800 space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-stone-400">
                  Sinopse da História
                </h4>
                {book.description ? (
                  <p className="text-xs sm:text-sm text-stone-700 dark:text-stone-300 leading-relaxed whitespace-pre-line bg-stone-50/50 dark:bg-stone-800/30 p-4 rounded-2xl border border-stone-200/50 dark:border-stone-800">
                    {book.description}
                  </p>
                ) : (
                  <p className="text-xs text-stone-400 italic py-2">
                    Nenhuma sinopse cadastrada para este livro.
                  </p>
                )}
              </div>
            </div>

            {/* Link to Edit Page */}
            <div className="bg-amber-50/60 dark:bg-amber-950/20 rounded-3xl p-5 border border-amber-200/60 dark:border-amber-800/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h4 className="text-xs font-bold text-amber-900 dark:text-amber-200">
                  Precisa alterar a capa, o título ou os dados da edição?
                </h4>
                <p className="text-[11px] text-amber-700/80 dark:text-amber-300/80 mt-0.5">
                  Todas as opções de edição e busca de capa estão na rota dedicada de edição.
                </p>
              </div>
              <button
                type="button"
                onClick={() => navigate(`/books/${book.id}/edit`)}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-2xs shrink-0 cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Ir para Edição de Livro</span>
              </button>
            </div>
          </div>
        )}

      </div>

    </div>
  );
};
