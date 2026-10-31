import React, { useState, useRef, useEffect } from 'react';
import { 
  X, 
  Search, 
  Loader2, 
  BookPlus, 
  Sparkles, 
  Plus, 
  BookOpen, 
  Edit3,
  Upload,
  Image as ImageIcon,
  Link as LinkIcon,
  Globe,
  Library,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Barcode,
  Check
} from 'lucide-react';
import { 
  Book, 
  BookApiMetadata,
  BookStatus, 
  ReaderId, 
  LibrarySettings, 
  GoogleBookSearchResult,
  searchBooksStream, 
  SELECTABLE_API_PROVIDERS, 
  ApiProviderId, 
  ApiSearchStatus,
  fetchBookByOpenLibraryIsbn,
  buildBookFromApi 
} from '@/features/books';
import { compressImageFile, formatFileSize } from '../utils/imageCompressor';

interface AddBookModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddBook: (bookData: Omit<Book, 'id'>) => Promise<void>;
  settings: LibrarySettings;
  activeReader: 'ele' | 'ela';
}

export const AddBookModal: React.FC<AddBookModalProps> = ({
  isOpen,
  onClose,
  onAddBook,
  settings,
  activeReader,
}) => {
  const [activeTab, setActiveTab] = useState<'search' | 'manual'>('search');

  // Search tab states with multi-API selection and streaming
  const [selectedApis, setSelectedApis] = useState<ApiProviderId[]>(() => {
    try {
      const saved = localStorage.getItem('nossa_estante_selected_book_apis');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return ['openlibrary', 'google'];
  });
  const [apiStatuses, setApiStatuses] = useState<Record<string, ApiSearchStatus>>({});

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<GoogleBookSearchResult[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Manual form states
  const [title, setTitle] = useState('');
  const [authors, setAuthors] = useState('');
  const [coverMode, setCoverMode] = useState<'upload' | 'url'>('upload');
  const [coverUrl, setCoverUrl] = useState('');
  const [uploadedCoverDetails, setUploadedCoverDetails] = useState<{
    originalSize: number;
    compressedSize: number;
    fileName: string;
  } | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isbn, setIsbn] = useState('');
  const [pageCount, setPageCount] = useState<number | ''>('');
  const [publisher, setPublisher] = useState('');
  const [publishedDate, setPublishedDate] = useState('');
  const [description, setDescription] = useState('');
  const [categories, setCategories] = useState('');
  const [status, setStatus] = useState<BookStatus>('quero_ler');
  const [assignedReader, setAssignedReader] = useState<ReaderId>(activeReader);
  const [owned, setOwned] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Open Library ISBN Autofill state
  const [isFetchingIsbn, setIsFetchingIsbn] = useState(false);
  const [isbnFeedback, setIsbnFeedback] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  const handleAutofillWithOpenLibraryIsbn = async (targetIsbn?: string) => {
    const raw = (targetIsbn !== undefined ? targetIsbn : isbn).trim();
    const clean = raw.replace(/[^0-9X]/gi, '');

    if (!clean || (clean.length !== 10 && clean.length !== 13)) {
      setIsbnFeedback({
        type: 'error',
        message: 'Por favor, informe um ISBN válido com 10 ou 13 dígitos numéricos.',
      });
      return;
    }

    setIsFetchingIsbn(true);
    setIsbnFeedback(null);

    try {
      const result = await fetchBookByOpenLibraryIsbn(clean);
      if (!result) {
        setIsbnFeedback({
          type: 'error',
          message: `Nenhum livro foi encontrado na Open Library para o ISBN ${clean}. Tente verificar o número ou preencher manualmente.`,
        });
        return;
      }

      // Populate form fields with Open Library data
      if (result.title) setTitle(result.title);
      if (result.authors) setAuthors(result.authors);
      if (result.publisher) setPublisher(result.publisher);
      if (result.publishedDate) setPublishedDate(result.publishedDate);
      if (result.pageCount) setPageCount(result.pageCount);
      if (result.description) setDescription(result.description);
      if (result.categories && result.categories.length > 0) {
        setCategories(result.categories.join(', '));
      }
      setIsbn(clean);

      // Auto-set cover from Open Library
      if (result.coverUrl) {
        setCoverUrl(result.coverUrl);
        setCoverMode('url');
        setUploadedCoverDetails(null);
        setUploadError(null);
      }

      setIsbnFeedback({
        type: 'success',
        message: `Livro "${result.title}" e sua capa oficial foram preenchidos via Open Library com sucesso!`,
      });
    } catch (err: any) {
      console.error('Error fetching from Open Library by ISBN:', err);
      setIsbnFeedback({
        type: 'error',
        message: 'Ocorreu uma falha ao consultar a Open Library. Tente novamente em instantes.',
      });
    } finally {
      setIsFetchingIsbn(false);
    }
  };

  const toggleApi = (id: ApiProviderId) => {
    setSelectedApis((prev) => {
      let next: ApiProviderId[];
      if (prev.includes(id)) {
        if (prev.length === 1) return prev; // Keep at least one selected
        next = prev.filter((p) => p !== id);
      } else {
        next = [...prev, id];
      }
      try {
        localStorage.setItem('nossa_estante_selected_book_apis', JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const selectAllApis = () => {
    const all: ApiProviderId[] = ['openlibrary', 'google', 'brasilapi', 'gutendex'];
    setSelectedApis(all);
    try {
      localStorage.setItem('nossa_estante_selected_book_apis', JSON.stringify(all));
    } catch {}
  };

  const selectOnlyOpenLibrary = () => {
    const only: ApiProviderId[] = ['openlibrary'];
    setSelectedApis(only);
    try {
      localStorage.setItem('nossa_estante_selected_book_apis', JSON.stringify(only));
    } catch {}
  };

  const selectFastestApis = () => {
    const fast: ApiProviderId[] = ['openlibrary', 'google'];
    setSelectedApis(fast);
    try {
      localStorage.setItem('nossa_estante_selected_book_apis', JSON.stringify(fast));
    } catch {}
  };

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim() || selectedApis.length === 0) return;

    setIsSearching(true);
    setHasSearched(true);
    setSearchError(null);
    setSearchResults([]); // Fresh results stream

    const initialStatuses: Record<string, ApiSearchStatus> = {};
    selectedApis.forEach((pId) => {
      const meta = SELECTABLE_API_PROVIDERS.find((p) => p.id === pId);
      initialStatuses[pId] = {
        providerId: pId,
        providerName: meta?.name || pId,
        providerBadge: meta?.badge || pId,
        state: 'searching',
        count: 0,
      };
    });
    setApiStatuses(initialStatuses);

    try {
      await searchBooksStream(searchQuery, selectedApis, {
        onProviderStatus: (providerId, status) => {
          setApiStatuses((prev) => ({
            ...prev,
            [providerId]: status,
          }));
        },
        onIncrementalResults: (_newItems, allAccumulated) => {
          setSearchResults([...allAccumulated]);
        },
      });
    } catch (err: any) {
      console.error('Erro na busca streaming de livros:', err);
      setSearchError('Ocorreu uma falha ao consultar as APIs selecionadas.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleFileProcess = async (file: File) => {
    setIsCompressing(true);
    setUploadError(null);
    try {
      const result = await compressImageFile(file, {
        maxWidth: 600,
        maxHeight: 900,
        quality: 0.82,
      });

      setCoverUrl(result.dataUrl);
      setUploadedCoverDetails({
        originalSize: result.originalSize,
        compressedSize: result.compressedSize,
        fileName: file.name,
      });
    } catch (err: any) {
      setUploadError(err.message || 'Erro ao processar imagem.');
    } finally {
      setIsCompressing(false);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileProcess(file);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileProcess(file);
    }
  };

  const handleRemoveCover = () => {
    setCoverUrl('');
    setUploadedCoverDetails(null);
    setUploadError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSelectBookResult = async (item: GoogleBookSearchResult) => {
    setIsSubmitting(true);
    try {
      const newBook = buildBookFromApi(item, {
        status,
        assignedReader,
        owned,
      });
      await onAddBook(newBook);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsSubmitting(true);
    try {
      const parsedCategories = categories
        .split(',')
        .map((c) => c.trim())
        .filter(Boolean);

      const manualMetadata: BookApiMetadata = {
        title: title.trim(),
        authors: authors.trim() || 'Autor Desconhecido',
        coverUrl: coverUrl.trim(),
        isbn: isbn.trim(),
        pageCount: typeof pageCount === 'number' && pageCount > 0 ? pageCount : 0,
        publisher: publisher.trim(),
        publishedDate: publishedDate.trim(),
        description: description.trim(),
        categories: parsedCategories,
        source: 'manual',
      };

      const newBook = buildBookFromApi(manualMetadata, {
        status,
        assignedReader,
        owned,
      });

      await onAddBook(newBook);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
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

  if (!isOpen) return null;

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
        className="bg-white dark:bg-stone-900 rounded-3xl w-full max-w-2xl max-h-[92vh] shadow-2xl border border-stone-200 dark:border-stone-800 flex flex-col overflow-hidden"
      >
        
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-stone-100 dark:border-stone-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 flex items-center justify-center">
              <BookPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif text-base sm:text-lg font-bold text-stone-900 dark:text-stone-100">
                Adicionar Novo Livro
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Busque online via Google Livros e Open Library ou cadastre com foto personalizada
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 rounded-full hover:bg-stone-100 dark:hover:bg-stone-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Posse, Reader & Status Target Bar */}
        <div className="bg-amber-50/60 dark:bg-stone-800/60 p-3 sm:p-4 border-b border-amber-200/50 dark:border-stone-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Ownership toggle */}
          <div className="flex items-center gap-2">
            <span className="font-semibold text-stone-700 dark:text-stone-300">Posse:</span>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => setOwned(true)}
                className={`px-2.5 py-1 rounded-lg font-medium transition-colors flex items-center gap-1 cursor-pointer ${
                  owned
                    ? 'bg-amber-600 text-white font-bold shadow-xs'
                    : 'bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-700'
                }`}
              >
                <span>📦 Temos na Estante</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setOwned(false);
                  setStatus('quero_ler');
                }}
                className={`px-2.5 py-1 rounded-lg font-medium transition-colors flex items-center gap-1 cursor-pointer ${
                  !owned
                    ? 'bg-violet-600 text-white font-bold shadow-xs'
                    : 'bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-700'
                }`}
              >
                <span>🎁 Lista de Desejos</span>
              </button>
            </div>
          </div>

          {/* Reader select */}
          <div className="flex items-center gap-2">
            <span className="font-semibold text-stone-700 dark:text-stone-300">Leitor:</span>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => setAssignedReader('ele')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                  assignedReader === 'ele'
                    ? 'bg-amber-600 text-white font-bold'
                    : 'bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-700'
                }`}
              >
                {settings.eleName}
              </button>
              <button
                type="button"
                onClick={() => setAssignedReader('ela')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                  assignedReader === 'ela'
                    ? 'bg-rose-600 text-white font-bold'
                    : 'bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-700'
                }`}
              >
                {settings.elaName}
              </button>
              <button
                type="button"
                onClick={() => setAssignedReader('ambos')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                  assignedReader === 'ambos'
                    ? 'bg-purple-600 text-white font-bold'
                    : 'bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-700'
                }`}
              >
                Ambos
              </button>
            </div>
          </div>

          {/* Initial Status select */}
          <div className="flex items-center gap-2">
            <span className="font-semibold text-stone-700 dark:text-stone-300">Status:</span>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as BookStatus)}
              className="px-2.5 py-1 rounded-lg bg-white dark:bg-stone-800 text-stone-800 dark:text-stone-200 border border-stone-300 dark:border-stone-700 font-medium cursor-pointer"
            >
              <option value="quero_ler">Quero Ler</option>
              <option value="lendo">Lendo Agora</option>
              <option value="lido">Já Lido</option>
              <option value="pausado">Pausado</option>
            </select>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-stone-200 dark:border-stone-800 px-4 sm:px-5 pt-3">
          <button
            type="button"
            onClick={() => setActiveTab('search')}
            className={`pb-3 px-3 text-xs font-semibold border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === 'search'
                ? 'border-amber-600 text-amber-600 dark:text-amber-400'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Buscar Livro Online
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('manual')}
            className={`pb-3 px-3 text-xs font-semibold border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === 'manual'
                ? 'border-amber-600 text-amber-600 dark:text-amber-400'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <Edit3 className="w-3.5 h-3.5" />
            Cadastro Manual & Foto
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4">
          {activeTab === 'search' ? (
            <div>
              {/* Multi-API Provider Selector */}
              <div className="flex flex-col gap-2.5 mb-3.5 p-3 rounded-2xl bg-stone-50 dark:bg-stone-850 border border-stone-200/80 dark:border-stone-800">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                    <span className="text-xs font-bold text-stone-800 dark:text-stone-200">
                      Selecione onde buscar ({selectedApis.length} de {SELECTABLE_API_PROVIDERS.length} ativas):
                    </span>
                  </div>
                  
                  {/* Preset Quick Buttons */}
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={selectOnlyOpenLibrary}
                      className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-white dark:bg-stone-800 text-sky-700 dark:text-sky-300 border border-stone-200 dark:border-stone-700 hover:border-sky-400 transition-colors cursor-pointer"
                      title="Usa apenas a Open Library: resposta ultra-rápida sem esperar por outras fontes"
                    >
                      ⚡ Só Open Library
                    </button>
                    <button
                      type="button"
                      onClick={selectFastestApis}
                      className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-white dark:bg-stone-800 text-amber-700 dark:text-amber-300 border border-stone-200 dark:border-stone-700 hover:border-amber-400 transition-colors cursor-pointer"
                    >
                      🚀 Open Library + Google
                    </button>
                    <button
                      type="button"
                      onClick={selectAllApis}
                      className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-700 hover:border-amber-400 transition-colors cursor-pointer"
                    >
                      🌐 Todas (4)
                    </button>
                  </div>
                </div>

                {/* API Checkbox / Pill buttons */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                  {SELECTABLE_API_PROVIDERS.map((provider) => {
                    const isSelected = selectedApis.includes(provider.id);
                    return (
                      <button
                        key={provider.id}
                        type="button"
                        onClick={() => toggleApi(provider.id)}
                        className={`p-2 rounded-xl text-left border transition-all flex items-start justify-between cursor-pointer ${
                          isSelected
                            ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700 text-amber-950 dark:text-amber-100 shadow-xs'
                            : 'bg-white dark:bg-stone-800 border-stone-200 dark:border-stone-700 text-stone-500 opacity-60 hover:opacity-100'
                        }`}
                        title={provider.description}
                      >
                        <div className="min-w-0 pr-1">
                          <div className="flex items-center gap-1 font-bold text-xs truncate">
                            <span>{provider.badge}</span>
                          </div>
                          <p className="text-[10px] text-stone-500 dark:text-stone-400 truncate mt-0.5">
                            {provider.fastest ? '⚡ Ultra rápida' : provider.id === 'brasilapi' ? 'Oficial CBL (ISBN)' : provider.id === 'google' ? 'Catálogo amplo' : 'Domínio público'}
                          </p>
                        </div>
                        <div className={`w-4 h-4 rounded-md flex items-center justify-center shrink-0 mt-0.5 ${
                          isSelected ? 'bg-amber-600 text-white' : 'border border-stone-300 dark:border-stone-600'
                        }`}>
                          {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Search input form */}
              <form onSubmit={handleSearch} className="flex gap-2 mb-3">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3 top-3 text-stone-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={
                      selectedApis.length === 1 && selectedApis[0] === 'brasilapi'
                        ? 'Digite o código ISBN (ex: 9788535914849)'
                        : 'Digite título, autor ou ISBN (ex: Torto Arado, Jane Austen...)'
                    }
                    className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 placeholder:text-stone-400 focus:outline-hidden focus:ring-2 focus:ring-amber-500/50"
                    autoFocus
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSearching || !searchQuery.trim() || selectedApis.length === 0}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shrink-0 cursor-pointer shadow-xs"
                >
                  {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  <span>Buscar</span>
                </button>
              </form>

              {/* Real-Time API Status Bar (Live indicators of each API as it returns) */}
              {(isSearching || hasSearched) && Object.keys(apiStatuses).length > 0 && (
                <div className="mb-3.5 p-2.5 rounded-xl bg-stone-100/70 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700/80 space-y-1.5 animate-in fade-in">
                  <div className="flex items-center justify-between text-[11px] font-semibold text-stone-600 dark:text-stone-300 px-0.5">
                    <span>Status das APIs em tempo real:</span>
                    <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold">
                      {searchResults.length} livro(s) encontrado(s) até agora
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {selectedApis.map((pId) => {
                      const st = apiStatuses[pId];
                      if (!st) return null;
                      const isWorking = st.state === 'searching';
                      const isSuccess = st.state === 'success';
                      const isError = st.state === 'error';
                      const isEmpty = st.state === 'empty';

                      return (
                        <div
                          key={pId}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-all ${
                            isWorking
                              ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-200 animate-pulse'
                              : isSuccess
                              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
                              : isError
                              ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-200'
                              : 'bg-stone-50 dark:bg-stone-900 border-stone-200 dark:border-stone-750 text-stone-500'
                          }`}
                        >
                          {isWorking && <Loader2 className="w-3 h-3 animate-spin text-amber-600 shrink-0" />}
                          {isSuccess && <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />}
                          {isError && <AlertCircle className="w-3 h-3 text-rose-600 shrink-0" />}
                          {isEmpty && <span className="w-1.5 h-1.5 rounded-full bg-stone-400 shrink-0" />}
                          
                          <span className="font-semibold">{st.providerName}:</span>
                          <span>
                            {isWorking
                              ? 'Buscando...'
                              : isSuccess
                              ? `${st.count} livro(s)`
                              : st.message || (isEmpty ? '0 resultados' : 'Erro')}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {searchError && (
                <div className="p-3 mb-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
                  <span>{searchError}</span>
                </div>
              )}

              {/* Incremental Results List */}
              {isSearching && searchResults.length === 0 ? (
                <div className="py-16 text-center text-stone-400 space-y-2">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto text-amber-600" />
                  <p className="text-xs">
                    Consultando APIs selecionadas ({selectedApis.length})...
                  </p>
                </div>
              ) : searchResults.length > 0 ? (
                <div className="space-y-3">
                  {isSearching && (
                    <div className="p-2 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 text-xs text-amber-800 dark:text-amber-200 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-600" />
                        <span>Carregando mais resultados em segundo plano... Você já pode selecionar qualquer livro abaixo!</span>
                      </div>
                    </div>
                  )}
                  {searchResults.map((item) => (
                    <div
                      key={item.id}
                      className="p-3 rounded-2xl border border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-800/50 hover:bg-amber-50/40 dark:hover:bg-stone-800 transition-colors flex gap-3.5 items-center justify-between"
                    >
                      <div className="flex gap-3 min-w-0 flex-1">
                        <div className="w-12 h-18 shrink-0 bg-stone-200 dark:bg-stone-700 rounded-md overflow-hidden shadow-xs relative">
                          {item.coverUrl ? (
                            <img
                              src={item.coverUrl}
                              alt={item.title}
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-[9px] text-stone-400 font-serif text-center p-1">
                              Sem capa
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h4 className="font-serif font-bold text-sm text-stone-900 dark:text-stone-100 truncate max-w-[280px]">
                              {item.title}
                            </h4>
                            {item.source === 'openlibrary' && (
                              <span className="px-1.5 py-0.5 text-[9px] font-semibold bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 rounded-sm">
                                Open Library
                              </span>
                            )}
                            {item.source === 'brasilapi' && (
                              <span className="px-1.5 py-0.5 text-[9px] font-semibold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 rounded-sm">
                                Brasil API
                              </span>
                            )}
                            {item.source === 'google' && (
                              <span className="px-1.5 py-0.5 text-[9px] font-semibold bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 rounded-sm">
                                Google
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-stone-500 dark:text-stone-400 truncate">
                            {item.authors}
                          </p>
                          <div className="flex flex-wrap gap-2 text-[10px] text-stone-400 mt-1">
                            {item.pageCount && <span>{item.pageCount} págs.</span>}
                            {item.publishedDate && <span>Ano: {item.publishedDate.slice(0, 4)}</span>}
                            {item.publisher && <span className="truncate max-w-[120px]">{item.publisher}</span>}
                            {item.isbn && <span>ISBN: {item.isbn}</span>}
                          </div>
                          {item.description && (
                            <p className="text-[11px] text-stone-500 line-clamp-2 mt-1">
                              {item.description}
                            </p>
                          )}
                        </div>
                      </div>

                      <button
                        type="button"
                        disabled={isSubmitting}
                        onClick={() => handleSelectBookResult(item)}
                        className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center gap-1 shrink-0 transition-transform active:scale-95 shadow-xs"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Adicionar</span>
                      </button>
                    </div>
                  ))}
                </div>
              ) : hasSearched ? (
                <div className="py-12 text-center text-stone-400 space-y-2">
                  <p className="text-sm">Nenhum livro encontrado com esse termo.</p>
                  <p className="text-xs text-stone-500">
                    Dica: Experimente alternar entre <span className="font-semibold text-stone-600 dark:text-stone-300">Google Livros</span> e <span className="font-semibold text-stone-600 dark:text-stone-300">Open Library</span>, ou buscar pelo código <span className="font-semibold text-stone-600 dark:text-stone-300">ISBN</span>.
                  </p>
                </div>
              ) : (
                <div className="py-12 text-center text-stone-400 space-y-2">
                  <BookOpen className="w-10 h-10 mx-auto text-stone-300 dark:text-stone-700" />
                  <p className="text-xs">Digite o título, autor ou ISBN acima e clique em "Buscar"</p>
                </div>
              )}
            </div>
          ) : (
            /* Manual Form with Custom Image Upload & Open Library ISBN Autofill */
            <form onSubmit={handleManualSubmit} className="space-y-4">
              {/* Open Library ISBN Quick Autofill Banner */}
              <div className="p-3.5 sm:p-4 rounded-2xl bg-amber-500/10 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-amber-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                      <Barcode className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
                        Preenchimento Rápido por ISBN
                        <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-amber-100 dark:bg-amber-900/70 text-amber-800 dark:text-amber-200 font-semibold border border-amber-200 dark:border-amber-800">
                          Open Library API
                        </span>
                      </h4>
                      <p className="text-[11px] text-stone-600 dark:text-stone-400">
                        Digite ou cole o código ISBN para preencher automaticamente título, autores, editora, páginas e capa.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={isbn}
                      onChange={(e) => {
                        setIsbn(e.target.value);
                        if (isbnFeedback) setIsbnFeedback(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAutofillWithOpenLibraryIsbn(isbn);
                        }
                      }}
                      placeholder="Ex: 9788535914849 ou 0451524934"
                      className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm rounded-xl border border-amber-300 dark:border-amber-800/80 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 focus:ring-2 focus:ring-amber-500 font-mono"
                    />
                    <Barcode className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleAutofillWithOpenLibraryIsbn(isbn)}
                    disabled={isFetchingIsbn || !isbn.trim()}
                    className="px-3.5 sm:px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shrink-0 shadow-xs transition-transform active:scale-95"
                  >
                    {isFetchingIsbn ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Consultando Open Library...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Preencher Dados e Capa</span>
                      </>
                    )}
                  </button>
                </div>

                {isbnFeedback && (
                  <div
                    className={`p-2.5 rounded-xl text-xs flex items-center gap-2 animate-in fade-in duration-150 ${
                      isbnFeedback.type === 'success'
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                        : 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                    }`}
                  >
                    {isbnFeedback.type === 'success' ? (
                      <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
                    )}
                    <span className="flex-1">{isbnFeedback.message}</span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  Título do Livro *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: O Pequeno Príncipe"
                  className="w-full px-3 py-2 text-sm rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                    Autor(es)
                  </label>
                  <input
                    type="text"
                    value={authors}
                    onChange={(e) => setAuthors(e.target.value)}
                    placeholder="Ex: Antoine de Saint-Exupéry"
                    className="w-full px-3 py-2 text-sm rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                    Total de Páginas
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={pageCount}
                    onChange={(e) => setPageCount(e.target.value ? Number(e.target.value) : '')}
                    placeholder="Ex: 120"
                    className="w-full px-3 py-2 text-sm rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100"
                  />
                </div>
              </div>

              {/* COVER IMAGE: Upload or URL */}
              <div className="p-3.5 rounded-2xl border border-stone-200 dark:border-stone-800 bg-stone-50/60 dark:bg-stone-800/40 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-stone-800 dark:text-stone-200 flex items-center gap-1.5">
                    <ImageIcon className="w-4 h-4 text-amber-600" />
                    Capa do Livro
                  </label>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => setCoverMode('upload')}
                      className={`px-2 py-0.5 rounded-md text-[11px] font-medium transition-colors flex items-center gap-1 ${
                        coverMode === 'upload'
                          ? 'bg-amber-600 text-white font-semibold'
                          : 'bg-white dark:bg-stone-800 text-stone-600 dark:text-stone-400 border border-stone-200 dark:border-stone-700'
                      }`}
                    >
                      <Upload className="w-3 h-3" />
                      Enviar Foto / Arquivo
                    </button>
                    <button
                      type="button"
                      onClick={() => setCoverMode('url')}
                      className={`px-2 py-0.5 rounded-md text-[11px] font-medium transition-colors flex items-center gap-1 ${
                        coverMode === 'url'
                          ? 'bg-amber-600 text-white font-semibold'
                          : 'bg-white dark:bg-stone-800 text-stone-600 dark:text-stone-400 border border-stone-200 dark:border-stone-700'
                      }`}
                    >
                      <LinkIcon className="w-3 h-3" />
                      Link da Web
                    </button>
                  </div>
                </div>

                {coverMode === 'upload' ? (
                  <div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileInputChange}
                      className="hidden"
                    />

                    {coverUrl ? (
                      /* Preview of uploaded image */
                      <div className="flex items-center gap-3.5 p-2.5 rounded-xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700">
                        <div className="w-14 h-20 shrink-0 rounded-md overflow-hidden bg-stone-200 shadow-sm border border-stone-300 dark:border-stone-600">
                          <img
                            src={coverUrl}
                            alt="Capa Carregada"
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex-1 min-w-0 text-xs space-y-1">
                          <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold text-xs">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Imagem pronta e otimizada!</span>
                          </div>
                          {uploadedCoverDetails && (
                            <p className="text-[11px] text-stone-500 dark:text-stone-400 truncate">
                              {uploadedCoverDetails.fileName} • {formatFileSize(uploadedCoverDetails.compressedSize)}
                            </p>
                          )}
                          <div className="flex gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => fileInputRef.current?.click()}
                              className="text-[11px] text-amber-600 dark:text-amber-400 hover:underline font-medium"
                            >
                              Trocar foto
                            </button>
                            <span className="text-stone-300">|</span>
                            <button
                              type="button"
                              onClick={handleRemoveCover}
                              className="text-[11px] text-rose-500 hover:underline font-medium flex items-center gap-1"
                            >
                              <Trash2 className="w-3 h-3" />
                              Remover
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* Drop zone / selector */
                      <div
                        onDragOver={(e) => {
                          e.preventDefault();
                          setIsDragging(true);
                        }}
                        onDragLeave={() => setIsDragging(false)}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                        className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-colors ${
                          isDragging
                            ? 'border-amber-500 bg-amber-50/50 dark:bg-stone-800'
                            : 'border-stone-300 dark:border-stone-700 hover:border-amber-500 hover:bg-stone-100/50 dark:hover:bg-stone-800/60'
                        }`}
                      >
                        {isCompressing ? (
                          <div className="py-2 flex flex-col items-center gap-1.5 text-stone-500">
                            <Loader2 className="w-6 h-6 animate-spin text-amber-600" />
                            <span className="text-xs font-medium">Otimizando e preparando imagem...</span>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center gap-1.5 text-stone-500 dark:text-stone-400">
                            <div className="w-9 h-9 rounded-full bg-amber-100 dark:bg-stone-700 text-amber-600 dark:text-amber-300 flex items-center justify-center">
                              <Upload className="w-4 h-4" />
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-stone-800 dark:text-stone-200">
                                Clique para escolher a foto ou arraste aqui
                              </p>
                              <p className="text-[10px] text-stone-400">
                                PNG, JPG ou WEBP (comprimida automaticamente para salvar rápido)
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {uploadError && (
                      <p className="text-[11px] text-rose-500 mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {uploadError}
                      </p>
                    )}
                  </div>
                ) : (
                  /* URL Mode */
                  <div>
                    <input
                      type="url"
                      value={coverUrl}
                      onChange={(e) => setCoverUrl(e.target.value)}
                      placeholder="https://exemplo.com/capa-do-livro.jpg"
                      className="w-full px-3 py-2 text-sm rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 placeholder:text-stone-400"
                    />
                    {coverUrl && (
                      <div className="mt-2 flex items-center gap-3 p-2 bg-white dark:bg-stone-800 rounded-lg border border-stone-200 dark:border-stone-700">
                        <img
                          src={coverUrl}
                          alt="Prévia"
                          className="w-10 h-14 object-cover rounded shadow-xs"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                        <div className="text-[11px] text-stone-500 truncate flex-1">
                          Prévia da imagem carregada via URL
                        </div>
                        <button
                          type="button"
                          onClick={() => setCoverUrl('')}
                          className="text-stone-400 hover:text-rose-500 p-1"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                    Editora
                  </label>
                  <input
                    type="text"
                    value={publisher}
                    onChange={(e) => setPublisher(e.target.value)}
                    placeholder="Ex: Companhia das Letras"
                    className="w-full px-3 py-2 text-sm rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                    Ano / Data
                  </label>
                  <input
                    type="text"
                    value={publishedDate}
                    onChange={(e) => setPublishedDate(e.target.value)}
                    placeholder="Ex: 2020"
                    className="w-full px-3 py-2 text-sm rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-stone-700 dark:text-stone-300">
                      ISBN
                    </label>
                    <button
                      type="button"
                      onClick={() => handleAutofillWithOpenLibraryIsbn(isbn)}
                      disabled={isFetchingIsbn || !isbn.trim()}
                      className="text-[10px] text-amber-600 dark:text-amber-400 hover:underline font-bold flex items-center gap-1 cursor-pointer disabled:opacity-40"
                    >
                      <Sparkles className="w-2.5 h-2.5" />
                      Open Library
                    </button>
                  </div>
                  <input
                    type="text"
                    value={isbn}
                    onChange={(e) => setIsbn(e.target.value)}
                    placeholder="Ex: 9788535914849"
                    className="w-full px-3 py-2 text-sm rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  Categorias / Gêneros (separados por vírgula)
                </label>
                <input
                  type="text"
                  value={categories}
                  onChange={(e) => setCategories(e.target.value)}
                  placeholder="Ex: Romance, Ficção, Filosofia"
                  className="w-full px-3 py-2 text-sm rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  Sinopse / Descrição
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Breve resumo sobre a história..."
                  className="w-full px-3 py-2 text-sm rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-semibold text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !title.trim()}
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-xs"
                >
                  {isSubmitting ? 'Salvando...' : 'Cadastrar Livro'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
