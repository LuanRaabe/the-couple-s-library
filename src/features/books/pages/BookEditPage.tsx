import React, { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Save, 
  Loader2, 
  Search, 
  Upload, 
  Link as LinkIcon, 
  Sparkles, 
  Image as ImageIcon, 
  Trash2, 
  Check, 
  Globe, 
  Barcode, 
  AlertCircle, 
  CheckCircle2, 
  BookOpen, 
  Library,
  Edit3
} from 'lucide-react';
import { 
  Book, 
  BookStatus, 
  ReaderId, 
  searchCoversStream, 
  CoverOption, 
  SELECTABLE_API_PROVIDERS, 
  ApiProviderId, 
  ApiSearchStatus, 
  fetchBookByOpenLibraryIsbn 
} from '@/features/books';
import { useLibraryContext } from '@/shared/context/LibraryContext';
import { compressImageFile, formatFileSize } from '@/utils/imageCompressor';

export const BookEditPage: React.FC = () => {
  const { bookId } = useParams<{ bookId: string }>();
  const navigate = useNavigate();

  const {
    books,
    settings,
    handleUpdateBook,
    handleDeleteBook,
  } = useLibraryContext();

  const currentBook = books.find((b) => b.id === bookId);

  // Form states
  const [title, setTitle] = useState('');
  const [authors, setAuthors] = useState('');
  const [isbn, setIsbn] = useState('');
  const [pageCount, setPageCount] = useState<number | ''>('');
  const [publisher, setPublisher] = useState('');
  const [publishedDate, setPublishedDate] = useState('');
  const [description, setDescription] = useState('');
  const [categories, setCategories] = useState('');
  const [status, setStatus] = useState<BookStatus>('quero_ler');
  const [assignedReader, setAssignedReader] = useState<ReaderId>('ele');
  const [owned, setOwned] = useState<boolean>(true);

  // Cover section states (INLINE, NO MODALS!)
  const [coverMode, setCoverMode] = useState<'search' | 'upload' | 'url'>('search');
  const [coverUrl, setCoverUrl] = useState('');
  const [isCompressing, setIsCompressing] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadedDetails, setUploadedDetails] = useState<{
    originalSize: number;
    compressedSize: number;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Embedded Cover API search states
  const [coverSearchTerm, setCoverSearchTerm] = useState('');
  const [coverSearchAuthor, setCoverSearchAuthor] = useState('');
  const [coverSearchIsbn, setCoverSearchIsbn] = useState('');
  const [selectedApis, setSelectedApis] = useState<ApiProviderId[]>(['openlibrary', 'google']);
  const [apiStatuses, setApiStatuses] = useState<Record<string, ApiSearchStatus>>({});
  const [discoveredCovers, setDiscoveredCovers] = useState<CoverOption[]>([]);
  const [isSearchingCovers, setIsSearchingCovers] = useState(false);
  const [hasSearchedCovers, setHasSearchedCovers] = useState(false);

  // ISBN autofill feedback
  const [isFetchingIsbn, setIsFetchingIsbn] = useState(false);
  const [isbnFeedback, setIsbnFeedback] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  // Submit and delete states
  const [isSaving, setIsSaving] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Initialize form when book loads
  useEffect(() => {
    if (currentBook) {
      setTitle(currentBook.title || '');
      setAuthors(currentBook.authors || '');
      setIsbn(currentBook.isbn || '');
      setPageCount(currentBook.pageCount !== undefined ? currentBook.pageCount : '');
      setPublisher(currentBook.publisher || '');
      setPublishedDate(currentBook.publishedDate || '');
      setDescription(currentBook.description || '');
      setCategories(Array.isArray(currentBook.categories) ? currentBook.categories.join(', ') : (currentBook.categories || ''));
      setStatus(currentBook.status || 'quero_ler');
      setAssignedReader(currentBook.assignedReader || 'ele');
      setOwned(currentBook.owned !== false);
      setCoverUrl(currentBook.coverUrl || '');

      setCoverSearchTerm(currentBook.title || '');
      setCoverSearchAuthor(currentBook.authors || '');
      setCoverSearchIsbn(currentBook.isbn || '');
    }
  }, [currentBook]);

  if (!currentBook) {
    return (
      <div className="py-20 text-center space-y-4 bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 max-w-lg mx-auto p-6">
        <BookOpen className="w-14 h-14 text-stone-300 dark:text-stone-700 mx-auto" />
        <div className="space-y-1">
          <h2 className="font-serif text-lg font-bold text-stone-900 dark:text-stone-100">
            Livro não localizado para edição
          </h2>
          <p className="text-xs text-stone-500 dark:text-stone-400">
            O livro solicitado pode ter sido excluído.
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/books')}
          className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar para a Estante</span>
        </button>
      </div>
    );
  }

  // Toggle API for cover searching
  const toggleApi = (id: ApiProviderId) => {
    setSelectedApis((prev) => {
      if (prev.includes(id)) {
        if (prev.length === 1) return prev;
        return prev.filter((p) => p !== id);
      }
      return [...prev, id];
    });
  };

  // Perform cover search (triggered strictly by user click!)
  const handlePerformCoverSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!coverSearchTerm.trim() && !coverSearchIsbn.trim()) return;

    setIsSearchingCovers(true);
    setHasSearchedCovers(true);
    setDiscoveredCovers([]);

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
      await searchCoversStream(
        coverSearchTerm.trim(),
        coverSearchAuthor.trim() || undefined,
        coverSearchIsbn.trim() || undefined,
        selectedApis,
        {
          onProviderStatus: (providerId, status) => {
            setApiStatuses((prev) => ({
              ...prev,
              [providerId]: status,
            }));
          },
          onIncrementalCovers: (newCovers, allAccumulated) => {
            setDiscoveredCovers([...allAccumulated]);
          },
        }
      );
    } catch (err) {
      console.error('Erro na busca de capas:', err);
    } finally {
      setIsSearchingCovers(false);
    }
  };

  // Process file upload with compression
  const handleFileUpload = async (file: File) => {
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
        quality: 0.82,
      });

      setCoverUrl(compressed.dataUrl);
      setUploadedDetails({
        originalSize: compressed.originalSize,
        compressedSize: compressed.compressedSize,
      });
    } catch (err: any) {
      console.error('Falha ao comprimir imagem:', err);
      setUploadError(err.message || 'Falha ao processar e comprimir imagem da capa.');
    } finally {
      setIsCompressing(false);
    }
  };

  // Autofill ISBN
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

  // Submit edits
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsSaving(true);
    try {
      const updatedBook: Book = {
        ...currentBook,
        title: title.trim(),
        authors: authors.trim() || 'Autor Desconhecido',
        isbn: isbn.trim(),
        coverUrl: coverUrl.trim(),
        pageCount: pageCount === '' ? 0 : Number(pageCount),
        publisher: publisher.trim(),
        publishedDate: publishedDate.trim(),
        description: description.trim(),
        categories: categories.trim()
          ? categories
              .split(',')
              .map((c) => c.trim())
              .filter(Boolean)
          : [],
        status: owned ? status : 'quero_ler',
        assignedReader,
        owned,
      };

      await handleUpdateBook(updatedBook);
      navigate(`/books/${currentBook.id}`);
    } catch (err) {
      console.error('Erro ao atualizar livro:', err);
      alert('Falha ao salvar as alterações no banco de dados.');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle deletion
  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await handleDeleteBook(currentBook.id);
      navigate('/books');
    } catch (err) {
      console.error('Erro ao excluir livro:', err);
      alert('Erro ao excluir livro.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-28 animate-in fade-in duration-150">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-200/80 dark:border-stone-800">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(`/books/${currentBook.id}`)}
            className="p-2 sm:px-3 sm:py-2 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors flex items-center gap-1.5 font-medium text-xs sm:text-sm cursor-pointer shadow-2xs shrink-0"
            title="Voltar para a página do livro"
          >
            <ArrowLeft className="w-4 h-4 text-amber-600" />
            <span>Voltar para Detalhes</span>
          </button>
          
          <div className="min-w-0">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
              Modo de Edição
            </span>
            <h1 className="font-serif text-xl sm:text-2xl font-bold text-stone-900 dark:text-stone-100 leading-tight truncate">
              Editar "{currentBook.title}"
            </h1>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* SECTION 1: CAPA DO LIVRO (TOTALMENTE INLINE, SEM NENHUM MODAL!) */}
        <div className="bg-white dark:bg-stone-900 rounded-3xl p-5 sm:p-7 border border-stone-200/80 dark:border-stone-800 shadow-xs space-y-5">
          <div className="flex items-center gap-2 pb-1 border-b border-stone-100 dark:border-stone-800">
            <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 flex items-center justify-center">
              <ImageIcon className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-serif text-base font-bold text-stone-900 dark:text-stone-100">
                1. Capa do Livro (Pesquisa ou Upload Direto)
              </h2>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Selecione capas nas APIs mundiais, envie uma foto do dispositivo ou informe o link da imagem
              </p>
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-6 items-start">
            
            {/* Current Selected Cover Preview Box */}
            <div className="flex flex-col items-center gap-2.5 w-full md:w-44 shrink-0 bg-stone-50/60 dark:bg-stone-800/40 p-4 rounded-2xl border border-stone-200/60 dark:border-stone-800">
              <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wide">
                Capa Atual
              </span>
              <div className="w-32 aspect-2/3 rounded-xl overflow-hidden shadow-md bg-stone-200 dark:bg-stone-800 border border-stone-300/60 dark:border-stone-700 relative flex items-center justify-center">
                {coverUrl ? (
                  <img
                    src={coverUrl}
                    alt="Capa selecionada"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="p-2 text-center text-stone-400 text-xs flex flex-col items-center gap-1">
                    <BookOpen className="w-8 h-8 opacity-40" />
                    <span>Sem capa</span>
                  </div>
                )}
              </div>
              {coverUrl && (
                <button
                  type="button"
                  onClick={() => setCoverUrl('')}
                  className="text-stone-400 hover:text-rose-500 text-[11px] font-semibold flex items-center gap-1 transition-colors"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Remover capa</span>
                </button>
              )}
            </div>

            {/* Embedded Inline Cover Tools (Tabs: Search APIs, Upload, URL) */}
            <div className="flex-1 w-full space-y-4">
              
              {/* Cover Source Selector Tabs */}
              <div className="flex p-1 bg-stone-100 dark:bg-stone-800 rounded-2xl text-xs font-semibold gap-1">
                <button
                  type="button"
                  onClick={() => setCoverMode('search')}
                  className={`flex-1 py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    coverMode === 'search'
                      ? 'bg-white dark:bg-stone-900 text-amber-800 dark:text-amber-300 shadow-2xs font-bold'
                      : 'text-stone-600 dark:text-stone-400'
                  }`}
                >
                  <Search className="w-3.5 h-3.5 text-amber-600" />
                  <span>Buscar nas APIs</span>
                </button>

                <button
                  type="button"
                  onClick={() => setCoverMode('upload')}
                  className={`flex-1 py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    coverMode === 'upload'
                      ? 'bg-white dark:bg-stone-900 text-amber-800 dark:text-amber-300 shadow-2xs font-bold'
                      : 'text-stone-600 dark:text-stone-400'
                  }`}
                >
                  <Upload className="w-3.5 h-3.5 text-amber-600" />
                  <span>Foto / Arquivo</span>
                </button>

                <button
                  type="button"
                  onClick={() => setCoverMode('url')}
                  className={`flex-1 py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    coverMode === 'url'
                      ? 'bg-white dark:bg-stone-900 text-amber-800 dark:text-amber-300 shadow-2xs font-bold'
                      : 'text-stone-600 dark:text-stone-400'
                  }`}
                >
                  <LinkIcon className="w-3.5 h-3.5 text-amber-600" />
                  <span>URL Direta</span>
                </button>
              </div>

              {/* TAB 1: BUSCA NAS APIS (INLINE, TOTALMENTE INTEGRADA NA PÁGINA) */}
              {coverMode === 'search' && (
                <div className="space-y-3 bg-stone-50/70 dark:bg-stone-800/40 p-4 rounded-2xl border border-stone-200/60 dark:border-stone-800">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[11px] font-semibold text-stone-600 dark:text-stone-300 mb-1">
                        Título para busca:
                      </label>
                      <input
                        type="text"
                        value={coverSearchTerm}
                        onChange={(e) => setCoverSearchTerm(e.target.value)}
                        placeholder="Título do livro..."
                        className="w-full px-3 py-1.5 text-xs rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-stone-600 dark:text-stone-300 mb-1">
                        Autor (Opcional):
                      </label>
                      <input
                        type="text"
                        value={coverSearchAuthor}
                        onChange={(e) => setCoverSearchAuthor(e.target.value)}
                        placeholder="Nome do autor..."
                        className="w-full px-3 py-1.5 text-xs rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-stone-600 dark:text-stone-300 mb-1">
                        ISBN (Opcional):
                      </label>
                      <input
                        type="text"
                        value={coverSearchIsbn}
                        onChange={(e) => setCoverSearchIsbn(e.target.value)}
                        placeholder="ISBN..."
                        className="w-full px-3 py-1.5 text-xs rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 font-mono"
                      />
                    </div>
                  </div>

                  {/* API Selector Chips */}
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[11px] font-semibold text-stone-600 dark:text-stone-400 block">
                      APIs consultadas:
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                      {SELECTABLE_API_PROVIDERS.map((provider) => {
                        const isChecked = selectedApis.includes(provider.id);
                        const status = apiStatuses[provider.id];

                        return (
                          <button
                            key={provider.id}
                            type="button"
                            onClick={() => toggleApi(provider.id)}
                            className={`flex items-center justify-between p-2 rounded-xl border text-left text-xs transition-all cursor-pointer ${
                              isChecked
                                ? 'border-amber-300 dark:border-amber-700 bg-white dark:bg-stone-800'
                                : 'border-stone-200 dark:border-stone-800 bg-stone-100/50 opacity-60'
                            }`}
                          >
                            <span className="font-semibold text-stone-800 dark:text-stone-200 truncate text-[11px]">
                              {provider.badge}
                            </span>
                            {status && isChecked && (
                              <span className="text-[10px] text-amber-600">
                                {status.state === 'searching' && <Loader2 className="w-3 h-3 animate-spin inline" />}
                                {status.state === 'success' && `+${status.count}`}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Search Button */}
                  <div className="pt-2 flex justify-end">
                    <button
                      type="button"
                      disabled={isSearchingCovers || (!coverSearchTerm.trim() && !coverSearchIsbn.trim())}
                      onClick={() => handlePerformCoverSearch()}
                      className="px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-2xs cursor-pointer transition-colors"
                    >
                      {isSearchingCovers ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Pesquisando nas APIs...</span>
                        </>
                      ) : (
                        <>
                          <Search className="w-3.5 h-3.5" />
                          <span>Pesquisar Capas</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Discovered Covers Inline Grid */}
                  {isSearchingCovers && discoveredCovers.length === 0 ? (
                    <div className="py-8 text-center space-y-2 bg-white dark:bg-stone-800/60 rounded-xl border border-stone-200/60 dark:border-stone-700">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto text-amber-600" />
                      <p className="text-xs text-stone-500">
                        Consultando as APIs selecionadas...
                      </p>
                    </div>
                  ) : hasSearchedCovers && discoveredCovers.length === 0 ? (
                    <p className="text-xs text-stone-400 text-center py-4">
                      Nenhuma capa encontrada para estes termos. Tente simplificar o título ou marcar mais APIs.
                    </p>
                  ) : discoveredCovers.length > 0 ? (
                    <div className="pt-2 space-y-2">
                      <span className="text-[11px] font-bold text-stone-500 block">
                        Capas encontradas (clique para aplicar):
                      </span>
                      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2.5 max-h-72 overflow-y-auto pr-1">
                        {discoveredCovers.map((cov) => {
                          const isSelected = coverUrl === cov.url;
                          return (
                            <div
                              key={cov.id}
                              onClick={() => setCoverUrl(cov.url)}
                              className={`relative aspect-2/3 rounded-xl overflow-hidden border-2 transition-all cursor-pointer group bg-stone-100 dark:bg-stone-800 ${
                                isSelected
                                  ? 'border-amber-600 ring-2 ring-amber-500/20 shadow-md scale-98'
                                  : 'border-stone-200 dark:border-stone-700 hover:border-amber-400'
                              }`}
                            >
                              <img
                                src={cov.url}
                                alt={cov.title}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  (e.target as HTMLElement).style.display = 'none';
                                }}
                              />
                              <div className="absolute top-1 left-1 bg-black/60 text-white text-[9px] px-1 py-0.2 rounded font-bold truncate max-w-[90%]">
                                {cov.sourceBadge}
                              </div>
                              {isSelected && (
                                <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-amber-600 text-white flex items-center justify-center shadow-md">
                                  <Check className="w-3 h-3 stroke-[3]" />
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}
                </div>
              )}

              {/* TAB 2: UPLOAD DE FOTO (INLINE) */}
              {coverMode === 'upload' && (
                <div className="space-y-3 bg-stone-50/70 dark:bg-stone-800/40 p-4 rounded-2xl border border-stone-200/60 dark:border-stone-800">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(file);
                    }}
                    className="hidden"
                  />

                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-stone-300 dark:border-stone-700 hover:border-amber-500 rounded-2xl p-6 text-center cursor-pointer transition-colors bg-white dark:bg-stone-800/60"
                  >
                    <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-600 flex items-center justify-center mx-auto mb-2">
                      <Upload className="w-5 h-5" />
                    </div>
                    <p className="text-xs font-semibold text-stone-800 dark:text-stone-200">
                      Clique para tirar foto ou selecionar da galeria
                    </p>
                    <p className="text-[11px] text-stone-400 mt-1">
                      Comprime automaticamente para salvar sem pesar o banco
                    </p>
                  </div>

                  {isCompressing && (
                    <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl flex items-center gap-2 text-xs text-amber-800 dark:text-amber-300">
                      <Loader2 className="w-4 h-4 animate-spin text-amber-600" />
                      <span>Otimizando imagem da capa...</span>
                    </div>
                  )}

                  {uploadError && <p className="text-xs text-rose-500">{uploadError}</p>}

                  {uploadedDetails && (
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>
                        Imagem otimizada: {formatFileSize(uploadedDetails.compressedSize)} (de {formatFileSize(uploadedDetails.originalSize)})
                      </span>
                    </p>
                  )}
                </div>
              )}

              {/* TAB 3: LINK DIRETO (INLINE) */}
              {coverMode === 'url' && (
                <div className="space-y-2 bg-stone-50/70 dark:bg-stone-800/40 p-4 rounded-2xl border border-stone-200/60 dark:border-stone-800">
                  <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300">
                    URL direta da imagem:
                  </label>
                  <input
                    type="url"
                    value={coverUrl}
                    onChange={(e) => setCoverUrl(e.target.value)}
                    placeholder="https://exemplo.com/capa.jpg"
                    className="w-full h-10 px-3.5 text-xs rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100"
                  />
                </div>
              )}

            </div>
          </div>
        </div>

        {/* SECTION 2: CLASSIFICAÇÃO & ORGANIZAÇÃO */}
        <div className="bg-white dark:bg-stone-900 rounded-3xl p-5 sm:p-7 border border-stone-200/80 dark:border-stone-800 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-1 border-b border-stone-100 dark:border-stone-800">
            <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 flex items-center justify-center">
              <Library className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-serif text-base font-bold text-stone-900 dark:text-stone-100">
                2. Classificação & Posse
              </h2>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Ajuste quem lê, o status atual e se o livro é físico ou lista de desejos
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 pt-1">
            
            {/* Posse */}
            <div className="bg-stone-50 dark:bg-stone-800/40 p-3.5 rounded-2xl border border-stone-200/60 dark:border-stone-800">
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-2">
                Posse do Livro:
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => setOwned(true)}
                  className={`py-2 px-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1 transition-all cursor-pointer ${
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
                  className={`py-2 px-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                    !owned
                      ? 'bg-violet-600 text-white shadow-xs'
                      : 'bg-white dark:bg-stone-800 text-stone-600 dark:text-stone-400 border border-stone-200 dark:border-stone-700'
                  }`}
                >
                  <span>🎁 Desejo</span>
                </button>
              </div>
            </div>

            {/* Leitor */}
            <div className="bg-stone-50 dark:bg-stone-800/40 p-3.5 rounded-2xl border border-stone-200/60 dark:border-stone-800">
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

            {/* Status */}
            <div className="bg-stone-50 dark:bg-stone-800/40 p-3.5 rounded-2xl border border-stone-200/60 dark:border-stone-800">
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-2">
                Status da Leitura:
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

        {/* SECTION 3: INFORMAÇÕES DA OBRA */}
        <div className="bg-white dark:bg-stone-900 rounded-3xl p-5 sm:p-7 border border-stone-200/80 dark:border-stone-800 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-1 border-b border-stone-100 dark:border-stone-800">
            <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 flex items-center justify-center">
              <Edit3 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-serif text-base font-bold text-stone-900 dark:text-stone-100">
                3. Informações da Obra & Ficha Técnica
              </h2>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Título, autoria, ISBN e dados da edição
              </p>
            </div>
          </div>

          <div className="space-y-4 pt-1">
            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1.5">
                Título do Livro <span className="text-amber-600">*</span>
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full h-11 px-4 text-sm sm:text-base rounded-2xl border border-stone-300 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-800/60 text-stone-900 dark:text-stone-100 focus:bg-white dark:focus:bg-stone-800 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 font-serif font-bold"
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
                className="w-full h-11 px-4 text-sm rounded-2xl border border-stone-300 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-800/60 text-stone-900 dark:text-stone-100 focus:bg-white dark:focus:bg-stone-800 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600"
              />
            </div>

            {/* ISBN with Autofill */}
            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1.5">
                ISBN
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Barcode className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
                  <input
                    type="text"
                    value={isbn}
                    onChange={(e) => setIsbn(e.target.value)}
                    placeholder="Ex: 9788520933114"
                    className="w-full h-11 pl-10 pr-3 text-sm rounded-2xl border border-stone-300 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-800/60 text-stone-900 dark:text-stone-100 font-mono"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleIsbnAutofill}
                  disabled={isFetchingIsbn || !isbn.trim()}
                  className="h-11 px-3 sm:px-4 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-300/80 dark:border-amber-700/60 hover:bg-amber-100 rounded-2xl text-xs font-semibold flex items-center gap-1.5 shrink-0 transition-colors disabled:opacity-50 cursor-pointer shadow-2xs"
                >
                  {isFetchingIsbn ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                  )}
                  <span>Buscar Dados via ISBN</span>
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1.5">
                  Número Total de Páginas
                </label>
                <input
                  type="number"
                  min="0"
                  value={pageCount}
                  onChange={(e) => setPageCount(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full h-11 px-4 text-sm rounded-2xl border border-stone-300 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-800/60 text-stone-900 dark:text-stone-100"
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
                  className="w-full h-11 px-4 text-sm rounded-2xl border border-stone-300 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-800/60 text-stone-900 dark:text-stone-100"
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
                  className="w-full h-11 px-4 text-sm rounded-2xl border border-stone-300 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-800/60 text-stone-900 dark:text-stone-100"
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
                  className="w-full h-11 px-4 text-sm rounded-2xl border border-stone-300 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-800/60 text-stone-900 dark:text-stone-100"
                />
              </div>
            </div>

            {/* SECTION 4: SINOPSE */}
            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1.5">
                Sinopse / Descrição da Obra
              </label>
              <textarea
                rows={5}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Resumo ou sinopse da história..."
                className="w-full p-4 text-sm rounded-2xl border border-stone-300 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-800/60 text-stone-900 dark:text-stone-100 leading-relaxed"
              />
            </div>
          </div>
        </div>

        {/* SECTION 5: ZONA DE PERIGO (EXCLUIR LIVRO) */}
        <div className="bg-rose-50/50 dark:bg-rose-950/20 rounded-3xl p-5 sm:p-7 border border-rose-200/60 dark:border-rose-900/40 space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-serif text-base font-bold text-rose-800 dark:text-rose-300">
                Zona de Perigo: Excluir Obra
              </h3>
              <p className="text-xs text-rose-600/80 dark:text-rose-400/80 mt-0.5">
                Esta ação removerá o livro, histórico de leitura, notas e resenhas permanentemente.
              </p>
            </div>

            {!isConfirmingDelete ? (
              <button
                type="button"
                onClick={() => setIsConfirmingDelete(true)}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors shrink-0 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Excluir Livro</span>
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsConfirmingDelete(false)}
                  className="px-3.5 py-2 text-xs font-semibold text-stone-600 dark:text-stone-400 hover:bg-stone-200/60 dark:hover:bg-stone-800 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={handleDelete}
                  className="px-4 py-2 bg-rose-700 hover:bg-rose-800 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  {isDeleting ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="w-3.5 h-3.5" />
                  )}
                  <span>Confirmar Exclusão</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* STICKY BOTTOM SAVE ACTION BAR */}
        <div className="fixed bottom-0 left-0 right-0 p-3 sm:p-4 bg-white/95 dark:bg-stone-900/95 backdrop-blur-md border-t border-stone-200 dark:border-stone-800 z-30 flex items-center justify-between max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <button
            type="button"
            onClick={() => navigate(`/books/${currentBook.id}`)}
            className="px-4 py-2.5 text-xs sm:text-sm font-semibold text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-xl transition-colors"
          >
            Cancelar Edição
          </button>

          <button
            type="submit"
            disabled={isSaving || !title.trim()}
            className="px-6 py-2.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 shadow-sm cursor-pointer transition-colors"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Salvando Alterações...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Salvar Alterações no Banco</span>
              </>
            )}
          </button>
        </div>

      </form>

    </div>
  );
};
