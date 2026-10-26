import React, { useState, useEffect } from 'react';
import { 
  X, 
  Star, 
  Heart, 
  BookOpen, 
  Clock, 
  Calendar, 
  Plus, 
  Trash2, 
  MessageSquareHeart, 
  CheckCircle2, 
  ChevronRight,
  Send,
  Edit2,
  Bookmark,
  RefreshCw,
  Upload,
  Sparkles,
  RotateCcw
} from 'lucide-react';
import { Book, BookStatus, ReaderId, LibrarySettings, ReadingLog, BookRecommendation, ReadPeriod } from '../types/book';
import { STATUS_LABELS, STATUS_COLORS, getReaderBadge, calculateProgress, MONTH_NAMES, formatReadPeriod, calculateReadCount } from '../utils/bookHelpers';
import { fetchCoverForBook } from '../services/googleBooks';
import { compressImageFile } from '../utils/imageCompressor';
import { CoverPickerModal } from './CoverPickerModal';


interface BookDetailModalProps {
  book: Book | null;
  isOpen: boolean;
  onClose: () => void;
  settings: LibrarySettings;
  activeReader: 'ele' | 'ela';
  onUpdateBook: (updatedBook: Book) => Promise<void>;
  onDeleteBook: (bookId: string) => Promise<void>;
}

export const BookDetailModal: React.FC<BookDetailModalProps> = ({
  book,
  isOpen,
  onClose,
  settings,
  activeReader,
  onUpdateBook,
  onDeleteBook,
}) => {
  if (!isOpen || !book) return null;

  const [activeTab, setActiveTab] = useState<'reviews' | 'progress' | 'recommendations' | 'info'>('reviews');

  // Rating and Notes draft state
  const [eleRating, setEleRating] = useState<number>(book.ratings?.ele || 0);
  const [elaRating, setElaRating] = useState<number>(book.ratings?.ela || 0);
  const [eleNote, setEleNote] = useState<string>(book.notes?.ele || '');
  const [elaNote, setElaNote] = useState<string>(book.notes?.ela || '');

  // Progress draft state
  const [currentPage, setCurrentPage] = useState<number>(book.currentPage || 0);
  const [newLogPages, setNewLogPages] = useState<number>(10);
  const [newLogNotes, setNewLogNotes] = useState<string>('');

  // Recommendation draft state
  const [recMessage, setRecMessage] = useState<string>('');

  // Re-readings / Read history draft state
  const [readMonth, setReadMonth] = useState<number>(() => new Date().getMonth() + 1);
  const [readYear, setReadYear] = useState<number>(() => new Date().getFullYear());
  const [readReader, setReadReader] = useState<ReaderId>(activeReader);
  const [readNote, setReadNote] = useState<string>('');
  const [showAddPeriodForm, setShowAddPeriodForm] = useState<boolean>(false);

  const [isSaving, setIsSaving] = useState(false);
  const [isFetchingCover, setIsFetchingCover] = useState(false);
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [isCoverPickerOpen, setIsCoverPickerOpen] = useState(false);
  const detailCoverInputRef = React.useRef<HTMLInputElement>(null);

  const handleRefreshCover = async () => {
    setIsFetchingCover(true);
    try {
      const newCover = await fetchCoverForBook(book.title, book.authors, book.isbn);
      if (newCover) {
        await onUpdateBook({
          ...book,
          coverUrl: newCover,
          updatedAt: new Date().toISOString(),
        });
      }
    } finally {
      setIsFetchingCover(false);
    }
  };

  const handleUploadCover = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingCover(true);
    try {
      const result = await compressImageFile(file, {
        maxWidth: 600,
        maxHeight: 900,
        quality: 0.82,
      });

      await onUpdateBook({
        ...book,
        coverUrl: result.dataUrl,
        updatedAt: new Date().toISOString(),
      });
    } catch (err: any) {
      console.error('Falha ao atualizar capa:', err);
    } finally {
      setIsUploadingCover(false);
      if (e.target) {
        e.target.value = '';
      }
    }
  };


  const partnerName = activeReader === 'ele' ? settings.elaName : settings.eleName;
  const activeReaderName = activeReader === 'ele' ? settings.eleName : settings.elaName;
  const progress = calculateProgress(currentPage, book.pageCount);
  const readerBadge = getReaderBadge(book.assignedReader, settings.eleName, settings.elaName);
  const statusColor = STATUS_COLORS[book.status] || STATUS_COLORS.quero_ler;

  // Save Ratings and Notes
  const handleSaveReviews = async () => {
    setIsSaving(true);
    try {
      const updated: Book = {
        ...book,
        ratings: {
          ...book.ratings,
          ele: eleRating,
          ela: elaRating,
        },
        notes: {
          ...book.notes,
          ele: eleNote.trim(),
          ela: elaNote.trim(),
        },
        updatedAt: new Date().toISOString(),
      };
      await onUpdateBook(updated);
    } finally {
      setIsSaving(false);
    }
  };

  // Quick Page Update
  const handleUpdatePage = async (newPage: number) => {
    const validPage = Math.max(0, Math.min(book.pageCount || 99999, newPage));
    setCurrentPage(validPage);
    setIsSaving(true);
    try {
      const isNowFinished = book.pageCount && validPage >= book.pageCount;
      const updated: Book = {
        ...book,
        currentPage: validPage,
        status: isNowFinished ? 'lido' : book.status === 'quero_ler' ? 'lendo' : book.status,
        dateFinished: isNowFinished ? (book.dateFinished || new Date().toISOString().split('T')[0]) : book.dateFinished,
        updatedAt: new Date().toISOString(),
      };
      await onUpdateBook(updated);
    } finally {
      setIsSaving(false);
    }
  };

  // Add Reading Session Log
  const handleAddReadingLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newLogPages <= 0) return;

    const newCurrent = Math.min(book.pageCount || 99999, currentPage + newLogPages);
    setCurrentPage(newCurrent);

    const newLog: ReadingLog = {
      id: Math.random().toString(36).substring(2, 9),
      reader: activeReader,
      date: new Date().toLocaleDateString('pt-BR'),
      pagesRead: newLogPages,
      currentPage: newCurrent,
      notes: newLogNotes.trim(),
    };

    setIsSaving(true);
    try {
      const isNowFinished = book.pageCount && newCurrent >= book.pageCount;
      const updated: Book = {
        ...book,
        currentPage: newCurrent,
        readingLogs: [newLog, ...(book.readingLogs || [])],
        status: isNowFinished ? 'lido' : book.status === 'quero_ler' ? 'lendo' : book.status,
        dateFinished: isNowFinished ? (book.dateFinished || new Date().toISOString().split('T')[0]) : book.dateFinished,
        updatedAt: new Date().toISOString(),
      };
      await onUpdateBook(updated);
      setNewLogNotes('');
    } finally {
      setIsSaving(false);
    }
  };

  // Add Couple Recommendation
  const handleSendRecommendation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recMessage.trim()) return;

    const newRec: BookRecommendation = {
      id: Math.random().toString(36).substring(2, 9),
      from: activeReader,
      to: activeReader === 'ele' ? 'ela' : 'ele',
      message: recMessage.trim(),
      date: new Date().toLocaleDateString('pt-BR'),
      readStatus: 'pendente',
    };

    setIsSaving(true);
    try {
      const updated: Book = {
        ...book,
        recommendations: [newRec, ...(book.recommendations || [])],
        updatedAt: new Date().toISOString(),
      };
      await onUpdateBook(updated);
      setRecMessage('');
    } finally {
      setIsSaving(false);
    }
  };

  const handleStatusChange = async (newStatus: BookStatus) => {
    setIsSaving(true);
    try {
      const updated: Book = {
        ...book,
        status: newStatus,
        dateStarted: newStatus === 'lendo' && !book.dateStarted ? new Date().toISOString().split('T')[0] : book.dateStarted,
        dateFinished: newStatus === 'lido' && !book.dateFinished ? new Date().toISOString().split('T')[0] : book.dateFinished,
        updatedAt: new Date().toISOString(),
      };
      await onUpdateBook(updated);
    } finally {
      setIsSaving(false);
    }
  };

  const handleReaderChange = async (newReader: ReaderId) => {
    setIsSaving(true);
    try {
      const updated: Book = {
        ...book,
        assignedReader: newReader,
        updatedAt: new Date().toISOString(),
      };
      await onUpdateBook(updated);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddReadPeriod = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!readMonth || !readYear) return;

    setIsSaving(true);
    try {
      const newPeriod: ReadPeriod = {
        id: `read_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        year: Number(readYear),
        month: Number(readMonth),
        reader: readReader,
        notes: readNote.trim() || undefined,
      };

      const existingPeriods = book.readPeriods || [];
      const updatedPeriods = [...existingPeriods, newPeriod].sort((a, b) => {
        if (b.year !== a.year) return b.year - a.year;
        return b.month - a.month;
      });

      const updated: Book = {
        ...book,
        readPeriods: updatedPeriods,
        readCount: updatedPeriods.length,
        status: book.status === 'quero_ler' ? 'lido' : book.status,
        updatedAt: new Date().toISOString(),
      };

      await onUpdateBook(updated);
      setReadNote('');
      setShowAddPeriodForm(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteReadPeriod = async (periodId: string) => {
    setIsSaving(true);
    try {
      const updatedPeriods = (book.readPeriods || []).filter((p) => p.id !== periodId);
      const updated: Book = {
        ...book,
        readPeriods: updatedPeriods,
        readCount: updatedPeriods.length > 0 ? updatedPeriods.length : (book.status === 'lido' ? 1 : 0),
        updatedAt: new Date().toISOString(),
      };
      await onUpdateBook(updated);
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-stone-900 rounded-3xl w-full max-w-3xl max-h-[92vh] shadow-2xl border border-stone-200 dark:border-stone-800 flex flex-col overflow-hidden"
      >
        
        {/* Top Header */}
        <div className="p-4 sm:p-6 border-b border-stone-100 dark:border-stone-800 flex items-start justify-between gap-4 bg-amber-50/40 dark:bg-stone-900">
          <div className="flex gap-4 min-w-0">
            {/* Book Cover & Refresh/Upload Actions */}
            <div className="flex flex-col items-center gap-1.5 shrink-0">
              <div className="w-16 sm:w-20 aspect-2/3 rounded-lg overflow-hidden bg-stone-200 dark:bg-stone-800 shadow-md relative group">
                {book.coverUrl ? (
                  <img src={book.coverUrl} alt={book.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[10px] text-stone-400 font-serif">
                    {book.title.slice(0, 3)}
                  </div>
                )}
                {/* Hover overlay button to upload */}
                <button
                  type="button"
                  onClick={() => detailCoverInputRef.current?.click()}
                  className="absolute inset-0 bg-black/60 text-white opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center gap-1 transition-opacity text-[10px] font-medium p-1 text-center"
                  title="Trocar capa por foto do dispositivo"
                >
                  <Upload className="w-4 h-4" />
                  <span>Trocar Foto</span>
                </button>
              </div>

              <input
                ref={detailCoverInputRef}
                type="file"
                accept="image/*"
                onChange={handleUploadCover}
                className="hidden"
              />

              <div className="flex flex-col gap-1.5 w-full text-center">
                <button
                  type="button"
                  onClick={() => setIsCoverPickerOpen(true)}
                  className="text-[10px] text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-950/60 bg-amber-50 dark:bg-amber-950/30 px-2 py-1 rounded-md flex items-center justify-center gap-1 transition-colors font-medium border border-amber-300/60 dark:border-amber-800/60 shadow-xs"
                  title="Pesquisar e escolher entre capas de Open Library, Google Livros, Brasil API e Gutenberg"
                >
                  <Sparkles className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                  <span>Escolher Capa (APIs)</span>
                </button>

                <div className="grid grid-cols-2 gap-1">
                  <button
                    type="button"
                    onClick={() => detailCoverInputRef.current?.click()}
                    disabled={isUploadingCover}
                    className="text-[10px] text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 bg-stone-50 dark:bg-stone-800/50 px-1.5 py-0.5 rounded-md flex items-center justify-center gap-1 transition-colors font-medium border border-stone-200 dark:border-stone-700/60"
                    title="Enviar foto salva do seu computador ou celular"
                  >
                    <Upload className={`w-2.5 h-2.5 ${isUploadingCover ? 'animate-bounce' : ''}`} />
                    <span>{isUploadingCover ? '...' : 'Foto'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleRefreshCover}
                    disabled={isFetchingCover}
                    className="text-[10px] text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 bg-stone-50 dark:bg-stone-800/50 px-1.5 py-0.5 rounded-md flex items-center justify-center gap-1 transition-colors font-medium border border-stone-200 dark:border-stone-700/60"
                    title="Buscar capa rápida automática"
                  >
                    <RefreshCw className={`w-2.5 h-2.5 ${isFetchingCover ? 'animate-spin text-amber-600' : ''}`} />
                    <span>{isFetchingCover ? '...' : 'Auto'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Title & Metadata */}
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${readerBadge.bg} ${readerBadge.text} ${readerBadge.border}`}>
                  {readerBadge.label}
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${statusColor.bg} ${statusColor.text} ${statusColor.border}`}>
                  {STATUS_LABELS[book.status]}
                </span>
                {calculateReadCount(book) > 0 && (
                  <span className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    calculateReadCount(book) > 1
                      ? 'bg-purple-100 text-purple-800 dark:bg-purple-950/70 dark:text-purple-300 border-purple-300 dark:border-purple-800'
                      : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                  }`}>
                    <RotateCcw className="w-2.5 h-2.5 text-purple-600 dark:text-purple-400" />
                    <span>{calculateReadCount(book) === 1 ? 'Lido 1x' : `Lido ${calculateReadCount(book)}x (Releitura)`}</span>
                  </span>
                )}
                {book.favorite && (
                  <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                    <Star className="w-3 h-3 fill-amber-400 text-amber-500" />
                    Favorito
                  </span>
                )}
              </div>

              <h2 className="font-serif text-lg sm:text-xl font-bold text-stone-900 dark:text-stone-100 leading-snug line-clamp-2">
                {book.title}
              </h2>
              <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400 mt-0.5">
                {book.authors || 'Autor Desconhecido'}
              </p>

              {/* Status and Reader Switchers */}
              <div className="flex flex-wrap items-center gap-2 mt-2 pt-2 border-t border-stone-200/60 dark:border-stone-800 text-xs">
                <div className="flex items-center gap-1">
                  <span className="text-stone-400 text-[11px]">Status:</span>
                  <select
                    value={book.status}
                    onChange={(e) => handleStatusChange(e.target.value as BookStatus)}
                    className="text-xs rounded-lg px-2 py-1 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 text-stone-800 dark:text-stone-200 font-medium cursor-pointer"
                  >
                    <option value="quero_ler">Quero Ler</option>
                    <option value="lendo">Lendo</option>
                    <option value="lido">Lido</option>
                    <option value="pausado">Pausado</option>
                    <option value="abandonado">Abandonado</option>
                  </select>
                </div>

                <div className="flex items-center gap-1">
                  <span className="text-stone-400 text-[11px]">Leitor:</span>
                  <select
                    value={book.assignedReader}
                    onChange={(e) => handleReaderChange(e.target.value as ReaderId)}
                    className="text-xs rounded-lg px-2 py-1 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 text-stone-800 dark:text-stone-200 font-medium cursor-pointer"
                  >
                    <option value="ele">{settings.eleName}</option>
                    <option value="ela">{settings.elaName}</option>
                    <option value="ambos">Ambos</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 rounded-full hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs - Modern Segmented Control with zero horizontal scroll */}
        <div className="px-4 sm:px-6 pt-3 pb-2 border-b border-stone-200/60 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-900/60">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-1 bg-stone-200/70 dark:bg-stone-800 rounded-2xl border border-stone-300/60 dark:border-stone-700 shadow-inner">
            <button
              type="button"
              onClick={() => setActiveTab('reviews')}
              className={`py-2 px-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'reviews'
                  ? 'bg-white dark:bg-stone-900 text-amber-700 dark:text-amber-300 shadow-xs'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-white/40'
              }`}
            >
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500 shrink-0" />
              <span className="truncate">Notas & Avaliações</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('progress')}
              className={`py-2 px-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'progress'
                  ? 'bg-white dark:bg-stone-900 text-amber-700 dark:text-amber-300 shadow-xs'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-white/40'
              }`}
            >
              <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
              <span className="truncate">Progresso</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold shrink-0 ${
                activeTab === 'progress'
                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                  : 'bg-stone-300/80 dark:bg-stone-700 text-stone-700 dark:text-stone-300'
              }`}>
                {progress}%
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('recommendations')}
              className={`py-2 px-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'recommendations'
                  ? 'bg-white dark:bg-stone-900 text-rose-600 dark:text-rose-400 shadow-xs'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-white/40'
              }`}
            >
              <Heart className="w-3.5 h-3.5 fill-rose-500 text-rose-500 shrink-0" />
              <span className="truncate">Recomendações</span>
              {(book.recommendations?.length || 0) > 0 && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold shrink-0 ${
                  activeTab === 'recommendations'
                    ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                    : 'bg-stone-300/80 dark:bg-stone-700 text-stone-700 dark:text-stone-300'
                }`}>
                  {book.recommendations?.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('info')}
              className={`py-2 px-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'info'
                  ? 'bg-white dark:bg-stone-900 text-amber-700 dark:text-amber-300 shadow-xs'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-white/40'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
              <span className="truncate">Sinopse & Detalhes</span>
            </button>
          </div>
        </div>

        {/* Tab Content Area */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-6">
          
          {/* TAB 1: REVIEWS & INDIVIDUAL NOTES */}
          {activeTab === 'reviews' && (
            <div className="space-y-6">
              <div className="bg-amber-50/50 dark:bg-stone-800/40 p-4 rounded-2xl border border-amber-200/40 dark:border-stone-700/60 text-xs text-stone-600 dark:text-stone-300">
                Cada um de vocês pode dar a sua nota pessoal (de 1 a 5 estrelas) e escrever suas anotações, impressões e trechos favoritos individualmente.
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* ELE (Luan) Review Box */}
                <div className="bg-amber-50/30 dark:bg-stone-800/40 p-5 rounded-2xl border border-amber-200/80 dark:border-stone-700 space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-amber-200/60 dark:border-stone-700">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-amber-500" />
                      <h4 className="font-serif font-bold text-sm text-amber-900 dark:text-amber-300">
                        {settings.eleName}
                      </h4>
                    </div>
                    {/* Star Picker */}
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setEleRating(eleRating === star ? 0 : star)}
                          className="p-1 hover:scale-125 transition-transform"
                          title={`${star} estrelas`}
                        >
                          <Star
                            className={`w-4 h-4 ${
                              star <= eleRating
                                ? 'fill-amber-400 text-amber-500'
                                : 'text-stone-300 dark:text-stone-600'
                            }`}
                          />
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                      Anotações e Resenha de {settings.eleName}
                    </label>
                    <textarea
                      rows={5}
                      value={eleNote}
                      onChange={(e) => setEleNote(e.target.value)}
                      placeholder={`O que ${settings.eleName} achou do livro, personagens marcantes, trechos favoritos...`}
                      className="w-full p-3 text-xs rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 placeholder:text-stone-400 focus:ring-2 focus:ring-amber-500/50"
                    />
                  </div>
                </div>

                {/* ELA (Esposa) Review Box */}
                <div className="bg-rose-50/30 dark:bg-stone-800/40 p-5 rounded-2xl border border-rose-200/80 dark:border-stone-700 space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-rose-200/60 dark:border-stone-700">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-rose-500" />
                      <h4 className="font-serif font-bold text-sm text-rose-900 dark:text-rose-300">
                        {settings.elaName}
                      </h4>
                    </div>
                    {/* Star Picker */}
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setElaRating(elaRating === star ? 0 : star)}
                          className="p-1 hover:scale-125 transition-transform"
                          title={`${star} estrelas`}
                        >
                          <Star
                            className={`w-4 h-4 ${
                              star <= elaRating
                                ? 'fill-rose-400 text-rose-500'
                                : 'text-stone-300 dark:text-stone-600'
                            }`}
                          />
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                      Anotações e Resenha de {settings.elaName}
                    </label>
                    <textarea
                      rows={5}
                      value={elaNote}
                      onChange={(e) => setElaNote(e.target.value)}
                      placeholder={`O que ${settings.elaName} achou da leitura, sentimentos, reflexões...`}
                      className="w-full p-3 text-xs rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 placeholder:text-stone-400 focus:ring-2 focus:ring-rose-500/50"
                    />
                  </div>
                </div>
              </div>

              {/* Save Button */}
              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={handleSaveReviews}
                  className="px-6 py-2.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-sm transition-all"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isSaving ? 'Salvando...' : 'Salvar Avaliações e Anotações'}</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: PROGRESS & READING SESSIONS */}
          {activeTab === 'progress' && (
            <div className="space-y-6">
              {/* Progress Slider Card */}
              <div className="bg-stone-50 dark:bg-stone-800/60 p-5 rounded-2xl border border-stone-200 dark:border-stone-700 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-serif font-bold text-sm text-stone-900 dark:text-stone-100">
                    Progresso Atual
                  </span>
                  <span className="text-sm font-bold text-amber-600 dark:text-amber-400">
                    {progress}% ({currentPage} de {book.pageCount || '?'} páginas)
                  </span>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-stone-200 dark:bg-stone-700 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="bg-amber-600 dark:bg-amber-500 h-2.5 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>

                {/* Quick Page Jump Buttons */}
                <div className="flex flex-wrap items-center gap-2 pt-2">
                  <span className="text-xs text-stone-500">Ajuste rápido:</span>
                  <button
                    type="button"
                    onClick={() => handleUpdatePage(currentPage - 10)}
                    className="px-2.5 py-1 text-xs rounded-lg bg-white dark:bg-stone-700 border border-stone-300 dark:border-stone-600 font-semibold"
                  >
                    -10 pág.
                  </button>
                  <button
                    type="button"
                    onClick={() => handleUpdatePage(currentPage - 1)}
                    className="px-2.5 py-1 text-xs rounded-lg bg-white dark:bg-stone-700 border border-stone-300 dark:border-stone-600 font-semibold"
                  >
                    -1 pág.
                  </button>
                  <button
                    type="button"
                    onClick={() => handleUpdatePage(currentPage + 1)}
                    className="px-2.5 py-1 text-xs rounded-lg bg-white dark:bg-stone-700 border border-stone-300 dark:border-stone-600 font-semibold"
                  >
                    +1 pág.
                  </button>
                  <button
                    type="button"
                    onClick={() => handleUpdatePage(currentPage + 10)}
                    className="px-2.5 py-1 text-xs rounded-lg bg-white dark:bg-stone-700 border border-stone-300 dark:border-stone-600 font-semibold"
                  >
                    +10 pág.
                  </button>
                  {book.pageCount && (
                    <button
                      type="button"
                      onClick={() => handleUpdatePage(book.pageCount!)}
                      className="px-2.5 py-1 text-xs rounded-lg bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold ml-auto"
                    >
                      Concluir Livro ✓
                    </button>
                  )}
                </div>
              </div>

              {/* Histórico de Leituras & Releituras (Mês + Ano) */}
              <div className="bg-purple-50/40 dark:bg-stone-800/40 p-5 rounded-2xl border border-purple-200/60 dark:border-purple-900/40 space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 flex items-center justify-center shrink-0">
                      <RotateCcw className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-serif font-bold text-xs sm:text-sm text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
                        <span>Histórico de Leituras & Releituras</span>
                        <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300">
                          {calculateReadCount(book)}x
                        </span>
                      </h4>
                      <p className="text-[11px] text-stone-500 dark:text-stone-400">
                        {calculateReadCount(book) === 0
                          ? 'Nenhuma leitura completa registrada'
                          : calculateReadCount(book) === 1
                          ? 'Lido 1 vez pelo casal'
                          : `Lido ${calculateReadCount(book)} vezes (incluindo releituras)`}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowAddPeriodForm(!showAddPeriodForm)}
                    className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1 transition-colors shadow-xs shrink-0 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{showAddPeriodForm ? 'Fechar' : 'Nova Leitura'}</span>
                  </button>
                </div>

                {/* Form to add a new reading occasion (Month + Year) */}
                {showAddPeriodForm && (
                  <form onSubmit={handleAddReadPeriod} className="p-4 rounded-xl bg-white dark:bg-stone-900 border border-purple-200 dark:border-purple-800/60 space-y-3 animate-in fade-in duration-150">
                    <span className="text-xs font-semibold text-stone-800 dark:text-stone-200 block">
                      Registrar quando o livro foi lido ou relido:
                    </span>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      <div>
                        <label className="block text-[11px] font-semibold text-stone-600 dark:text-stone-400 mb-1">
                          Mês
                        </label>
                        <select
                          value={readMonth}
                          onChange={(e) => setReadMonth(Number(e.target.value))}
                          className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 font-medium cursor-pointer"
                        >
                          {MONTH_NAMES.map((name, index) => (
                            <option key={index + 1} value={index + 1}>
                              {name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-stone-600 dark:text-stone-400 mb-1">
                          Ano
                        </label>
                        <input
                          type="number"
                          min="1980"
                          max="2035"
                          value={readYear}
                          onChange={(e) => setReadYear(Number(e.target.value))}
                          className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 font-bold text-center"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-stone-600 dark:text-stone-400 mb-1">
                          Quem Leu?
                        </label>
                        <select
                          value={readReader}
                          onChange={(e) => setReadReader(e.target.value as ReaderId)}
                          className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 font-medium cursor-pointer"
                        >
                          <option value="ele">{settings.eleName}</option>
                          <option value="ela">{settings.elaName}</option>
                          <option value="ambos">Ambos</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-stone-600 dark:text-stone-400 mb-1">
                        Anotação da Releitura (Opcional)
                      </label>
                      <input
                        type="text"
                        value={readNote}
                        onChange={(e) => setReadNote(e.target.value)}
                        placeholder="Ex: Primeira leitura de 2024 / Releitura em viagem / Livro do mês..."
                        className="w-full px-3 py-1.5 text-xs rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100"
                      />
                    </div>

                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setShowAddPeriodForm(false)}
                        className="px-3 py-1.5 text-xs text-stone-500 hover:text-stone-700 dark:hover:text-stone-300 rounded-lg cursor-pointer"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        disabled={isSaving}
                        className="px-4 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-semibold shadow-xs cursor-pointer"
                      >
                        Salvar Leitura
                      </button>
                    </div>
                  </form>
                )}

                {/* List of registered reading periods */}
                <div className="space-y-2">
                  {(!book.readPeriods || book.readPeriods.length === 0) ? (
                    <div className="text-center py-4 px-3 bg-white/60 dark:bg-stone-900/60 rounded-xl border border-purple-100 dark:border-purple-950/40">
                      <p className="text-xs text-stone-500 dark:text-stone-400">
                        Nenhuma data de leitura ou releitura cadastrada ainda.
                      </p>
                      <button
                        type="button"
                        onClick={() => setShowAddPeriodForm(true)}
                        className="text-xs text-purple-600 dark:text-purple-400 font-semibold hover:underline mt-1 cursor-pointer"
                      >
                        + Adicionar mês e ano da leitura
                      </button>
                    </div>
                  ) : (
                    <div className="divide-y divide-purple-100 dark:divide-stone-800 bg-white/80 dark:bg-stone-900/80 rounded-xl border border-purple-200/60 dark:border-stone-700 overflow-hidden">
                      {book.readPeriods.map((period, idx) => {
                        const readerBadgeItem = getReaderBadge(period.reader || book.assignedReader, settings.eleName, settings.elaName);
                        return (
                          <div key={period.id || idx} className="p-3 flex items-center justify-between gap-3 hover:bg-purple-50/30 dark:hover:bg-stone-800/40 transition-colors">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span className="w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 font-bold text-[11px] flex items-center justify-center shrink-0">
                                #{book.readPeriods!.length - idx}
                              </span>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-xs text-stone-900 dark:text-stone-100">
                                    {formatReadPeriod(period)}
                                  </span>
                                  <span className={`text-[10px] font-semibold px-2 py-0.2 rounded-full border ${readerBadgeItem.bg} ${readerBadgeItem.text} ${readerBadgeItem.border}`}>
                                    {readerBadgeItem.label}
                                  </span>
                                </div>
                                {period.notes && (
                                  <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5 truncate">
                                    {period.notes}
                                  </p>
                                )}
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleDeleteReadPeriod(period.id)}
                              className="p-1.5 text-stone-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors shrink-0 cursor-pointer"
                              title="Remover esta leitura"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Log new reading session */}
              <form onSubmit={handleAddReadingLog} className="bg-amber-50/40 dark:bg-stone-800/40 p-5 rounded-2xl border border-amber-200/60 dark:border-stone-700 space-y-3">
                <h4 className="font-serif font-bold text-xs sm:text-sm text-stone-900 dark:text-stone-100 flex items-center gap-2">
                  <Bookmark className="w-4 h-4 text-amber-600" />
                  Registrar Sessão de Leitura de Hoje ({activeReaderName})
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div className="sm:col-span-1">
                    <label className="block text-[11px] font-semibold text-stone-600 dark:text-stone-300 mb-1">
                      Páginas Lidas Hoje
                    </label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={newLogPages}
                      onChange={(e) => setNewLogPages(Number(e.target.value))}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 font-bold text-center"
                    />
                  </div>
                  <div className="sm:col-span-3">
                    <label className="block text-[11px] font-semibold text-stone-600 dark:text-stone-300 mb-1">
                      Comentário da Sessão (Opcional)
                    </label>
                    <input
                      type="text"
                      value={newLogNotes}
                      onChange={(e) => setNewLogNotes(e.target.value)}
                      placeholder="Ex: Li no café da tarde, o vilão finalmente apareceu!"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Adicionar ao Histórico</span>
                  </button>
                </div>
              </form>

              {/* Sessions Timeline */}
              <div className="space-y-3">
                <h4 className="font-serif font-bold text-xs sm:text-sm text-stone-800 dark:text-stone-200">
                  Histórico de Sessões ({book.readingLogs?.length || 0})
                </h4>

                {!book.readingLogs || book.readingLogs.length === 0 ? (
                  <p className="text-xs text-stone-400 py-4 text-center">
                    Nenhuma sessão de leitura registrada ainda.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {book.readingLogs.map((log) => {
                      const readerName = log.reader === 'ele' ? settings.eleName : settings.elaName;
                      const isEle = log.reader === 'ele';

                      return (
                        <div
                          key={log.id}
                          className="flex items-center justify-between p-3 rounded-xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200/80 dark:border-stone-700/60 text-xs"
                        >
                          <div className="flex items-center gap-3">
                            <span
                              className={`w-2.5 h-2.5 rounded-full ${
                                isEle ? 'bg-amber-500' : 'bg-rose-500'
                              }`}
                            />
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-stone-900 dark:text-stone-100">
                                  {readerName} leu +{log.pagesRead} páginas
                                </span>
                                <span className="text-[11px] text-stone-400">
                                  (Pág. {log.currentPage})
                                </span>
                              </div>
                              {log.notes && (
                                <p className="text-[11px] text-stone-500 dark:text-stone-400 italic mt-0.5">
                                  "{log.notes}"
                                </p>
                              )}
                            </div>
                          </div>
                          <span className="text-[11px] text-stone-400 shrink-0">{log.date}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: RECOMMENDATIONS */}
          {activeTab === 'recommendations' && (
            <div className="space-y-6">
              {/* Form to recommend */}
              <form onSubmit={handleSendRecommendation} className="bg-rose-50/40 dark:bg-stone-800/40 p-5 rounded-2xl border border-rose-200/60 dark:border-stone-700 space-y-3">
                <h4 className="font-serif font-bold text-xs sm:text-sm text-stone-900 dark:text-stone-100 flex items-center gap-2">
                  <Heart className="w-4 h-4 fill-rose-500 text-rose-500" />
                  Recomendar este livro para {partnerName}
                </h4>
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  Escreva um recadinho carinhoso dizendo por que {partnerName} vai adorar essa leitura!
                </p>

                <textarea
                  rows={3}
                  required
                  value={recMessage}
                  onChange={(e) => setRecMessage(e.target.value)}
                  placeholder={`Oi amor! Você precisa ler isso porque...`}
                  className="w-full p-3 text-xs rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 focus:ring-2 focus:ring-rose-500/50"
                />

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={isSaving || !recMessage.trim()}
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Enviar Recomendação</span>
                  </button>
                </div>
              </form>

              {/* Past recommendations for this book */}
              <div className="space-y-3">
                <h4 className="font-serif font-bold text-xs sm:text-sm text-stone-800 dark:text-stone-200">
                  Mensagens Trocadas ({book.recommendations?.length || 0})
                </h4>

                {!book.recommendations || book.recommendations.length === 0 ? (
                  <p className="text-xs text-stone-400 py-6 text-center">
                    Ainda não há recomendações para este livro. Seja o primeiro a indicar!
                  </p>
                ) : (
                  <div className="space-y-3">
                    {book.recommendations.map((rec) => {
                      const fromName = rec.from === 'ele' ? settings.eleName : settings.elaName;
                      const toName = rec.to === 'ele' ? settings.eleName : settings.elaName;

                      return (
                        <div
                          key={rec.id}
                          className="p-4 rounded-xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 space-y-2"
                        >
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
                              <Heart className="w-3.5 h-3.5 fill-rose-500 text-rose-500" />
                              De {fromName} para {toName}
                            </span>
                            <span className="text-stone-400 text-[11px]">{rec.date}</span>
                          </div>
                          <p className="text-xs text-stone-700 dark:text-stone-300 italic pl-3 border-l-2 border-rose-400">
                            "{rec.message}"
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: METADATA & SYNOPSIS */}
          {activeTab === 'info' && (
            <div className="space-y-4 text-xs">
              <div>
                <h4 className="font-serif font-bold text-sm text-stone-900 dark:text-stone-100 mb-1">
                  Sinopse
                </h4>
                <p className="text-stone-600 dark:text-stone-300 leading-relaxed whitespace-pre-line">
                  {book.description || 'Nenhuma descrição fornecida.'}
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-4 border-t border-stone-200 dark:border-stone-800">
                <div>
                  <span className="text-stone-400 block text-[11px]">Total de Páginas</span>
                  <span className="font-bold text-stone-800 dark:text-stone-200">
                    {book.pageCount || 'Não informado'}
                  </span>
                </div>
                <div>
                  <span className="text-stone-400 block text-[11px]">Editora</span>
                  <span className="font-bold text-stone-800 dark:text-stone-200">
                    {book.publisher || 'Não informada'}
                  </span>
                </div>
                <div>
                  <span className="text-stone-400 block text-[11px]">Publicação</span>
                  <span className="font-bold text-stone-800 dark:text-stone-200">
                    {book.publishedDate || 'Não informada'}
                  </span>
                </div>
                <div>
                  <span className="text-stone-400 block text-[11px]">ISBN</span>
                  <span className="font-bold text-stone-800 dark:text-stone-200">
                    {book.isbn || 'Não informado'}
                  </span>
                </div>
                <div>
                  <span className="text-stone-400 block text-[11px]">Data Adicionado</span>
                  <span className="font-bold text-stone-800 dark:text-stone-200">
                    {book.dateAdded || '—'}
                  </span>
                </div>
                <div>
                  <span className="text-stone-400 block text-[11px]">Categorias</span>
                  <span className="font-bold text-stone-800 dark:text-stone-200">
                    {book.categories?.join(', ') || 'Geral'}
                  </span>
                </div>
              </div>

              {/* Danger Zone: Delete Book */}
              <div className="pt-6 border-t border-stone-200 dark:border-stone-800 flex justify-between items-center">
                <span className="text-[11px] text-stone-400">
                  ID do documento: {book.id}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm('Tem certeza de que deseja excluir este livro da estante do casal?')) {
                      onDeleteBook(book.id);
                      onClose();
                    }
                  }}
                  className="px-3 py-1.5 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl flex items-center gap-1 font-semibold transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Excluir Livro</span>
                </button>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Multi-API Cover Picker Modal */}
      {isCoverPickerOpen && (
        <CoverPickerModal
          isOpen={isCoverPickerOpen}
          onClose={() => setIsCoverPickerOpen(false)}
          bookTitle={book.title}
          bookAuthors={book.authors}
          bookIsbn={book.isbn}
          currentCoverUrl={book.coverUrl}
          onSelectCover={async (newCoverUrl: string) => {
            await onUpdateBook({
              ...book,
              coverUrl: newCoverUrl,
              updatedAt: new Date().toISOString(),
            });
            setIsCoverPickerOpen(false);
          }}
        />
      )}
    </div>
  );
};
