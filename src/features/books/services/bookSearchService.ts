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
 * Normalizes Google Books volume items into standard GoogleBookSearchResult
 */
export function normalizeGoogleResult(item: any): GoogleBookSearchResult {
  const info = item?.volumeInfo || {};

  let coverUrl = info.imageLinks?.thumbnail || info.imageLinks?.smallThumbnail || '';
  if (coverUrl) {
    coverUrl = coverUrl.replace(/^http:\/\//i, 'https://').replace('&edge=curl', '');
  }

  let isbn = '';
  let isbn10: string | undefined;
  let isbn13: string | undefined;

  if (info.industryIdentifiers && Array.isArray(info.industryIdentifiers)) {
    const id13 = info.industryIdentifiers.find((id: any) => id.type === 'ISBN_13');
    const id10 = info.industryIdentifiers.find((id: any) => id.type === 'ISBN_10');
    if (id13?.identifier) isbn13 = String(id13.identifier).trim();
    if (id10?.identifier) isbn10 = String(id10.identifier).trim();
    isbn = isbn13 || isbn10 || '';
  }

  const authors = Array.isArray(info.authors)
    ? info.authors.join(', ')
    : (info.authors || 'Autor Desconhecido');

  const categories = Array.isArray(info.categories)
    ? info.categories
    : (info.categories ? [info.categories] : []);

  return {
    id: `google-${item.id || Math.random().toString(36).substring(2)}`,
    title: (info.title || 'Sem título').trim(),
    subtitle: info.subtitle ? String(info.subtitle).trim() : undefined,
    authors: authors.trim(),
    coverUrl,
    isbn,
    isbn10,
    isbn13,
    pageCount: typeof info.pageCount === 'number' && info.pageCount > 0 ? info.pageCount : undefined,
    publishedDate: info.publishedDate ? String(info.publishedDate).trim() : '',
    publisher: info.publisher ? String(info.publisher).trim() : '',
    description: info.description ? String(info.description).trim() : '',
    categories,
    language: info.language || 'pt',
    edition: info.contentVersion || undefined,
    source: 'google',
  };
}

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
      return data.items.map(normalizeGoogleResult);
    }
  } catch (error) {
    console.warn('Google Books search failed:', error);
  }

  return [];
}

/**
 * Normalizes Open Library API responses (jscmd=data, search.json, /isbn/.json)
 */
export function normalizeOpenLibraryResult(raw: any, explicitIsbn?: string): GoogleBookSearchResult {
  // 1. If it's a jscmd=data item (from /api/books?jscmd=data):
  if (raw?.title && (raw.authors || raw.by_statement || raw.publishers || raw.cover)) {
    const authors = Array.isArray(raw.authors)
      ? raw.authors.map((a: any) => a.name).filter(Boolean).join(', ')
      : (raw.by_statement || 'Autor Desconhecido');

    const publisher = Array.isArray(raw.publishers)
      ? raw.publishers.map((p: any) => p.name).filter(Boolean).join(', ')
      : (raw.publishers?.[0]?.name || '');

    const isbn = explicitIsbn || raw.identifiers?.isbn_13?.[0] || raw.identifiers?.isbn_10?.[0] || '';
    const cleanDigits = isbn.replace(/[^0-9X]/gi, '');
    const isbn10 = raw.identifiers?.isbn_10?.[0] || (cleanDigits.length === 10 ? cleanDigits : undefined);
    const isbn13 = raw.identifiers?.isbn_13?.[0] || (cleanDigits.length === 13 ? cleanDigits : undefined);

    const coverUrl = raw.cover?.large || 
                     raw.cover?.medium || 
                     raw.cover?.small || 
                     (isbn ? `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg` : '');

    const categories = Array.isArray(raw.subjects)
      ? raw.subjects.map((s: any) => (typeof s === 'string' ? s : s.name)).filter(Boolean).slice(0, 5)
      : [];

    let description = '';
    if (typeof raw.description === 'string') {
      description = raw.description;
    } else if (raw.description?.value) {
      description = raw.description.value;
    } else if (typeof raw.notes === 'string') {
      description = raw.notes;
    } else if (raw.notes?.value) {
      description = raw.notes.value;
    }

    return {
      id: `ol-${raw.key?.replace('/books/', '') || isbn || Math.random().toString(36).substring(2)}`,
      title: (raw.title || 'Sem título').trim(),
      subtitle: raw.subtitle ? String(raw.subtitle).trim() : undefined,
      authors: authors.trim(),
      coverUrl,
      isbn,
      isbn10,
      isbn13,
      pageCount: typeof raw.number_of_pages === 'number' && raw.number_of_pages > 0 ? raw.number_of_pages : undefined,
      publishedDate: raw.publish_date ? String(raw.publish_date).trim() : '',
      publisher: publisher.trim(),
      description: description.trim(),
      categories,
      language: raw.languages?.[0]?.key?.replace('/languages/', '') || 'pt',
      edition: raw.edition_name || undefined,
      source: 'openlibrary',
    };
  }

  // 2. If it's a search.json doc:
  const isbns = Array.isArray(raw?.isbn) ? raw.isbn : [];
  const primaryIsbn = explicitIsbn || isbns[0] || '';
  const cleanIsbnDigits = primaryIsbn.replace(/[^0-9X]/gi, '');
  const isbn10 = isbns.find((i: string) => i.replace(/[^0-9X]/gi, '').length === 10) || (cleanIsbnDigits.length === 10 ? cleanIsbnDigits : undefined);
  const isbn13 = isbns.find((i: string) => i.replace(/[^0-9X]/gi, '').length === 13) || (cleanIsbnDigits.length === 13 ? cleanIsbnDigits : undefined);

  let coverUrl = '';
  if (raw?.cover_i) {
    coverUrl = `https://covers.openlibrary.org/b/id/${raw.cover_i}-L.jpg`;
  } else if (primaryIsbn) {
    coverUrl = `https://covers.openlibrary.org/b/isbn/${primaryIsbn}-L.jpg`;
  }

  const authors = Array.isArray(raw?.author_name)
    ? raw.author_name.join(', ')
    : (raw?.author_name || 'Autor Desconhecido');

  const publishedDate = raw?.first_publish_year ? String(raw.first_publish_year) : '';
  const publisher = Array.isArray(raw?.publisher) ? raw.publisher[0] : (raw?.publisher || '');
  const categories = Array.isArray(raw?.subject) ? raw.subject.slice(0, 5) : [];

  return {
    id: `ol-${raw?.key?.replace('/works/', '') || Math.random().toString(36).substring(2)}`,
    title: (raw?.title || 'Sem título').trim(),
    subtitle: raw?.subtitle ? String(raw.subtitle).trim() : undefined,
    authors: authors.trim(),
    coverUrl,
    isbn: primaryIsbn,
    isbn10,
    isbn13,
    pageCount: typeof raw?.number_of_pages_median === 'number' && raw.number_of_pages_median > 0 ? raw.number_of_pages_median : undefined,
    publishedDate: publishedDate.trim(),
    publisher: String(publisher).trim(),
    description: '',
    categories,
    language: raw?.language?.[0] || 'pt',
    source: 'openlibrary',
  };
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
        return normalizeOpenLibraryResult(item, cleanIsbn);
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
        data.authors = authorName;
        return normalizeOpenLibraryResult(data, cleanIsbn);
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
        return normalizeOpenLibraryResult(doc, cleanIsbn);
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
      return data.docs.map((doc: any) => normalizeOpenLibraryResult(doc));
    }
  } catch (error) {
    console.warn('Open Library search failed:', error);
  }

  return [];
}

/**
 * Normalizes Gutendex (Project Gutenberg) book results
 */
export function normalizeGutendexResult(item: any): GoogleBookSearchResult {
  const authors = Array.isArray(item?.authors)
    ? item.authors.map((a: any) => a.name.split(',').reverse().join(' ').trim()).join(', ')
    : 'Autor Clássico';

  const coverUrl = item?.formats?.['image/jpeg'] || '';
  const categories = Array.isArray(item?.subjects) ? item.subjects.slice(0, 4) : [];

  return {
    id: `gutenberg-${item.id}`,
    title: (item?.title || 'Sem título').trim(),
    authors: authors.trim() || 'Autor Desconhecido',
    coverUrl,
    pageCount: undefined,
    publishedDate: '',
    publisher: 'Project Gutenberg (Domínio Público)',
    description: `Obra clássica do Projeto Gutenberg (ID: ${item.id}). Disponível livremente em domínio público.`,
    categories,
    language: item?.languages?.[0] || 'en',
    source: 'gutendex',
  };
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
      return data.results.slice(0, 10).map(normalizeGutendexResult);
    }
  } catch (error) {
    console.warn('Gutendex search failed:', error);
  }

  return [];
}

/**
 * Normalizes BrasilAPI ISBN lookup responses
 */
export function normalizeBrasilApiResult(data: any, cleanIsbn: string): GoogleBookSearchResult {
  const authors = Array.isArray(data?.authors)
    ? data.authors.join(', ')
    : (data?.authors || 'Autor Desconhecido');

  const isbn = data?.isbn || cleanIsbn;
  const isbn10 = cleanIsbn.length === 10 ? cleanIsbn : undefined;
  const isbn13 = cleanIsbn.length === 13 ? cleanIsbn : undefined;

  return {
    id: `brasilapi-${cleanIsbn}`,
    title: (data?.title || 'Sem título').trim(),
    subtitle: data?.subtitle ? String(data.subtitle).trim() : undefined,
    authors: String(authors).trim(),
    coverUrl: data?.cover_url || '',
    pageCount: typeof data?.page_count === 'number' && data.page_count > 0 ? data.page_count : undefined,
    publishedDate: data?.year ? String(data.year) : '',
    publisher: (data?.publisher || '').trim(),
    description: (data?.synopsis || '').trim(),
    categories: Array.isArray(data?.subjects) ? data.subjects : [],
    isbn,
    isbn10,
    isbn13,
    language: 'pt',
    source: 'brasilapi',
  };
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
      return [normalizeBrasilApiResult(data, cleanIsbn)];
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

// -------------------------------------------------------------
// STREAMING MULTI-API SELECTION & REAL-TIME PROGRESS EXTENSIONS
// -------------------------------------------------------------

export type ApiProviderId = 'openlibrary' | 'google' | 'brasilapi' | 'gutendex';

export interface ApiProviderConfig {
  id: ApiProviderId;
  name: string;
  badge: string;
  description: string;
  speed: string;
  fastest?: boolean;
}

export const SELECTABLE_API_PROVIDERS: ApiProviderConfig[] = [
  {
    id: 'openlibrary',
    name: 'Open Library',
    badge: '🏛️ Open Library',
    description: 'Catálogo aberto mundial e capas em alta resolução (Geralmente a mais rápida)',
    speed: '~300ms',
    fastest: true,
  },
  {
    id: 'google',
    name: 'Google Livros',
    badge: '🔍 Google Books',
    description: 'Catálogo contemporâneo amplo com dados editoriais e sinopses',
    speed: '~800ms',
  },
  {
    id: 'brasilapi',
    name: 'Brasil API (ISBN)',
    badge: '🇧🇷 Brasil API',
    description: 'Base oficial de ISBN do Brasil (Câmara Brasileira do Livro)',
    speed: 'ISBN (~600ms)',
  },
  {
    id: 'gutendex',
    name: 'Gutenberg',
    badge: '📖 Gutenberg',
    description: 'Acervo de literatura clássica mundial e domínio público',
    speed: '~1.5s',
  },
];

export interface ApiSearchStatus {
  providerId: ApiProviderId;
  providerName: string;
  providerBadge: string;
  state: 'idle' | 'searching' | 'success' | 'empty' | 'error';
  count: number;
  message?: string;
  error?: string;
}

export interface StreamBookSearchCallbacks {
  onProviderStatus?: (providerId: ApiProviderId, status: ApiSearchStatus) => void;
  onIncrementalResults?: (newItems: GoogleBookSearchResult[], allItems: GoogleBookSearchResult[]) => void;
}

/**
 * Searches only the user-selected APIs in parallel, streaming each API's results
 * to the UI immediately as soon as that specific API responds.
 */
export async function searchBooksStream(
  query: string,
  selectedProviders: ApiProviderId[] = ['openlibrary', 'google'],
  callbacks?: StreamBookSearchCallbacks
): Promise<GoogleBookSearchResult[]> {
  const trimmed = query.trim();
  if (!trimmed || trimmed.length < 2) return [];

  const isIsbn = /^[\d-]{10,17}[xX]?$/.test(trimmed);
  const cleanIsbn = isIsbn ? trimmed.replace(/[^0-9X]/gi, '') : '';

  const accumulated: GoogleBookSearchResult[] = [];
  const seenNormTitles = new Set<string>();

  const appendUnique = (newItems: GoogleBookSearchResult[]) => {
    const freshlyAdded: GoogleBookSearchResult[] = [];
    for (const item of newItems) {
      const norm = normalizeTitle(item.title);
      if (!seenNormTitles.has(norm)) {
        seenNormTitles.add(norm);
        accumulated.push(item);
        freshlyAdded.push(item);
      } else {
        // If existing item has no cover but newly arrived item has cover, replace
        const idx = accumulated.findIndex((c) => normalizeTitle(c.title) === norm);
        if (idx !== -1 && !accumulated[idx].coverUrl && item.coverUrl) {
          accumulated[idx] = item;
        }
      }
    }
    if (freshlyAdded.length > 0 && callbacks?.onIncrementalResults) {
      callbacks.onIncrementalResults(freshlyAdded, [...accumulated]);
    }
  };

  // Set initial 'searching' state for all selected providers
  selectedProviders.forEach((pId) => {
    const meta = SELECTABLE_API_PROVIDERS.find((p) => p.id === pId);
    callbacks?.onProviderStatus?.(pId, {
      providerId: pId,
      providerName: meta?.name || pId,
      providerBadge: meta?.badge || pId,
      state: 'searching',
      count: 0,
    });
  });

  const tasks = selectedProviders.map(async (providerId) => {
    const meta = SELECTABLE_API_PROVIDERS.find((p) => p.id === providerId);
    try {
      let results: GoogleBookSearchResult[] = [];

      if (providerId === 'openlibrary') {
        if (cleanIsbn) {
          const direct = await fetchBookByOpenLibraryIsbn(cleanIsbn);
          if (direct) results = [direct];
        }
        if (results.length === 0) {
          results = await searchOpenLibrary(trimmed);
        }
      } else if (providerId === 'google') {
        const gQuery = cleanIsbn ? `isbn:${cleanIsbn}` : trimmed;
        results = await searchGoogleBooks(gQuery);
      } else if (providerId === 'brasilapi') {
        if (cleanIsbn) {
          results = await searchBrasilApi(cleanIsbn);
        } else {
          results = [];
        }
      } else if (providerId === 'gutendex') {
        results = await searchGutendex(trimmed);
      }

      // Append immediately
      appendUnique(results);

      callbacks?.onProviderStatus?.(providerId, {
        providerId,
        providerName: meta?.name || providerId,
        providerBadge: meta?.badge || providerId,
        state: results.length > 0 ? 'success' : 'empty',
        count: results.length,
        message:
          results.length > 0
            ? `${results.length} livro(s)`
            : providerId === 'brasilapi' && !cleanIsbn
            ? 'Requer ISBN'
            : '0 livros',
      });

      return results;
    } catch (err: any) {
      console.warn(`Erro na API ${providerId}:`, err);
      callbacks?.onProviderStatus?.(providerId, {
        providerId,
        providerName: meta?.name || providerId,
        providerBadge: meta?.badge || providerId,
        state: 'error',
        count: 0,
        message: 'Tempo esgotado / Falha',
      });
      return [];
    }
  });

  await Promise.allSettled(tasks);
  return accumulated;
}

export interface StreamCoverSearchCallbacks {
  onProviderStatus?: (providerId: ApiProviderId, status: ApiSearchStatus) => void;
  onIncrementalCovers?: (newCovers: CoverOption[], allCovers: CoverOption[]) => void;
}

/**
 * Searches covers only from user-selected APIs in parallel, streaming each API's
 * discovered covers to the UI immediately.
 */
export async function searchCoversStream(
  title: string,
  author?: string,
  isbn?: string,
  selectedProviders: ApiProviderId[] = ['openlibrary', 'google'],
  callbacks?: StreamCoverSearchCallbacks
): Promise<CoverOption[]> {
  const cleanIsbn = isbn ? isbn.replace(/[^0-9X]/gi, '') : '';
  const query = `${title} ${author || ''}`.trim();

  const accumulatedCovers: CoverOption[] = [];
  const seenUrls = new Set<string>();

  const appendCovers = (newCovers: CoverOption[]) => {
    const freshlyAdded: CoverOption[] = [];
    for (const c of newCovers) {
      if (c.url && !seenUrls.has(c.url)) {
        seenUrls.add(c.url);
        accumulatedCovers.push(c);
        freshlyAdded.push(c);
      }
    }
    if (freshlyAdded.length > 0 && callbacks?.onIncrementalCovers) {
      callbacks.onIncrementalCovers(freshlyAdded, [...accumulatedCovers]);
    }
  };

  // Set initial 'searching' state for all chosen providers
  selectedProviders.forEach((pId) => {
    const meta = SELECTABLE_API_PROVIDERS.find((p) => p.id === pId);
    callbacks?.onProviderStatus?.(pId, {
      providerId: pId,
      providerName: meta?.name || pId,
      providerBadge: meta?.badge || pId,
      state: 'searching',
      count: 0,
    });
  });

  const tasks = selectedProviders.map(async (providerId) => {
    const meta = SELECTABLE_API_PROVIDERS.find((p) => p.id === providerId);
    const providerCovers: CoverOption[] = [];

    try {
      if (providerId === 'openlibrary') {
        if (cleanIsbn) {
          try {
            const bibKey = `ISBN:${cleanIsbn}`;
            const res = await fetchWithTimeout(
              `https://openlibrary.org/api/books?bibkeys=${bibKey}&format=json&jscmd=data`,
              4000
            );
            if (res.ok) {
              const data = await res.json();
              const item = data[bibKey];
              const url = item?.cover?.large || item?.cover?.medium;
              if (url) {
                providerCovers.push({
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
        }

        if (query) {
          try {
            const res = await fetchWithTimeout(
              `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=8`,
              4000
            );
            if (res.ok) {
              const data = await res.json();
              if (Array.isArray(data.docs)) {
                data.docs.forEach((doc: any, idx: number) => {
                  if (doc.cover_i) {
                    providerCovers.push({
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
                    providerCovers.push({
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
        }
      } else if (providerId === 'google') {
        const searchParam = cleanIsbn ? `isbn:${cleanIsbn}` : query;
        if (searchParam) {
          try {
            const gUrl = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(searchParam)}&maxResults=6`;
            const res = await fetchWithTimeout(gUrl, 4000);
            if (res.ok) {
              const data = await res.json();
              if (Array.isArray(data.items)) {
                data.items.forEach((item: any) => {
                  const info = item.volumeInfo || {};
                  let link = info.imageLinks?.thumbnail || info.imageLinks?.smallThumbnail;
                  if (link) {
                    link = link.replace(/^http:\/\//i, 'https://').replace('&edge=curl', '');
                    providerCovers.push({
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
        }
      } else if (providerId === 'brasilapi') {
        if (cleanIsbn) {
          try {
            const res = await fetchWithTimeout(`https://brasilapi.com.br/api/isbn/v1/${cleanIsbn}`, 4000);
            if (res.ok) {
              const data = await res.json();
              if (data.cover_url) {
                providerCovers.push({
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
        }
      } else if (providerId === 'gutendex') {
        if (title) {
          try {
            const res = await fetchWithTimeout(
              `https://gutendex.com/books/?search=${encodeURIComponent(title)}`,
              4000
            );
            if (res.ok) {
              const data = await res.json();
              if (Array.isArray(data.results)) {
                data.results.slice(0, 3).forEach((item: any) => {
                  const coverUrl = item.formats?.['image/jpeg'];
                  if (coverUrl) {
                    providerCovers.push({
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
        }
      }

      // Stream newly found covers immediately
      appendCovers(providerCovers);

      callbacks?.onProviderStatus?.(providerId, {
        providerId,
        providerName: meta?.name || providerId,
        providerBadge: meta?.badge || providerId,
        state: providerCovers.length > 0 ? 'success' : 'empty',
        count: providerCovers.length,
        message:
          providerCovers.length > 0
            ? `${providerCovers.length} capa(s)`
            : providerId === 'brasilapi' && !cleanIsbn
            ? 'Requer ISBN'
            : '0 capas',
      });
    } catch (err: any) {
      console.warn(`Erro na API de capas ${providerId}:`, err);
      callbacks?.onProviderStatus?.(providerId, {
        providerId,
        providerName: meta?.name || providerId,
        providerBadge: meta?.badge || providerId,
        state: 'error',
        count: 0,
        message: 'Tempo esgotado / Falha',
      });
    }
  });

  await Promise.allSettled(tasks);
  return accumulatedCovers;
}
