import React, { useState } from 'react';
import { 
  Circle, 
  CheckCircle2, 
  Clock, 
  XCircle, 
  Plus, 
  MoreHorizontal, 
  GripVertical, 
  Star, 
  BookOpen, 
  Sparkles,
  ArrowRight,
  User,
  SlidersHorizontal
} from 'lucide-react';
import { Book, BookStatus, ReaderId, LibrarySettings } from '../types/book';

interface BookKanbanProps {
  books: Book[];
  settings: LibrarySettings;
  onSelectBook: (book: Book) => void;
  onUpdateStatus: (bookId: string, newStatus: BookStatus) => void;
  onOpenAddModal?: () => void;
}

interface LinearColumnConfig {
  status: BookStatus;
  title: string;
  icon: (color?: string) => React.ReactNode;
  iconColor: string;
}

const LINEAR_COLUMNS: LinearColumnConfig[] = [
  {
    status: 'quero_ler',
    title: 'Quero Ler',
    iconColor: 'text-stone-400 dark:text-stone-500',
    icon: (c) => <Circle className={`w-3.5 h-3.5 ${c || 'text-stone-400'}`} strokeDasharray="3 3" />,
  },
  {
    status: 'lendo',
    title: 'Em Leitura',
    iconColor: 'text-amber-500 dark:text-amber-400',
    icon: (c) => (
      <div className="relative w-3.5 h-3.5 flex items-center justify-center">
        <Circle className="w-3.5 h-3.5 text-amber-500/30" />
        <span className="absolute w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
      </div>
    ),
  },
  {
    status: 'lido',
    title: 'Concluído',
    iconColor: 'text-emerald-500 dark:text-emerald-400',
    icon: (c) => <CheckCircle2 className={`w-3.5 h-3.5 ${c || 'text-emerald-500'}`} />,
  },
  {
    status: 'pausado',
    title: 'Pausado',
    iconColor: 'text-sky-500 dark:text-sky-400',
    icon: (c) => <Clock className={`w-3.5 h-3.5 ${c || 'text-sky-400'}`} />,
  },
  {
    status: 'abandonado',
    title: 'Cancelado',
    iconColor: 'text-rose-500 dark:text-rose-400',
    icon: (c) => <XCircle className={`w-3.5 h-3.5 ${c || 'text-rose-400'}`} />,
  },
];

export const BookKanban: React.FC<BookKanbanProps> = ({
  books,
  settings,
  onSelectBook,
  onUpdateStatus,
  onOpenAddModal,
}) => {
  const [draggedBookId, setDraggedBookId] = useState<string | null>(null);
  const [activeDropColumn, setActiveDropColumn] = useState<BookStatus | null>(null);

  const handleDragStart = (e: React.DragEvent, bookId: string) => {
    setDraggedBookId(bookId);
    e.dataTransfer.setData('text/plain', bookId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = () => {
    setDraggedBookId(null);
    setActiveDropColumn(null);
  };

  const handleDragOver = (e: React.DragEvent, columnStatus: BookStatus) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (activeDropColumn !== columnStatus) {
      setActiveDropColumn(columnStatus);
    }
  };

  const handleDragLeave = (columnStatus: BookStatus) => {
    if (activeDropColumn === columnStatus) {
      setActiveDropColumn(null);
    }
  };

  const handleDrop = (e: React.DragEvent, targetStatus: BookStatus) => {
    e.preventDefault();
    const bookId = e.dataTransfer.getData('text/plain') || draggedBookId;
    if (bookId) {
      onUpdateStatus(bookId, targetStatus);
    }
    setDraggedBookId(null);
    setActiveDropColumn(null);
  };

  return (
    <div className="w-full">
      {/* Linear Subheader Toolbar */}
      <div className="mb-4 flex items-center justify-between text-xs text-stone-500 dark:text-stone-400 px-1">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-stone-400 dark:text-stone-500">
            Quadro de Leitura
          </span>
          <span className="text-stone-300 dark:text-stone-700">•</span>
          <span className="text-[11px]">{books.length} livros no acervo</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden sm:inline text-[11px] text-stone-400">
            Arraste os cartões como no Linear para mudar o status
          </span>
        </div>
      </div>

      {/* Linear Board Columns Container */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3.5 items-start">
        {LINEAR_COLUMNS.map((col) => {
          const columnBooks = books.filter((b) => b.status === col.status);
          const isTargeted = activeDropColumn === col.status;

          return (
            <div
              key={col.status}
              onDragOver={(e) => handleDragOver(e, col.status)}
              onDragLeave={() => handleDragLeave(col.status)}
              onDrop={(e) => handleDrop(e, col.status)}
              className={`flex flex-col rounded-xl bg-stone-100/60 dark:bg-[#121316] border transition-all duration-150 min-h-[560px] max-h-[82vh] ${
                isTargeted
                  ? 'border-violet-500/80 bg-violet-500/5 dark:bg-violet-950/20 ring-1 ring-violet-500/30'
                  : 'border-stone-200/90 dark:border-[#22242a]'
              }`}
            >
              {/* Linear Column Header */}
              <div className="px-3 py-2.5 flex items-center justify-between border-b border-stone-200/60 dark:border-[#1e2026] select-none">
                <div className="flex items-center gap-2 min-w-0">
                  {col.icon(col.iconColor)}
                  <h3 className="text-xs font-semibold text-stone-800 dark:text-stone-200 truncate">
                    {col.title}
                  </h3>
                  <span className="text-[10px] font-mono font-medium px-1.5 py-0.2 rounded-md bg-stone-200/70 dark:bg-[#202228] text-stone-600 dark:text-stone-400">
                    {columnBooks.length}
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  {onOpenAddModal && (
                    <button
                      type="button"
                      onClick={onOpenAddModal}
                      className="p-1 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 rounded hover:bg-stone-200/60 dark:hover:bg-[#202228] transition-colors"
                      title={`Adicionar livro em ${col.title}`}
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Linear Column Cards Body */}
              <div className="flex-1 p-2 space-y-2 overflow-y-auto pr-1.5 scrollbar-thin scrollbar-thumb-stone-300 dark:scrollbar-thumb-stone-800">
                {columnBooks.length === 0 ? (
                  <div className="h-28 border border-dashed border-stone-300/60 dark:border-[#22242a] rounded-lg flex items-center justify-center p-3 text-center">
                    <span className="text-[11px] text-stone-400 dark:text-stone-600">
                      Nenhum livro
                    </span>
                  </div>
                ) : (
                  columnBooks.map((book) => {
                    const isDraggingThis = draggedBookId === book.id;
                    const bookCode = `LIV-${String(book.originalId || book.id).padStart(2, '0')}`;
                    const hasCover = !!book.coverUrl;

                    return (
                      <div
                        key={book.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, book.id)}
                        onDragEnd={handleDragEnd}
                        className={`group relative bg-white dark:bg-[#18191e] rounded-lg p-2.5 border border-stone-200/80 dark:border-[#262830] shadow-2xs hover:border-stone-300 dark:hover:border-[#383a44] hover:shadow-xs cursor-grab active:cursor-grabbing transition-all select-none ${
                          isDraggingThis ? 'opacity-30 scale-95 border-violet-500' : ''
                        }`}
                      >
                        {/* Top: Issue Code & Quick Move */}
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="font-mono text-[10px] font-medium text-stone-400 dark:text-stone-500 tracking-tight">
                            {bookCode}
                          </span>

                          <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                            {/* Fast status switcher for mobile/keyboard */}
                            <select
                              value={book.status}
                              onChange={(e) => onUpdateStatus(book.id, e.target.value as BookStatus)}
                              className="text-[9px] rounded px-1 py-0.5 bg-stone-100 dark:bg-[#202228] text-stone-600 dark:text-stone-400 border border-stone-200 dark:border-[#2c2e36] cursor-pointer"
                            >
                              <option value="quero_ler">Quero Ler</option>
                              <option value="lendo">Lendo</option>
                              <option value="lido">Concluído</option>
                              <option value="pausado">Pausado</option>
                              <option value="abandonado">Cancelado</option>
                            </select>
                          </div>
                        </div>

                        {/* Middle: Content with Compact Linear Cover Thumbnail */}
                        <div
                          onClick={() => onSelectBook(book)}
                          className="flex gap-2.5 cursor-pointer"
                        >
                          {/* Compact Thumbnail */}
                          <div className="w-9 h-13 shrink-0 rounded bg-stone-100 dark:bg-[#22242a] border border-stone-200/70 dark:border-[#2e3038] overflow-hidden flex items-center justify-center">
                            {hasCover ? (
                              <img
                                src={book.coverUrl}
                                alt={book.title}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  (e.target as HTMLElement).style.display = 'none';
                                }}
                              />
                            ) : (
                              <BookOpen className="w-4 h-4 text-stone-400" />
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <h4 className="text-xs font-medium text-stone-900 dark:text-stone-100 line-clamp-2 leading-snug group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
                              {book.title}
                            </h4>
                            <p className="text-[11px] text-stone-500 dark:text-stone-400 truncate mt-0.5">
                              {book.authors || 'Autor Desconhecido'}
                            </p>
                          </div>
                        </div>

                        {/* Bottom Row: Linear-style Metadata Badges */}
                        <div className="mt-2.5 pt-2 border-t border-stone-100 dark:border-[#202228] flex items-center justify-between text-[10px]">
                          {/* Reader Indicator */}
                          <div className="flex items-center gap-1.5">
                            {book.assignedReader === 'ele' ? (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200/60 dark:border-amber-900/40">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                {settings.eleName}
                              </span>
                            ) : book.assignedReader === 'ela' ? (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200/60 dark:border-rose-900/40">
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                                {settings.elaName}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-stone-100 text-stone-600 dark:bg-[#202228] dark:text-stone-400 border border-stone-200 dark:border-[#2a2c34]">
                                Casal
                              </span>
                            )}

                            {book.pageCount && book.pageCount > 0 ? (
                              <span className="text-[10px] text-stone-400 font-mono">
                                {book.pageCount}p
                              </span>
                            ) : null}
                          </div>

                          {/* Ratings if available */}
                          <div className="flex items-center gap-1.5">
                            {book.ratings?.ele ? (
                              <span className="flex items-center text-amber-600 dark:text-amber-400 font-semibold font-mono text-[10px]">
                                <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-500 mr-0.5" />
                                {book.ratings.ele}
                              </span>
                            ) : null}
                            {book.ratings?.ela ? (
                              <span className="flex items-center text-rose-600 dark:text-rose-400 font-semibold font-mono text-[10px]">
                                <Star className="w-2.5 h-2.5 fill-rose-400 text-rose-500 mr-0.5" />
                                {book.ratings.ela}
                              </span>
                            ) : null}
                            {book.favorite ? (
                              <Star className="w-3 h-3 fill-amber-400 text-amber-500" />
                            ) : null}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
