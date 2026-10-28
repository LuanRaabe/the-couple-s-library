import { GoogleBookSearchResult } from '../types';

export type BookSearchProvider = 'all' | 'google' | 'openlibrary' | 'gutendex' | 'brasilapi';

export interface ProviderMeta {
  id: BookSearchProvider;
  name: string;
  badge: string;
  description: string;
  isFree: boolean;
}

export const SEARCH_PROVIDERS: ProviderMeta[] = [
  {
    id: 'all',
    name: 'Multi-Busca (Todas)',
    badge: '⚡ Multi-Fonte',
    description: 'Busca em simultâneo no Google Livros, Open Library e acervos livres',
    isFree: true,
  },
  {
    id: 'google',
    name: 'Google Livros',
    badge: '🔍 Google Books',
    description: 'Catálogo contemporâneo amplo com sinopses e dados detalhados',
    isFree: true,
  },
  {
    id: 'openlibrary',
    name: 'Open Library',
    badge: '🏛️ Open Library',
    description: 'Internet Archive: acervo aberto mundial com capas em alta resolução',
    isFree: true,
  },
  {
    id: 'gutendex',
    name: 'Gutendex (Gutenberg)',
    badge: '📖 Gutenberg',
    description: 'Acervo de literatura clássica mundial e domínio público',
    isFree: true,
  },
  {
    id: 'brasilapi',
    name: 'Brasil API (ISBN)',
    badge: '🇧🇷 Brasil API',
    description: 'Base oficial de ISBN do Brasil (Câmara Brasileira do Livro)',
    isFree: true,
  },
];

/**
 * Search Google Books API
 */
export async function searchGoogleBooks(query: string): Promise<GoogleBookSearchResult[]> {
  if (!query || query.trim().length < 2) return [];

  const trimmed = query.trim();
  const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(trimmed)}&maxResults=12`;

  try {
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    
    if (data.items && Array.isArray(data.items) && data.items.length > 0) {
      return data.items.map((item: any) => {
        const info = item.volumeInfo || {};

        let coverUrl = info.imageLinks?.thumbnail || info.imageLinks?.smallThumbnail || '';
        if (coverUrl) {
          coverUrl = coverUrl.replace(/^http:\/\//i, 'https://').replace('&edge=curl', '');
        }

        let isbn = '';
        if (info.industryIdentifiers && Array.isArray(info.industryIdentifiers)) {
          const isbn13 = info.industryIdentifiers.find((id: any) => id.type === 'ISBN_13');
          const isbn10 = info.industryIdentifiers.find((id: any) => id.type === 'ISBN_10');
          isbn = isbn13?.identifier || isbn10?.identifier || '';
        }

        const authors = Array.isArray(info.authors) ? info.authors.join(', ') : (info.authors || 'Autor Desconhecido');
        const categories = Array.isArray(info.categories) ? info.categories : (info.categories ? [info.categories] : []);

        return {
          id: `google-${item.id || Math.random().toString(36).substring(2)}`,
          title: info.title || 'Sem título',
          authors,
          coverUrl,
          pageCount: typeof info.pageCount === 'number' && info.pageCount > 0 ? info.pageCount : undefined,
          publishedDate: info.publishedDate || '',
          publisher: info.publisher || '',
          description: info.description || '',
          categories,
          isbn,
          language: info.language || 'pt',
          source: 'google' as const,
        };
      });
    }
  } catch (error) {
    console.warn('Google Books search failed:', error);
  }

  return [];
}

/**
 * Fetch detailed book data and cover using Open Library ISBN API
 * Uses Open Library's Books API (jscmd=data), ISBN endpoint and Search API as fallback.
 */
export async function fetchBookByOpenLibraryIsbn(rawIsbn: string): Promise<GoogleBookSearchResult | null> {
  const cleanIsbn = rawIsbn.replace(/[^0-9X]/gi, '');
  if (cleanIsbn.length !== 10 && cleanIsbn.length !== 13) return null;

  // 1. Primary: Open Library Books Data API (gives complete metadata & cover URLs)
  try {
    const bibKey = `ISBN:${cleanIsbn}`;
    const url = `https://openlibrary.org/api/books?bibkeys=${encodeURIComponent(bibKey)}&format=json&jscmd=data`;
    const res = await fetch(url);

    if (res.ok) {
      const data = await res.json();
      const item = data[bibKey] || (Object.keys(data).length > 0 ? Object.values(data)[0] as any : null);

      if (item && item.title) {
        const authors = Array.isArray(item.authors)
          ? item.authors.map((a: any) => a.name).filter(Boolean).join(', ')
          : (item.by_statement || 'Autor Desconhecido');

        const publisher = Array.isArray(item.publishers)
          ? item.publishers.map((p: any) => p.name).filter(Boolean).join(', ')
          : (item.publishers?.[0]?.name || '');

        const coverUrl = item.cover?.large || 
                         item.cover?.medium || 
                         item.cover?.small || 
                         `https://covers.openlibrary.org/b/isbn/${cleanIsbn}-L.jpg`;

        const categories = Array.isArray(item.subjects)
          ? item.subjects.map((s: any) => s.name || s).slice(0, 5)
          : [];

        let description = '';
        if (typeof item.description === 'string') {
          description = item.description;
        } else if (item.description?.value) {
          description = item.description.value;
        } else if (typeof item.notes === 'string') {
          description = item.notes;
        } else if (item.notes?.value) {
          description = item.notes.value;
        }

        return {
          id: `ol-isbn-${cleanIsbn}`,
          title: item.title,
          authors: authors || 'Autor Desconhecido',
          coverUrl,
          pageCount: typeof item.number_of_pages === 'number' && item.number_of_pages > 0 ? item.number_of_pages : undefined,
          publishedDate: item.publish_date || '',
          publisher,
          description: description.trim(),
          categories,
          isbn: cleanIsbn,
          language: 'pt',
          source: 'openlibrary' as const,
        };
      }
    }
  } catch (error) {
    console.warn('Open Library jscmd=data ISBN fetch failed:', error);
  }

  // 2. Secondary fallback: Direct ISBN JSON API (/isbn/{isbn}.json)
  try {
    const url = `https://openlibrary.org/isbn/${cleanIsbn}.json`;
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      if (data && data.title) {
        let coverUrl = '';
        if (Array.isArray(data.covers) && data.covers[0]) {
          coverUrl = `https://covers.openlibrary.org/b/id/${data.covers[0]}-L.jpg`;
        } else {
          coverUrl = `https://covers.openlibrary.org/b/isbn/${cleanIsbn}-L.jpg`;
        }

        const publisher = Array.isArray(data.publishers) ? data.publishers[0] : (data.publishers || '');
        const pageCount = typeof data.number_of_pages === 'number' ? data.number_of_pages : undefined;
        let description = '';
        if (typeof data.description === 'string') {
          description = data.description;
        } else if (data.description?.value) {
          description = data.description.value;
        }

        // Try to fetch author name if author keys are present
        let authorName = 'Autor Desconhecido';
        if (Array.isArray(data.authors) && data.authors[0]?.key) {
          try {
            const authorRes = await fetch(`https://openlibrary.org${data.authors[0].key}.json`);
            if (authorRes.ok) {
              const authorData = await authorRes.json();
              if (authorData?.name) authorName = authorData.name;
            }
          } catch (e) {
            // ignore
          }
        }

        return {
          id: `ol-isbn-${cleanIsbn}`,
          title: data.title,
          authors: authorName,
          coverUrl,
          pageCount,
          publishedDate: data.publish_date || '',
          publisher,
          description,
          categories: [],
          isbn: cleanIsbn,
          language: 'pt',
          source: 'openlibrary' as const,
        };
      }
    }
  } catch (error) {
    console.warn('Open Library direct ISBN endpoint failed:', error);
  }

  // 3. Third fallback: Open Library Search API with isbn filter
  try {
    const searchUrl = `https://openlibrary.org/search.json?isbn=${encodeURIComponent(cleanIsbn)}&limit=1`;
    const res = await fetch(searchUrl);
    if (res.ok) {
      const searchData = await res.json();
      const doc = searchData.docs?.[0];
      if (doc && doc.title) {
        let coverUrl = '';
        if (doc.cover_i) {
          coverUrl = `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg`;
        } else {
          coverUrl = `https://covers.openlibrary.org/b/isbn/${cleanIsbn}-L.jpg`;
        }

        const authors = Array.isArray(doc.author_name)
          ? doc.author_name.join(', ')
          : (doc.author_name || 'Autor Desconhecido');

        return {
          id: `ol-isbn-${cleanIsbn}`,
          title: doc.title,
          authors,
          coverUrl,
          pageCount: doc.number_of_pages_median || undefined,
          publishedDate: doc.first_publish_year ? String(doc.first_publish_year) : '',
          publisher: doc.publisher?.[0] || '',
          description: '',
          categories: Array.isArray(doc.subject) ? doc.subject.slice(0, 5) : [],
          isbn: cleanIsbn,
          language: doc.language?.[0] || 'pt',
          source: 'openlibrary' as const,
        };
      }
    }
  } catch (error) {
    console.warn('Open Library search by ISBN failed:', error);
  }

  return null;
}

/**
 * Search Open Library (Internet Archive)
 * Completely free, public, keyless. Over 20 million records + Covers CDN.
 */
export async function searchOpenLibrary(query: string): Promise<GoogleBookSearchResult[]> {
  if (!query || query.trim().length < 2) return [];

  const trimmed = query.trim();
  const isIsbn = /^[\d-]{10,17}[xX]?$/.test(trimmed);

  // If ISBN format detected, try direct Open Library ISBN lookup first for optimal accuracy
  if (isIsbn) {
    const directBook = await fetchBookByOpenLibraryIsbn(trimmed);
    if (directBook) {
      return [directBook];
    }
  }

  const url = `https://openlibrary.org/search.json?q=${encodeURIComponent(trimmed)}&limit=15`;

  try {
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();

    if (data.docs && Array.isArray(data.docs) && data.docs.length > 0) {
      return data.docs.map((doc: any) => {
        let coverUrl = '';
        if (doc.cover_i) {
          coverUrl = `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg`;
        } else if (doc.isbn && doc.isbn[0]) {
          coverUrl = `https://covers.openlibrary.org/b/isbn/${doc.isbn[0]}-L.jpg`;
        }

        const authors = Array.isArray(doc.author_name)
          ? doc.author_name.join(', ')
          : (doc.author_name || 'Autor Desconhecido');

        const publishedDate = doc.first_publish_year ? String(doc.first_publish_year) : '';
        const publisher = doc.publisher?.[0] || '';
        const isbn = doc.isbn?.[0] || '';
        const pageCount = doc.number_of_pages_median || undefined;
        const categories = Array.isArray(doc.subject) ? doc.subject.slice(0, 4) : [];

        return {
          id: `ol-${doc.key?.replace('/works/', '') || Math.random().toString(36).substring(2)}`,
          title: doc.title || 'Sem título',
          authors,
          coverUrl,
          pageCount,
          publishedDate,
          publisher,
          description: '',
          categories,
          isbn,
          language: doc.language?.[0] || 'pt',
          source: 'openlibrary' as const,
        };
      });
    }
  } catch (error) {
    console.warn('Open Library search failed:', error);
  }

  return [];
}

/**
 * Search Gutendex (Project Gutenberg)
 * Free public JSON API for classic literature & book covers
 */
export async function searchGutendex(query: string): Promise<GoogleBookSearchResult[]> {
  if (!query || query.trim().length < 2) return [];

  const trimmed = query.trim();
  const url = `https://gutendex.com/books?search=${encodeURIComponent(trimmed)}`;

  try {
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();

    if (data.results && Array.isArray(data.results) && data.results.length > 0) {
      return data.results.slice(0, 10).map((item: any) => {
        const authors = Array.isArray(item.authors)
          ? item.authors.map((a: any) => a.name.split(',').reverse().join(' ').trim()).join(', ')
          : 'Autor Clássico';

        const coverUrl = item.formats?.['image/jpeg'] || '';
        const categories = Array.isArray(item.subjects) ? item.subjects.slice(0, 3) : [];

        return {
          id: `gutenberg-${item.id}`,
          title: item.title,
          authors: authors || 'Autor Desconhecido',
          coverUrl,
          description: `Obra clássica do Projeto Gutenberg (ID: ${item.id})`,
          categories,
          language: item.languages?.[0] || 'en',
          source: 'openlibrary' as const, // reuse compatible tag
        };
      });
    }
  } catch (error) {
    console.warn('Gutendex search failed:', error);
  }

  return [];
}

/**
 * Search BrasilAPI by ISBN (Free Brazilian official book registry)
 */
export async function searchBrasilApi(isbn: string): Promise<GoogleBookSearchResult[]> {
  const cleanIsbn = isbn.replace(/[^0-9X]/gi, '');
  if (cleanIsbn.length !== 10 && cleanIsbn.length !== 13) return [];

  const url = `https://brasilapi.com.br/api/isbn/v1/${cleanIsbn}`;

  try {
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();

    if (data && data.title) {
      const authors = Array.isArray(data.authors)
        ? data.authors.join(', ')
        : (data.authors || 'Autor Desconhecido');

      return [{
        id: `brasilapi-${cleanIsbn}`,
        title: data.title,
        authors,
        coverUrl: data.cover_url || '',
        pageCount: data.page_count || undefined,
        publishedDate: data.year ? String(data.year) : '',
        publisher: data.publisher || '',
        description: data.synopsis || '',
        categories: data.subjects || [],
        isbn: data.isbn || cleanIsbn,
        language: 'pt',
        source: 'brasilapi' as const,
      }];
    }
  } catch (error) {
    console.warn('BrasilAPI ISBN lookup failed:', error);
  }

  return [];
}

/**
 * Normalize title strings for fuzzy matching / deduplication
 */
function normalizeTitle(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s]/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Unified multi-search across providers with automatic de-duplication
 */
export async function searchBooks(
  query: string,
  provider: BookSearchProvider = 'all'
): Promise<GoogleBookSearchResult[]> {
  const trimmed = query.trim();
  const isIsbn = /^[\d-]{10,17}[xX]?$/.test(trimmed);

  // If ISBN was entered, handle provider-specific ISBN lookups
  if (isIsbn) {
    if (provider === 'openlibrary') {
      const olRes = await fetchBookByOpenLibraryIsbn(trimmed);
      if (olRes) return [olRes];
      return searchOpenLibrary(trimmed);
    }
    if (provider === 'brasilapi') {
      const brasilRes = await searchBrasilApi(trimmed);
      if (brasilRes.length > 0) return brasilRes;
    }
  }

  if (provider === 'google') {
    const results = await searchGoogleBooks(trimmed);
    if (results.length === 0) {
      return searchOpenLibrary(trimmed);
    }
    return results;
  }

  if (provider === 'openlibrary') {
    return searchOpenLibrary(trimmed);
  }

  if (provider === 'gutendex') {
    return searchGutendex(trimmed);
  }

  if (provider === 'brasilapi') {
    const res = await searchBrasilApi(trimmed);
    if (res.length === 0) {
      // Fallback search by query on Google
      return searchGoogleBooks(trimmed);
    }
    return res;
  }

  // Multi-search: Query Google Books, Open Library, and Gutendex simultaneously in parallel
  const [googleSettled, olSettled, gutenSettled, brasilSettled, olIsbnSettled] = await Promise.allSettled([
    searchGoogleBooks(trimmed),
    searchOpenLibrary(trimmed),
    searchGutendex(trimmed),
    isIsbn ? searchBrasilApi(trimmed) : Promise.resolve([]),
    isIsbn ? fetchBookByOpenLibraryIsbn(trimmed) : Promise.resolve(null),
  ]);

  const combined: GoogleBookSearchResult[] = [];
  const seenTitles = new Set<string>();

  // Helper to add results while avoiding near-identical duplicate titles
  const addItems = (items: GoogleBookSearchResult[]) => {
    for (const item of items) {
      const norm = normalizeTitle(item.title);
      // If we already have this title with a cover, skip or supplement
      if (!seenTitles.has(norm)) {
        seenTitles.add(norm);
        combined.push(item);
      } else {
        // If existing has no cover but new item has cover, replace
        const idx = combined.findIndex((c) => normalizeTitle(c.title) === norm);
        if (idx !== -1 && !combined[idx].coverUrl && item.coverUrl) {
          combined[idx] = item;
        }
      }
    }
  };

  // Prioritize Open Library ISBN result if ISBN was searched
  if (olIsbnSettled.status === 'fulfilled' && olIsbnSettled.value) {
    addItems([olIsbnSettled.value]);
  }
  // Add BrasilAPI if matched an ISBN
  if (brasilSettled.status === 'fulfilled') addItems(brasilSettled.value);
  // Add Google Books
  if (googleSettled.status === 'fulfilled') addItems(googleSettled.value);
  // Add Open Library
  if (olSettled.status === 'fulfilled') addItems(olSettled.value);
  // Add Gutendex
  if (gutenSettled.status === 'fulfilled') addItems(gutenSettled.value);

  return combined;
}

export interface CoverOption {
  id: string;
  url: string;
  source: 'openlibrary' | 'google' | 'brasilapi' | 'gutendex';
  sourceName: string;
  sourceBadge: string;
  title: string;
  authors?: string;
  editionYear?: string;
}

/**
 * Find cover across multiple services for a given title/author/isbn
 */
/**
 * Helper to fetch with an abort timeout so slow APIs never block execution
 */
async function fetchWithTimeout(url: string, ms = 3800): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), ms);
  try {
    const res = await fetch(url, { signal: controller.signal });
    return res;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function fetchBrasilApiCoverOnly(cleanIsbn: string): Promise<string | null> {
  if (!cleanIsbn) return null;
  try {
    const res = await fetchWithTimeout(`https://brasilapi.com.br/api/isbn/v1/${cleanIsbn}`, 3500);
    if (res.ok) {
      const data = await res.json();
      if (data?.cover_url && typeof data.cover_url === 'string') {
        return data.cover_url;
      }
    }
  } catch {}
  return null;
}

async function fetchOpenLibraryCoverOnly(
  title: string,
  author?: string,
  cleanIsbn?: string
): Promise<string | null> {
  if (cleanIsbn) {
    try {
      const bibKey = `ISBN:${cleanIsbn}`;
      const res = await fetchWithTimeout(`https://openlibrary.org/api/books?bibkeys=${bibKey}&format=json&jscmd=data`, 3500);
      if (res.ok) {
        const data = await res.json();
        const item = data[bibKey];
        if (item?.cover?.large || item?.cover?.medium) {
          return item.cover.large || item.cover.medium;
        }
      }
    } catch {}
  }

  if (title) {
    try {
      const olQuery = `${title} ${author || ''}`.trim();
      const res = await fetchWithTimeout(`https://openlibrary.org/search.json?q=${encodeURIComponent(olQuery)}&limit=1`, 3500);
      if (res.ok) {
        const data = await res.json();
        const doc = data.docs?.[0];
        if (doc?.cover_i) {
          return `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg`;
        }
        if (doc?.isbn?.[0]) {
          return `https://covers.openlibrary.org/b/isbn/${doc.isbn[0]}-L.jpg`;
        }
      }
    } catch {}
  }

  return null;
}

async function fetchGoogleCoverOnly(
  title: string,
  author?: string,
  cleanIsbn?: string
): Promise<string | null> {
  try {
    const query = cleanIsbn ? `isbn:${cleanIsbn}` : `${title} ${author || ''}`.trim();
    const gUrl = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=1`;
    const res = await fetchWithTimeout(gUrl, 3500);
    if (res.ok) {
      const data = await res.json();
      const item = data.items?.[0];
      const link = item?.volumeInfo?.imageLinks?.thumbnail || item?.volumeInfo?.imageLinks?.smallThumbnail;
      if (link) {
        return link.replace(/^http:\/\//i, 'https://').replace('&edge=curl', '');
      }
    }
  } catch {}
  return null;
}

/**
 * Find cover across multiple services for a given title/author/isbn.
 * Queries providers concurrently when 'all' is selected for maximum speed.
 */
export async function fetchCoverForBook(
  title: string,
  author?: string,
  isbn?: string,
  preferredProvider: 'all' | 'google' | 'openlibrary' | 'brasilapi' = 'all'
): Promise<string | null> {
  if (!title && !isbn) return null;

  const cleanIsbn = isbn ? isbn.replace(/[^0-9X]/gi, '') : '';

  if (preferredProvider === 'brasilapi') {
    return cleanIsbn ? fetchBrasilApiCoverOnly(cleanIsbn) : null;
  }
  if (preferredProvider === 'openlibrary') {
    return fetchOpenLibraryCoverOnly(title, author, cleanIsbn);
  }
  if (preferredProvider === 'google') {
    return fetchGoogleCoverOnly(title, author, cleanIsbn);
  }

  // When 'all', run candidate providers concurrently and pick the first valid response
  const tasks: Promise<string | null>[] = [];
  if (cleanIsbn) {
    tasks.push(fetchBrasilApiCoverOnly(cleanIsbn));
  }
  tasks.push(fetchOpenLibraryCoverOnly(title, author, cleanIsbn));
  tasks.push(fetchGoogleCoverOnly(title, author, cleanIsbn));

  return new Promise((resolve) => {
    let pending = tasks.length;
    let resolved = false;

    tasks.forEach(async (task) => {
      try {
        const url = await task;
        if (url && !resolved) {
          resolved = true;
          resolve(url);
        }
      } catch {
        // ignore error
      } finally {
        pending--;
        if (pending === 0 && !resolved) {
          resolve(null);
        }
      }
    });
  });
}

/**
 * Search covers from ALL available APIs (Open Library, Google Books, Brasil API, Gutendex)
 * and returns all valid cover candidates so the user can choose the best one.
 */
export async function searchCoversFromAllApis(
  title: string,
  author?: string,
  isbn?: string
): Promise<CoverOption[]> {
  const covers: CoverOption[] = [];
  const seenUrls = new Set<string>();

  const addCover = (c: CoverOption) => {
    if (!c.url || seenUrls.has(c.url)) return;
    seenUrls.add(c.url);
    covers.push(c);
  };

  const cleanIsbn = isbn ? isbn.replace(/[^0-9X]/gi, '') : '';
  const query = `${title} ${author || ''}`.trim();

  const fetchPromises: Promise<void>[] = [];

  // 1. Open Library covers by ISBN
  if (cleanIsbn) {
    fetchPromises.push(
      (async () => {
        try {
          const bibKey = `ISBN:${cleanIsbn}`;
          const res = await fetch(`https://openlibrary.org/api/books?bibkeys=${bibKey}&format=json&jscmd=data`);
          if (res.ok) {
            const data = await res.json();
            const item = data[bibKey];
            const url = item?.cover?.large || item?.cover?.medium;
            if (url) {
              addCover({
                id: `ol-isbn-${cleanIsbn}`,
                url,
                source: 'openlibrary',
                sourceName: 'Open Library',
                sourceBadge: '🏛️ Open Library (ISBN)',
                title: item.title || title,
                authors: author,
                editionYear: item.publish_date,
              });
            }
          }
        } catch {}
      })()
    );
  }

  // 2. Open Library search query (finds multiple editions & cover_i)
  if (query) {
    fetchPromises.push(
      (async () => {
        try {
          const res = await fetch(`https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=8`);
          if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data.docs)) {
              data.docs.forEach((doc: any, idx: number) => {
                if (doc.cover_i) {
                  addCover({
                    id: `ol-doc-${doc.cover_i}-${idx}`,
                    url: `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg`,
                    source: 'openlibrary',
                    sourceName: 'Open Library',
                    sourceBadge: '🏛️ Open Library',
                    title: doc.title || title,
                    authors: doc.author_name?.[0] || author,
                    editionYear: doc.first_publish_year ? String(doc.first_publish_year) : undefined,
                  });
                } else if (doc.isbn && doc.isbn[0]) {
                  addCover({
                    id: `ol-isbn-cover-${doc.isbn[0]}-${idx}`,
                    url: `https://covers.openlibrary.org/b/isbn/${doc.isbn[0]}-L.jpg`,
                    source: 'openlibrary',
                    sourceName: 'Open Library',
                    sourceBadge: '🏛️ Open Library',
                    title: doc.title || title,
                    authors: doc.author_name?.[0] || author,
                    editionYear: doc.first_publish_year ? String(doc.first_publish_year) : undefined,
                  });
                }
              });
            }
          }
        } catch {}
      })()
    );
  }

  // 3. Google Books search
  if (query || cleanIsbn) {
    fetchPromises.push(
      (async () => {
        try {
          const searchParam = cleanIsbn ? `isbn:${cleanIsbn}` : query;
          const gUrl = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(searchParam)}&maxResults=6`;
          const res = await fetch(gUrl);
          if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data.items)) {
              data.items.forEach((item: any) => {
                const info = item.volumeInfo || {};
                let link = info.imageLinks?.thumbnail || info.imageLinks?.smallThumbnail;
                if (link) {
                  link = link.replace(/^http:\/\//i, 'https://').replace('&edge=curl', '');
                  addCover({
                    id: `google-${item.id}`,
                    url: link,
                    source: 'google',
                    sourceName: 'Google Livros',
                    sourceBadge: '🔍 Google Books',
                    title: info.title || title,
                    authors: Array.isArray(info.authors) ? info.authors.join(', ') : author,
                    editionYear: info.publishedDate ? info.publishedDate.substring(0, 4) : undefined,
                  });
                }
              });
            }
          }
        } catch {}
      })()
    );
  }

  // 4. Brasil API by ISBN
  if (cleanIsbn) {
    fetchPromises.push(
      (async () => {
        try {
          const res = await fetch(`https://brasilapi.com.br/api/isbn/v1/${cleanIsbn}`);
          if (res.ok) {
            const data = await res.json();
            if (data.cover_url) {
              addCover({
                id: `brasilapi-${cleanIsbn}`,
                url: data.cover_url,
                source: 'brasilapi',
                sourceName: 'Brasil API',
                sourceBadge: '🇧🇷 Brasil API (CBL)',
                title: data.title || title,
                authors: Array.isArray(data.authors) ? data.authors.join(', ') : author,
                editionYear: data.year ? String(data.year) : undefined,
              });
            }
          }
        } catch {}
      })()
    );
  }

  // 5. Gutendex (Project Gutenberg)
  if (title) {
    fetchPromises.push(
      (async () => {
        try {
          const res = await fetch(`https://gutendex.com/books/?search=${encodeURIComponent(title)}`);
          if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data.results)) {
              data.results.slice(0, 3).forEach((item: any) => {
                const coverUrl = item.formats?.['image/jpeg'];
                if (coverUrl) {
                  addCover({
                    id: `guten-${item.id}`,
                    url: coverUrl,
                    source: 'gutendex',
                    sourceName: 'Gutenberg',
                    sourceBadge: '📖 Gutenberg',
                    title: item.title || title,
                    authors: item.authors?.[0]?.name || author,
                  });
                }
              });
            }
          }
        } catch {}
      })()
    );
  }

  await Promise.allSettled(fetchPromises);
  return covers;
}
