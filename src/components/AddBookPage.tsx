import React, { useState, useRef, useEffect } from 'react';
import { 
  ArrowLeft, 
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
import { compressImageFile, formatFileSize } from '@/utils/imageCompressor';

interface AddBookPageProps {
  onBack: () => void;
  onAddBook: (bookData: Omit<Book, 'id'>) => Promise<void>;
  settings: LibrarySettings;
  activeReader: 'ele' | 'ela';
}

export const AddBookPage: React.FC<AddBookPageProps> = ({
  onBack,
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

  const toggleApi = (id: ApiProviderId) => {
    setSelectedApis((prev) => {
      let next: ApiProviderId[];
      if (prev.includes(id)) {
        if (prev.length === 1) return prev;
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

  const selectAllApis = () => {
    const all: ApiProviderId[] = ['openlibrary', 'google', 'brasilapi', 'gutendex'];
    setSelectedApis(all);
    try {
      localStorage.setItem('nossa_estante_selected_book_apis', JSON.stringify(all));
    } catch {}
  };

  const handleIsbnAutofill = async () => {
    const cleanIsbn = isbn.replace(/[^0-9X]/gi, '');
    if (!cleanIsbn || (cleanIsbn.length !== 10 && cleanIsbn.length !== 13)) {
      setIsbnFeedback({
        type: 'error',
        message: 'Informe um ISBN válido de 10 ou 13 dígitos para preenchimento automático.',
      });
      return;
    }

    setIsFetchingIsbn(true);
    setIsbnFeedback({
      type: 'info',
      message: 'Consultando base mundial da Open Library...',
    });

    try {
      const bookData = await fetchBookByOpenLibraryIsbn(cleanIsbn);
      if (bookData) {
        if (bookData.title && !title) setTitle(bookData.title);
        if (bookData.authors && !authors) setAuthors(bookData.authors);
        if (bookData.pageCount && !pageCount) setPageCount(bookData.pageCount);
        if (bookData.publisher && !publisher) setPublisher(bookData.publisher);
        if (bookData.publishedDate && !publishedDate) setPublishedDate(bookData.publishedDate);
        if (bookData.description && !description) setDescription(bookData.description);
        if (bookData.categories && !categories) {
          setCategories(Array.isArray(bookData.categories) ? bookData.categories.join(', ') : String(bookData.categories));
        }
        if (bookData.coverUrl && !coverUrl) {
          setCoverUrl(bookData.coverUrl);
          setCoverMode('url');
        }

        setIsbnFeedback({
          type: 'success',
          message: `✓ Dados encontrados: "${bookData.title}" (${bookData.pageCount || '?'} págs)`,
        });
      } else {
        setIsbnFeedback({
          type: 'error',
          message: 'ISBN não localizado na Open Library. Você pode preencher manualmente.',
        });
      }
    } catch {
      setIsbnFeedback({
        type: 'error',
        message: 'Erro de conexão ao buscar o ISBN.',
      });
    } finally {
      setIsFetchingIsbn(false);
    }
  };

  const handleFileProcess = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setUploadError('Por favor, selecione um arquivo de imagem válido (JPG, PNG ou WEBP).');
      return;
    }

    setUploadError(null);
    setIsCompressing(true);

    try {
      const compressed = await compressImageFile(file, {
        maxWidth: 600,
        maxHeight: 900,
        quality: 0.8,
      });

      setCoverUrl(compressed.dataUrl);
      setUploadedCoverDetails({
        originalSize: compressed.originalSize,
        compressedSize: compressed.compressedSize,
        fileName: file.name,
      });
    } catch (err: any) {
      console.error('Falha ao comprimir imagem:', err);
      setUploadError(err.message || 'Falha ao processar e comprimir imagem da capa.');
    } finally {
      setIsCompressing(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileProcess(file);
    }
  };

  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    if (selectedApis.length === 0) {
      setSearchError('Selecione ao menos 1 API de livros para realizar a busca.');
      return;
    }

    setIsSearching(true);
    setSearchError(null);
    setHasSearched(true);
    setSearchResults([]);

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
        onIncrementalResults: (newItems, allItems) => {
          setSearchResults([...allItems]);
        },
      });
    } catch {
      setSearchError('Ocorreu um erro ao buscar os livros. Verifique sua conexão.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddFromSearch = async (bookResult: GoogleBookSearchResult) => {
    setIsSubmitting(true);
    try {
      const newBook = buildBookFromApi(bookResult, {
        status,
        assignedReader,
        owned,
      });
      await onAddBook(newBook);
      onBack();
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
      const parsedCategories = categories.trim()
        ? categories
            .split(',')
            .map((c) => c.trim())
            .filter(Boolean)
        : [];

      const manualMetadata: BookApiMetadata = {
        title: title.trim(),
        authors: authors.trim() || 'Autor Desconhecido',
        coverUrl: coverUrl.trim(),
        isbn: isbn.trim(),
        pageCount: pageCount === '' ? 0 : Number(pageCount),
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
      onBack();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full pb-24 animate-in fade-in duration-200">
      
      {/* Top Page Header Bar */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-200/80 dark:border-stone-800">
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
          
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                Nova Obra
              </span>
            </div>
            <h1 className="font-serif text-xl sm:text-2xl font-bold text-stone-900 dark:text-stone-100 leading-tight">
              Adicionar Livro à Estante
            </h1>
          </div>
        </div>

        {/* Tab switch control */}
        <div className="flex p-1 bg-stone-200/70 dark:bg-stone-800/80 rounded-2xl w-full sm:w-auto shadow-inner">
          <button
            type="button"
            onClick={() => setActiveTab('search')}
            className={`flex-1 sm:flex-initial px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'search'
                ? 'bg-white dark:bg-stone-900 text-amber-800 dark:text-amber-300 shadow-sm'
                : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
            }`}
          >
            <Search className="w-4 h-4" />
            <span>Busca Online nas APIs</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('manual')}
            className={`flex-1 sm:flex-initial px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'manual'
                ? 'bg-white dark:bg-stone-900 text-amber-800 dark:text-amber-300 shadow-sm'
                : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
            }`}
          >
            <Edit3 className="w-4 h-4" />
            <span>Cadastro Manual & Foto</span>
          </button>
        </div>
      </div>

      {/* Target Configuration Card (Posse, Leitor, Status Inicial) - Spacious & Mobile Friendly */}
      <div className="bg-white dark:bg-stone-900 rounded-3xl p-4 sm:p-6 border border-stone-200/80 dark:border-stone-800 shadow-xs mb-6">
        <h2 className="text-xs font-bold uppercase tracking-wider text-stone-400 mb-3 flex items-center gap-1.5">
          <Library className="w-3.5 h-3.5 text-amber-600" />
          <span>Destino & Classificação Inicial</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          
          {/* Posse do Livro */}
          <div className="bg-stone-50 dark:bg-stone-800/40 p-3 sm:p-4 rounded-2xl border border-stone-200/60 dark:border-stone-800">
            <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-2">
              Posse do Livro:
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => setOwned(true)}
                className={`py-2 px-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  owned
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-white dark:bg-stone-800 text-stone-600 dark:text-stone-400 border border-stone-200 dark:border-stone-700'
                }`}
              >
                <span>📦 Temos</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setOwned(false);
                  setStatus('quero_ler');
                }}
                className={`py-2 px-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  !owned
                    ? 'bg-violet-600 text-white shadow-xs'
                    : 'bg-white dark:bg-stone-800 text-stone-600 dark:text-stone-400 border border-stone-200 dark:border-stone-700'
                }`}
              >
                <span>🎁 Desejo</span>
              </button>
            </div>
          </div>

          {/* Leitor Atribuído */}
          <div className="bg-stone-50 dark:bg-stone-800/40 p-3 sm:p-4 rounded-2xl border border-stone-200/60 dark:border-stone-800">
            <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-2">
              Leitor Atribuído:
            </label>
            <select
              value={assignedReader}
              onChange={(e) => setAssignedReader(e.target.value as ReaderId)}
              className="w-full h-10 px-3 text-xs sm:text-sm rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 font-medium focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600"
            >
              <option value="ele">{settings.eleName} (Ele)</option>
              <option value="ela">{settings.elaName} (Ela)</option>
              <option value="ambos">Ambos / Conjunto</option>
            </select>
          </div>

          {/* Status Inicial */}
          <div className="bg-stone-50 dark:bg-stone-800/40 p-3 sm:p-4 rounded-2xl border border-stone-200/60 dark:border-stone-800">
            <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-2">
              Status Inicial:
            </label>
            <select
              value={status}
              disabled={!owned}
              onChange={(e) => setStatus(e.target.value as BookStatus)}
              className="w-full h-10 px-3 text-xs sm:text-sm rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 font-medium disabled:opacity-50 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600"
            >
              <option value="quero_ler">Quero Ler</option>
              <option value="lendo">Lendo Atualmente</option>
              <option value="lido">Já Lido</option>
              <option value="pausado">Pausado</option>
              <option value="abandonado">Abandonado</option>
            </select>
          </div>

        </div>
      </div>

      {/* Main Tab Content */}
      {activeTab === 'search' ? (
        <div className="space-y-6">
          
          {/* Search Controls Card */}
          <div className="bg-white dark:bg-stone-900 rounded-3xl p-4 sm:p-6 border border-stone-200/80 dark:border-stone-800 shadow-xs space-y-4">
            
            {/* Long Search Bar */}
            <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <div className="relative flex-1">
                <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Digite o título do livro, autor ou código ISBN..."
                  className="w-full h-12 sm:h-14 pl-12 pr-4 rounded-2xl border border-stone-300 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-800/60 text-stone-900 dark:text-stone-100 text-sm sm:text-base focus:bg-white dark:focus:bg-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-600 transition-all shadow-inner"
                />
              </div>
              <button
                type="submit"
                disabled={isSearching || !searchQuery.trim()}
                className="h-12 sm:h-14 px-6 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-2xl text-sm font-semibold flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer shrink-0"
              >
                {isSearching ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Buscando...</span>
                  </>
                ) : (
                  <>
                    <Search className="w-5 h-5" />
                    <span>Pesquisar Livros</span>
                  </>
                )}
              </button>
            </form>

            {/* API Selector Controls with Presets */}
            <div className="pt-3 border-t border-stone-100 dark:border-stone-800 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-stone-700 dark:text-stone-300">
                  <Globe className="w-4 h-4 text-amber-600" />
                  <span>Selecione onde pesquisar:</span>
                  <span className="text-[11px] text-stone-400 font-normal">
                    ({selectedApis.length} de {SELECTABLE_API_PROVIDERS.length} ativas)
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={selectOnlyOpenLibrary}
                    className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-colors ${
                      selectedApis.length === 1 && selectedApis.includes('openlibrary')
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 font-semibold'
                        : 'text-stone-500 hover:bg-stone-200/60 dark:hover:bg-stone-800'
                    }`}
                  >
                    ⚡ Só Open Library
                  </button>
                  <button
                    type="button"
                    onClick={selectFastestApis}
                    className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-colors ${
                      selectedApis.length === 2 && selectedApis.includes('openlibrary') && selectedApis.includes('google')
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 font-semibold'
                        : 'text-stone-500 hover:bg-stone-200/60 dark:hover:bg-stone-800'
                    }`}
                  >
                    🚀 OL + Google
                  </button>
                  <button
                    type="button"
                    onClick={selectAllApis}
                    className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-colors ${
                      selectedApis.length === SELECTABLE_API_PROVIDERS.length
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 font-semibold'
                        : 'text-stone-500 hover:bg-stone-200/60 dark:hover:bg-stone-800'
                    }`}
                  >
                    🌐 Todas (4)
                  </button>
                </div>
              </div>

              {/* API Toggle Chips */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {SELECTABLE_API_PROVIDERS.map((provider) => {
                  const isChecked = selectedApis.includes(provider.id);
                  const status = apiStatuses[provider.id];

                  return (
                    <button
                      key={provider.id}
                      type="button"
                      onClick={() => toggleApi(provider.id)}
                      className={`flex items-center justify-between p-2.5 sm:p-3 rounded-2xl border text-left transition-all ${
                        isChecked
                          ? 'border-amber-300 dark:border-amber-700/60 bg-amber-50/40 dark:bg-stone-800/80 shadow-2xs'
                          : 'border-stone-200 dark:border-stone-800 bg-stone-50/40 dark:bg-stone-900/40 opacity-60 hover:opacity-100'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`w-4 h-4 rounded-md flex items-center justify-center shrink-0 text-white text-xs ${
                            isChecked ? 'bg-amber-600' : 'border border-stone-400 dark:border-stone-600'
                          }`}
                        >
                          {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                        <div className="truncate">
                          <div className="text-xs font-semibold text-stone-800 dark:text-stone-200 truncate">
                            {provider.badge}
                          </div>
                          <div className="text-[10px] text-stone-400 truncate">
                            {provider.speed}
                          </div>
                        </div>
                      </div>

                      {/* Live status badge */}
                      {status && isChecked && (
                        <div className="ml-1 shrink-0">
                          {status.state === 'searching' && (
                            <Loader2 className="w-3.5 h-3.5 text-amber-500 animate-spin" />
                          )}
                          {status.state === 'success' && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                              +{status.count}
                            </span>
                          )}
                          {status.state === 'empty' && (
                            <span className="text-[10px] text-stone-400 font-medium">
                              0
                            </span>
                          )}
                          {status.state === 'error' && (
                            <span className="text-[10px] text-rose-500 font-medium" title={status.error}>
                              erro
                            </span>
                          )}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {searchError && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800/50 rounded-2xl text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{searchError}</span>
              </div>
            )}
          </div>

          {/* Search Results Area */}
          <div>
            {isSearching && searchResults.length === 0 ? (
              <div className="py-20 text-center space-y-3 bg-white dark:bg-stone-900 rounded-3xl border border-stone-200/80 dark:border-stone-800">
                <Loader2 className="w-8 h-8 animate-spin mx-auto text-amber-600" />
                <p className="font-serif text-sm text-stone-600 dark:text-stone-300">
                  Consultando APIs em tempo real...
                </p>
                <p className="text-xs text-stone-400">
                  Os livros aparecem assim que cada catálogo responder.
                </p>
              </div>
            ) : hasSearched && searchResults.length === 0 ? (
              <div className="py-20 text-center space-y-2 bg-white dark:bg-stone-900 rounded-3xl border border-stone-200/80 dark:border-stone-800">
                <BookOpen className="w-12 h-12 text-stone-300 dark:text-stone-700 mx-auto" />
                <p className="text-sm font-semibold text-stone-700 dark:text-stone-300">
                  Nenhum livro encontrado
                </p>
                <p className="text-xs text-stone-400 max-w-sm mx-auto">
                  Tente simplificar o nome do livro, verificar a ortografia ou habilitar mais APIs acima.
                </p>
              </div>
            ) : searchResults.length > 0 ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between px-1">
                  <span className="text-xs font-semibold text-stone-500">
                    Resultados encontrados ({searchResults.length}):
                  </span>
                  {isSearching && (
                    <span className="text-xs text-amber-600 flex items-center gap-1 font-medium">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Mais fontes respondendo...
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                  {searchResults.map((bookResult, idx) => (
                    <div
                      key={`${bookResult.isbn || bookResult.title}-${idx}`}
                      className="bg-white dark:bg-stone-900 rounded-3xl p-4 border border-stone-200/80 dark:border-stone-800 shadow-xs hover:border-amber-300 dark:hover:border-amber-700 transition-all flex gap-3.5 items-start group"
                    >
                      {/* Cover Thumbnail */}
                      <div className="w-20 sm:w-24 aspect-2/3 rounded-xl overflow-hidden bg-stone-100 dark:bg-stone-800 shrink-0 relative shadow-xs flex items-center justify-center">
                        {bookResult.coverUrl ? (
                          <img
                            src={bookResult.coverUrl}
                            alt={bookResult.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center p-2 text-center text-stone-400">
                            <BookOpen className="w-6 h-6 mb-1 opacity-50" />
                            <span className="text-[9px] font-serif leading-tight line-clamp-2">
                              {bookResult.title}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Metadata & Add Action */}
                      <div className="flex-1 min-w-0 flex flex-col justify-between self-stretch">
                        <div>
                          <h3 className="font-serif text-sm sm:text-base font-bold text-stone-900 dark:text-stone-100 line-clamp-2 leading-snug">
                            {bookResult.title}
                          </h3>
                          <p className="text-xs text-stone-600 dark:text-stone-400 mt-0.5 line-clamp-1">
                            {bookResult.authors || 'Autor Desconhecido'}
                          </p>

                          <div className="flex flex-wrap items-center gap-2 mt-2 text-[10px] text-stone-400">
                            {bookResult.publishedDate && (
                              <span>Ano: {bookResult.publishedDate.slice(0, 4)}</span>
                            )}
                            {bookResult.pageCount && (
                              <span>• {bookResult.pageCount} págs</span>
                            )}
                            {bookResult.isbn && (
                              <span className="font-mono bg-stone-100 dark:bg-stone-800 px-1.5 py-0.5 rounded">
                                ISBN: {bookResult.isbn}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="pt-3 mt-2 border-t border-stone-100 dark:border-stone-800 flex items-center justify-end">
                          <button
                            type="button"
                            disabled={isSubmitting}
                            onClick={() => handleAddFromSearch(bookResult)}
                            className="w-full sm:w-auto px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 shadow-2xs transition-all cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Adicionar à Estante</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="py-16 text-center space-y-3 bg-white dark:bg-stone-900 rounded-3xl border border-stone-200/80 dark:border-stone-800 p-6">
                <div className="w-16 h-16 rounded-2xl bg-amber-100/60 dark:bg-amber-950/40 text-amber-600 flex items-center justify-center mx-auto">
                  <Search className="w-8 h-8" />
                </div>
                <h3 className="font-serif text-base font-bold text-stone-800 dark:text-stone-200">
                  Encontre livros pelo título ou ISBN
                </h3>
                <p className="text-xs text-stone-500 dark:text-stone-400 max-w-sm mx-auto">
                  Digite o nome da obra acima para buscar nas maiores bases mundiais e adicionar com um clique à sua estante compartilhada.
                </p>
              </div>
            )}
          </div>

        </div>
      ) : (
        /* Manual Form Tab - Spacious and optimized for Mobile screens */
        <form onSubmit={handleManualSubmit} className="space-y-6">
          
          {/* Section 1: Identificação da Obra */}
          <div className="bg-white dark:bg-stone-900 rounded-3xl p-4 sm:p-6 border border-stone-200/80 dark:border-stone-800 shadow-xs space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-stone-400 flex items-center gap-1.5">
              <Edit3 className="w-3.5 h-3.5 text-amber-600" />
              <span>1. Identificação da Obra</span>
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1.5">
                  Título do Livro <span className="text-amber-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: O Pequeno Príncipe"
                  className="w-full h-11 px-4 text-sm sm:text-base rounded-2xl border border-stone-300 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-800/60 text-stone-900 dark:text-stone-100 focus:bg-white dark:focus:bg-stone-800 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1.5">
                  Autor(es)
                </label>
                <input
                  type="text"
                  value={authors}
                  onChange={(e) => setAuthors(e.target.value)}
                  placeholder="Ex: Antoine de Saint-Exupéry"
                  className="w-full h-11 px-4 text-sm sm:text-base rounded-2xl border border-stone-300 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-800/60 text-stone-900 dark:text-stone-100 focus:bg-white dark:focus:bg-stone-800 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600"
                />
              </div>

              {/* ISBN with Autofill Button */}
              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1.5">
                  ISBN-10 ou ISBN-13
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Barcode className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
                    <input
                      type="text"
                      value={isbn}
                      onChange={(e) => setIsbn(e.target.value)}
                      placeholder="Ex: 9788520933114"
                      className="w-full h-11 pl-10 pr-3 text-sm rounded-2xl border border-stone-300 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-800/60 text-stone-900 dark:text-stone-100 font-mono focus:bg-white dark:focus:bg-stone-800 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleIsbnAutofill}
                    disabled={isFetchingIsbn || !isbn.trim()}
                    className="h-11 px-3 sm:px-4 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-300/80 dark:border-amber-700/60 hover:bg-amber-100 dark:hover:bg-amber-900/40 rounded-2xl text-xs font-semibold flex items-center gap-1.5 shrink-0 transition-colors disabled:opacity-50 cursor-pointer shadow-2xs"
                  >
                    {isFetchingIsbn ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                    )}
                    <span>Preencher via ISBN</span>
                  </button>
                </div>
                {isbnFeedback && (
                  <p
                    className={`text-[11px] mt-1.5 font-medium ${
                      isbnFeedback.type === 'success'
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : isbnFeedback.type === 'error'
                        ? 'text-rose-600 dark:text-rose-400'
                        : 'text-amber-600 dark:text-amber-400'
                    }`}
                  >
                    {isbnFeedback.message}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Section 2: Capa do Livro (Upload com Compressão ou Link) */}
          <div className="bg-white dark:bg-stone-900 rounded-3xl p-4 sm:p-6 border border-stone-200/80 dark:border-stone-800 shadow-xs space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-stone-400 flex items-center gap-1.5">
              <ImageIcon className="w-3.5 h-3.5 text-amber-600" />
              <span>2. Capa do Livro</span>
            </h2>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setCoverMode('upload')}
                className={`flex-1 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  coverMode === 'upload'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400'
                }`}
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Foto do Celular / Arquivo</span>
              </button>
              <button
                type="button"
                onClick={() => setCoverMode('url')}
                className={`flex-1 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  coverMode === 'url'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400'
                }`}
              >
                <LinkIcon className="w-3.5 h-3.5" />
                <span>Link / URL da Imagem</span>
              </button>
            </div>

            {coverMode === 'upload' ? (
              <div className="space-y-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileProcess(file);
                  }}
                  className="hidden"
                />

                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-3xl p-6 sm:p-8 text-center cursor-pointer transition-all ${
                    isDragging
                      ? 'border-amber-500 bg-amber-50/60 dark:bg-amber-950/30'
                      : 'border-stone-300 dark:border-stone-700 bg-stone-50/40 dark:bg-stone-800/30 hover:border-amber-400'
                  }`}
                >
                  <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-950 text-amber-600 flex items-center justify-center mx-auto mb-2">
                    <Upload className="w-6 h-6" />
                  </div>
                  <p className="text-xs sm:text-sm font-semibold text-stone-800 dark:text-stone-200">
                    Clique para selecionar foto ou tire com a câmera
                  </p>
                  <p className="text-[11px] text-stone-400 mt-1">
                    Comprime automaticamente para salvar instantaneamente sem lentidão
                  </p>
                </div>

                {isCompressing && (
                  <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-2xl flex items-center gap-2 text-xs text-amber-800 dark:text-amber-300">
                    <Loader2 className="w-4 h-4 animate-spin text-amber-600" />
                    <span>Otimizando e comprimindo imagem da capa...</span>
                  </div>
                )}

                {uploadError && (
                  <p className="text-xs text-rose-500">{uploadError}</p>
                )}

                {coverUrl && uploadedCoverDetails && (
                  <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/40 rounded-2xl flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>
                        Otimizada: {formatFileSize(uploadedCoverDetails.compressedSize)} (de {formatFileSize(uploadedCoverDetails.originalSize)})
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setCoverUrl('');
                        setUploadedCoverDetails(null);
                      }}
                      className="text-stone-400 hover:text-rose-500 p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div>
                <input
                  type="url"
                  value={coverUrl}
                  onChange={(e) => setCoverUrl(e.target.value)}
                  placeholder="https://exemplo.com/capa.jpg"
                  className="w-full h-11 px-4 text-sm rounded-2xl border border-stone-300 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-800/60 text-stone-900 dark:text-stone-100 focus:bg-white dark:focus:bg-stone-800 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600"
                />
              </div>
            )}

            {/* Preview of Cover */}
            {coverUrl && (
              <div className="flex items-center gap-3 pt-2">
                <div className="w-16 aspect-2/3 rounded-xl overflow-hidden shadow-md bg-stone-200 dark:bg-stone-800 shrink-0">
                  <img src={coverUrl} alt="Preview" className="w-full h-full object-cover" />
                </div>
                <div className="text-xs">
                  <p className="font-semibold text-stone-800 dark:text-stone-200">Pré-visualização da Capa</p>
                  <p className="text-stone-400 text-[11px]">Essa imagem aparecerá na grade da estante</p>
                </div>
              </div>
            )}
          </div>

          {/* Section 3: Detalhes da Edição */}
          <div className="bg-white dark:bg-stone-900 rounded-3xl p-4 sm:p-6 border border-stone-200/80 dark:border-stone-800 shadow-xs space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-stone-400 flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-amber-600" />
              <span>3. Detalhes da Edição</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1.5">
                  Número de Páginas
                </label>
                <input
                  type="number"
                  min="0"
                  value={pageCount}
                  onChange={(e) => setPageCount(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="Ex: 320"
                  className="w-full h-11 px-4 text-sm rounded-2xl border border-stone-300 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-800/60 text-stone-900 dark:text-stone-100 focus:bg-white dark:focus:bg-stone-800 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1.5">
                  Editora
                </label>
                <input
                  type="text"
                  value={publisher}
                  onChange={(e) => setPublisher(e.target.value)}
                  placeholder="Ex: Companhia das Letras"
                  className="w-full h-11 px-4 text-sm rounded-2xl border border-stone-300 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-800/60 text-stone-900 dark:text-stone-100 focus:bg-white dark:focus:bg-stone-800 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1.5">
                  Ano / Data de Publicação
                </label>
                <input
                  type="text"
                  value={publishedDate}
                  onChange={(e) => setPublishedDate(e.target.value)}
                  placeholder="Ex: 2021 ou 2021-08-15"
                  className="w-full h-11 px-4 text-sm rounded-2xl border border-stone-300 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-800/60 text-stone-900 dark:text-stone-100 focus:bg-white dark:focus:bg-stone-800 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1.5">
                  Gênero / Categorias
                </label>
                <input
                  type="text"
                  value={categories}
                  onChange={(e) => setCategories(e.target.value)}
                  placeholder="Ex: Ficção, Fantasia, Romance"
                  className="w-full h-11 px-4 text-sm rounded-2xl border border-stone-300 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-800/60 text-stone-900 dark:text-stone-100 focus:bg-white dark:focus:bg-stone-800 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1.5">
                Sinopse / Descrição
              </label>
              <textarea
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Breve resumo sobre a história..."
                className="w-full p-4 text-sm rounded-2xl border border-stone-300 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-800/60 text-stone-900 dark:text-stone-100 focus:bg-white dark:focus:bg-stone-800 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600"
              />
            </div>
          </div>

          {/* Sticky Mobile Action Bar */}
          <div className="fixed bottom-0 left-0 right-0 p-3 sm:p-4 bg-white/95 dark:bg-stone-900/95 backdrop-blur-md border-t border-stone-200 dark:border-stone-800 z-30 flex items-center justify-between max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <button
              type="button"
              onClick={onBack}
              className="px-4 py-2.5 text-xs sm:text-sm font-semibold text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !title.trim()}
              className="px-6 py-2.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 shadow-sm cursor-pointer transition-colors"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Cadastrando...</span>
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  <span>Cadastrar na Estante</span>
                </>
              )}
            </button>
          </div>

        </form>
      )}

    </div>
  );
};
