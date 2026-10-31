import React, { useState, useEffect } from 'react';
import { 
  X, 
  Search, 
  Sparkles, 
  Check, 
  RefreshCw, 
  Image as ImageIcon, 
  Globe,
  ExternalLink,
  BookOpen,
  Loader2,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { 
  searchCoversStream, 
  CoverOption, 
  SELECTABLE_API_PROVIDERS, 
  ApiProviderId, 
  ApiSearchStatus 
} from '@/features/books';

interface CoverPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  bookTitle: string;
  bookAuthors?: string;
  bookIsbn?: string;
  currentCoverUrl?: string;
  onSelectCover: (coverUrl: string) => Promise<void>;
}

export const CoverPickerModal: React.FC<CoverPickerModalProps> = ({
  isOpen,
  onClose,
  bookTitle,
  bookAuthors,
  bookIsbn,
  currentCoverUrl,
  onSelectCover,
}) => {
  const [searchTerm, setSearchTerm] = useState(bookTitle);
  const [searchAuthor, setSearchAuthor] = useState(bookAuthors || '');
  const [searchIsbn, setSearchIsbn] = useState(bookIsbn || '');
  
  // Multi-API selection for cover searches
  const [selectedApis, setSelectedApis] = useState<ApiProviderId[]>(() => {
    try {
      const saved = localStorage.getItem('nossa_estante_selected_cover_apis');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return ['openlibrary', 'google'];
  });
  const [apiStatuses, setApiStatuses] = useState<Record<string, ApiSearchStatus>>({});

  const [selectedProvider, setSelectedProvider] = useState<'all' | 'openlibrary' | 'google' | 'brasilapi' | 'gutendex'>('all');
  const [covers, setCovers] = useState<CoverOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [chosenCoverUrl, setChosenCoverUrl] = useState<string | null>(null);

  const [hasSearched, setHasSearched] = useState(false);

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
        localStorage.setItem('nossa_estante_selected_cover_apis', JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const selectOnlyOpenLibrary = () => {
    const only: ApiProviderId[] = ['openlibrary'];
    setSelectedApis(only);
    try {
      localStorage.setItem('nossa_estante_selected_cover_apis', JSON.stringify(only));
    } catch {}
  };

  const selectFastestApis = () => {
    const fast: ApiProviderId[] = ['openlibrary', 'google'];
    setSelectedApis(fast);
    try {
      localStorage.setItem('nossa_estante_selected_cover_apis', JSON.stringify(fast));
    } catch {}
  };

  const selectAllApis = () => {
    const all: ApiProviderId[] = ['openlibrary', 'google', 'brasilapi', 'gutendex'];
    setSelectedApis(all);
    try {
      localStorage.setItem('nossa_estante_selected_cover_apis', JSON.stringify(all));
    } catch {}
  };

  const performSearch = async (title: string, author?: string, isbn?: string) => {
    if (selectedApis.length === 0) return;
    setHasSearched(true);
    setIsLoading(true);
    setCovers([]); // Reset for fresh streaming

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
      await searchCoversStream(title, author, isbn, selectedApis, {
        onProviderStatus: (providerId, status) => {
          setApiStatuses((prev) => ({
            ...prev,
            [providerId]: status,
          }));
        },
        onIncrementalCovers: (newCovers, allAccumulated) => {
          setCovers([...allAccumulated]);
          // Pick the first discovered cover if user hasn't manually selected one yet
          if (!chosenCoverUrl && newCovers.length > 0) {
            setChosenCoverUrl(newCovers[0].url);
          }
        },
      });
    } catch (err) {
      console.error('Error finding covers via stream:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Only initialize form fields when modal opens - DO NOT start search automatically
  useEffect(() => {
    if (isOpen) {
      setSearchTerm(bookTitle);
      setSearchAuthor(bookAuthors || '');
      setSearchIsbn(bookIsbn || '');
      setChosenCoverUrl(currentCoverUrl || null);
      setHasSearched(false);
      setCovers([]);
      setApiStatuses({});
    }
  }, [isOpen, bookTitle, bookAuthors, bookIsbn, currentCoverUrl]);

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

  const filteredCovers = covers.filter((c) => {
    if (selectedProvider === 'all') return true;
    return c.source === selectedProvider;
  });

  const handleApply = async () => {
    if (!chosenCoverUrl) return;
    setIsApplying(true);
    try {
      await onSelectCover(chosenCoverUrl);
      onClose();
    } finally {
      setIsApplying(false);
    }
  };

  const handleManualSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    performSearch(searchTerm, searchAuthor, searchIsbn);
  };

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
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-stone-100 dark:border-stone-800 flex items-center justify-between gap-3 bg-amber-50/40 dark:bg-stone-900">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif text-base sm:text-lg font-bold text-stone-900 dark:text-stone-100">
                Pesquisar Capas nas APIs
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Consulte capas no Open Library, Google Books, Brasil API e Gutenberg
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 rounded-full hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search controls */}
        <div className="p-4 border-b border-stone-200/60 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900/40 space-y-3">
          <form onSubmit={handleManualSearchSubmit} className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div>
              <label className="block text-[11px] font-semibold text-stone-600 dark:text-stone-300 mb-1">
                Título
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Título do livro..."
                className="w-full px-3 py-1.5 text-xs rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-stone-600 dark:text-stone-300 mb-1">
                Autor (Opcional)
              </label>
              <input
                type="text"
                value={searchAuthor}
                onChange={(e) => setSearchAuthor(e.target.value)}
                placeholder="Nome do autor..."
                className="w-full px-3 py-1.5 text-xs rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100"
              />
            </div>
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <label className="block text-[11px] font-semibold text-stone-600 dark:text-stone-300 mb-1">
                  ISBN
                </label>
                <input
                  type="text"
                  value={searchIsbn}
                  onChange={(e) => setSearchIsbn(e.target.value)}
                  placeholder="ISBN-10 ou 13..."
                  className="w-full px-3 py-1.5 text-xs rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 font-mono"
                />
              </div>
              <button
                type="submit"
                disabled={isLoading}
                className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs cursor-pointer shrink-0"
              >
                {isLoading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Search className="w-3.5 h-3.5" />
                )}
                <span>Buscar</span>
              </button>
            </div>
          </form>

          {/* API Multi-Selection Controls */}
          <div className="space-y-2 pt-1 border-t border-stone-200/50 dark:border-stone-800">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-stone-700 dark:text-stone-300">
                <Globe className="w-3.5 h-3.5 text-amber-600" />
                <span>APIs para buscar capas:</span>
                <span className="text-[10px] text-stone-400 font-normal">
                  ({selectedApis.length} de {SELECTABLE_API_PROVIDERS.length} ativas)
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={selectOnlyOpenLibrary}
                  className={`text-[10px] px-2 py-0.5 rounded-md font-medium transition-colors ${
                    selectedApis.length === 1 && selectedApis.includes('openlibrary')
                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 font-semibold'
                      : 'text-stone-500 hover:bg-stone-200/60 dark:hover:bg-stone-800'
                  }`}
                  title="Busca ultrarrápida (~300ms) com capas em alta definição"
                >
                  ⚡ Só Open Library
                </button>
                <button
                  type="button"
                  onClick={selectFastestApis}
                  className={`text-[10px] px-2 py-0.5 rounded-md font-medium transition-colors ${
                    selectedApis.length === 2 && selectedApis.includes('openlibrary') && selectedApis.includes('google')
                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 font-semibold'
                      : 'text-stone-500 hover:bg-stone-200/60 dark:hover:bg-stone-800'
                  }`}
                  title="Combinação recomendada: velocidade + catálogo"
                >
                  🚀 OL + Google
                </button>
                <button
                  type="button"
                  onClick={selectAllApis}
                  className={`text-[10px] px-2 py-0.5 rounded-md font-medium transition-colors ${
                    selectedApis.length === SELECTABLE_API_PROVIDERS.length
                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 font-semibold'
                      : 'text-stone-500 hover:bg-stone-200/60 dark:hover:bg-stone-800'
                  }`}
                >
                  🌐 Todas (4)
                </button>
              </div>
            </div>

            {/* API checkboxes / chips */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              {SELECTABLE_API_PROVIDERS.map((provider) => {
                const isChecked = selectedApis.includes(provider.id);
                const status = apiStatuses[provider.id];

                return (
                  <button
                    key={provider.id}
                    type="button"
                    onClick={() => toggleApi(provider.id)}
                    className={`flex items-center justify-between p-2 rounded-xl border text-left transition-all ${
                      isChecked
                        ? 'border-amber-300 dark:border-amber-700/60 bg-white dark:bg-stone-800/90 shadow-2xs'
                        : 'border-stone-200 dark:border-stone-800 bg-stone-100/60 dark:bg-stone-900/40 opacity-60 hover:opacity-100'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className={`w-3.5 h-3.5 rounded flex items-center justify-center shrink-0 text-white text-[10px] ${
                          isChecked ? 'bg-amber-600' : 'border border-stone-400 dark:border-stone-600'
                        }`}
                      >
                        {isChecked && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                      </div>
                      <div className="truncate">
                        <div className="text-[11px] font-semibold text-stone-800 dark:text-stone-200 truncate">
                          {provider.badge}
                        </div>
                        <div className="text-[9px] text-stone-400 truncate">
                          {provider.speed}
                        </div>
                      </div>
                    </div>

                    {/* Status badge */}
                    {status && isChecked && (
                      <div className="ml-1 shrink-0">
                        {status.state === 'searching' && (
                          <Loader2 className="w-3 h-3 text-amber-500 animate-spin" />
                        )}
                        {status.state === 'success' && (
                          <span className="text-[9px] font-semibold px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                            +{status.count}
                          </span>
                        )}
                        {status.state === 'empty' && (
                          <span className="text-[9px] text-stone-400">
                            0
                          </span>
                        )}
                        {status.state === 'error' && (
                          <span className="text-[9px] text-rose-500" title={status.error}>
                            erro
                          </span>
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Filter by provider tab if results available */}
            {covers.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[10px] font-medium text-stone-400 mr-1">Filtrar visualização:</span>
                <button
                  type="button"
                  onClick={() => setSelectedProvider('all')}
                  className={`px-2 py-0.5 rounded-lg text-[11px] font-medium transition-colors ${
                    selectedProvider === 'all'
                      ? 'bg-amber-600 text-white font-semibold'
                      : 'bg-stone-200/70 dark:bg-stone-800 text-stone-700 dark:text-stone-300'
                  }`}
                >
                  Todas ({covers.length})
                </button>
                {SELECTABLE_API_PROVIDERS.filter((p) => selectedApis.includes(p.id)).map((p) => {
                  const count = covers.filter((c) => c.source === p.id).length;
                  if (count === 0) return null;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setSelectedProvider(p.id)}
                      className={`px-2 py-0.5 rounded-lg text-[11px] font-medium transition-colors ${
                        selectedProvider === p.id
                          ? 'bg-amber-600 text-white font-semibold'
                          : 'bg-stone-200/70 dark:bg-stone-800 text-stone-700 dark:text-stone-300'
                      }`}
                    >
                      {p.badge} ({count})
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Covers Grid Area */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1">
          {isLoading && covers.length === 0 ? (
            <div className="py-20 text-center space-y-3">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-amber-600" />
              <p className="text-sm font-serif text-stone-600 dark:text-stone-400">
                Consultando APIs selecionadas em tempo real...
              </p>
              <p className="text-xs text-stone-400">
                Os resultados aparecem assim que cada serviço responder.
              </p>
            </div>
          ) : !hasSearched ? (
            <div className="py-12 sm:py-16 text-center space-y-4 max-w-md mx-auto">
              <div className="w-16 h-16 rounded-2xl bg-amber-100/80 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto shadow-xs">
                <Sparkles className="w-8 h-8" />
              </div>
              <div className="space-y-1.5">
                <h4 className="font-serif text-base font-bold text-stone-800 dark:text-stone-200">
                  Pronto para buscar novas capas
                </h4>
                <p className="text-xs text-stone-500 dark:text-stone-400 leading-relaxed">
                  Ajuste o título, autor ou ISBN acima se desejar, configure as APIs desejadas e clique em <span className="font-semibold text-amber-700 dark:text-amber-400">Buscar</span> para iniciar.
                </p>
              </div>
              <button
                type="button"
                onClick={() => performSearch(searchTerm, searchAuthor, searchIsbn)}
                className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold inline-flex items-center gap-2 shadow-md hover:shadow-lg transition-all cursor-pointer"
              >
                <Search className="w-4 h-4" />
                <span>Pesquisar Capas nas APIs</span>
              </button>
            </div>
          ) : filteredCovers.length === 0 ? (
            <div className="py-16 text-center space-y-2">
              <ImageIcon className="w-12 h-12 text-stone-300 dark:text-stone-700 mx-auto" />
              <p className="text-sm font-semibold text-stone-700 dark:text-stone-300">
                Nenhuma capa encontrada para estes termos.
              </p>
              <p className="text-xs text-stone-400 max-w-sm mx-auto">
                Tente simplificar o título, informar o ISBN ou marcar mais APIs na seleção acima.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {filteredCovers.map((cover) => {
                const isSelected = chosenCoverUrl === cover.url;

                return (
                  <div
                    key={cover.id}
                    onClick={() => setChosenCoverUrl(cover.url)}
                    className={`relative rounded-2xl overflow-hidden border-2 transition-all cursor-pointer p-2 flex flex-col group ${
                      isSelected
                        ? 'border-amber-600 dark:border-amber-500 bg-amber-50/50 dark:bg-amber-950/30 shadow-md ring-2 ring-amber-500/20'
                        : 'border-stone-200 dark:border-stone-800 bg-stone-50/30 dark:bg-stone-900/40 hover:border-stone-300 dark:hover:border-stone-700'
                    }`}
                  >
                    {/* Badge of origin API */}
                    <div className="mb-2">
                      <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 truncate max-w-full">
                        {cover.sourceBadge}
                      </span>
                    </div>

                    {/* Image Preview */}
                    <div className="aspect-2/3 rounded-xl overflow-hidden bg-stone-200 dark:bg-stone-800 shadow-xs relative flex items-center justify-center">
                      <BookOpen className="w-8 h-8 text-stone-300 dark:text-stone-700 absolute" />
                      <img
                        src={cover.url}
                        alt={cover.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 relative z-10"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                      {isSelected && (
                        <div className="absolute top-2 right-2 z-20 w-6 h-6 rounded-full bg-amber-600 text-white flex items-center justify-center shadow-md animate-in zoom-in-75">
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </div>
                      )}
                    </div>

                    {/* Meta info */}
                    <div className="mt-2 text-center">
                      <p className="text-[11px] font-semibold text-stone-800 dark:text-stone-200 truncate">
                        {cover.title}
                      </p>
                      {cover.editionYear && (
                        <span className="text-[10px] text-stone-400">
                          Edição: {cover.editionYear}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-stone-100 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900 flex items-center justify-between gap-3">
          <div className="text-xs text-stone-500 truncate">
            {chosenCoverUrl ? (
              <span className="text-emerald-700 dark:text-emerald-400 font-medium">
                ✓ Capa selecionada pronta para aplicar
              </span>
            ) : (
              <span>Selecione uma das capas acima para o livro</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-xl"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={!chosenCoverUrl || isApplying}
              onClick={handleApply}
              className="px-5 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{isApplying ? 'Aplicando...' : 'Usar Esta Capa'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
