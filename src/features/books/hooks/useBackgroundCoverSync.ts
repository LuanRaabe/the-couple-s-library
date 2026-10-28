import { useState, useRef, useCallback } from 'react';
import { Book } from '../types';
import { fetchCoverForBook } from '../services/bookSearchService';

export type CoverSyncProvider = 'all' | 'openlibrary' | 'google' | 'brasilapi';

export interface BackgroundCoverSyncState {
  isRunning: boolean;
  currentIndex: number;
  totalCount: number;
  currentBookTitle: string;
  updatedCount: number;
  isFinished: boolean;
  provider: CoverSyncProvider;
  onlyWithoutCover: boolean;
  setProvider: (provider: CoverSyncProvider) => void;
  setOnlyWithoutCover: (onlyWithout: boolean) => void;
  startSync: (
    allBooks: Book[], 
    onUpdateBook: (book: Book) => Promise<void>,
    onComplete?: (updated: number, total: number) => void
  ) => Promise<void>;
  cancelSync: () => void;
  resetStatus: () => void;
}

export function useBackgroundCoverSync(): BackgroundCoverSyncState {
  const [isRunning, setIsRunning] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [currentBookTitle, setCurrentBookTitle] = useState('');
  const [updatedCount, setUpdatedCount] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [provider, setProvider] = useState<CoverSyncProvider>('all');
  const [onlyWithoutCover, setOnlyWithoutCover] = useState(false);

  const isCancelledRef = useRef(false);

  const cancelSync = useCallback(() => {
    isCancelledRef.current = true;
    setIsRunning(false);
  }, []);

  const resetStatus = useCallback(() => {
    setIsRunning(false);
    setIsFinished(false);
    setCurrentIndex(0);
    setTotalCount(0);
    setCurrentBookTitle('');
    setUpdatedCount(0);
    isCancelledRef.current = false;
  }, []);

  const startSync = useCallback(
    async (
      allBooks: Book[],
      onUpdateBook: (book: Book) => Promise<void>,
      onComplete?: (updated: number, total: number) => void
    ) => {
      isCancelledRef.current = false;
      setIsRunning(true);
      setIsFinished(false);
      setUpdatedCount(0);
      setCurrentIndex(0);

      const targetBooks = onlyWithoutCover
        ? allBooks.filter((b) => !b.coverUrl || b.coverUrl.trim() === '')
        : allBooks;

      setTotalCount(targetBooks.length);

      if (targetBooks.length === 0) {
        setIsRunning(false);
        setIsFinished(true);
        onComplete?.(0, 0);
        return;
      }

      let count = 0;

      // Sequential per-book loop ensures real-time UI ticks and prevents concurrent write clashes
      for (let i = 0; i < targetBooks.length; i++) {
        if (isCancelledRef.current) break;

        const book = targetBooks[i];
        setCurrentBookTitle(book.title);

        try {
          const link = await fetchCoverForBook(book.title, book.authors, book.isbn, provider);
          if (link && link !== book.coverUrl && !isCancelledRef.current) {
            await onUpdateBook({
              ...book,
              coverUrl: link,
              updatedAt: new Date().toISOString(),
            });
            count++;
            setUpdatedCount(count);
          }
        } catch (err) {
          console.warn(`Cover sync error for "${book.title}":`, err);
        } finally {
          setCurrentIndex(i + 1);
        }

        // Brief delay so browser updates DOM and paint frame smoothly
        await new Promise((r) => setTimeout(r, 60));
      }

      const finalUpdated = count;
      const finalTotal = targetBooks.length;

      if (!isCancelledRef.current) {
        setIsRunning(false);
        setIsFinished(true);
        onComplete?.(finalUpdated, finalTotal);
      }
    },
    [onlyWithoutCover, provider]
  );

  return {
    isRunning,
    currentIndex,
    totalCount,
    currentBookTitle,
    updatedCount,
    isFinished,
    provider,
    onlyWithoutCover,
    setProvider,
    setOnlyWithoutCover,
    startSync,
    cancelSync,
    resetStatus,
  };
}
