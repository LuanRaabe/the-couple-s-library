import { useState, useMemo } from 'react';
import { Book, BookStatus } from '../types';

export function useBookFilters(books: Book[]) {
  const [searchQuery, setSearchQuery] = useState('');
  const [readerFilter, setReaderFilter] = useState<'todos' | 'ele' | 'ela' | 'ambos'>('todos');
  const [statusFilter, setStatusFilter] = useState<'todos' | BookStatus>('todos');

  const filteredBooks = useMemo(() => {
    return books.filter((book) => {
      // Search Query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = book.title.toLowerCase().includes(query);
        const matchesAuthor = book.authors.toLowerCase().includes(query);
        const matchesCategory = book.categories?.some((c) => c.toLowerCase().includes(query));
        if (!matchesTitle && !matchesAuthor && !matchesCategory) return false;
      }

      // Reader Filter
      if (readerFilter !== 'todos') {
        if (readerFilter === 'ele' && book.assignedReader !== 'ele' && book.assignedReader !== 'ambos') return false;
        if (readerFilter === 'ela' && book.assignedReader !== 'ela' && book.assignedReader !== 'ambos') return false;
        if (readerFilter === 'ambos' && book.assignedReader !== 'ambos') return false;
      }

      // Status Filter
      if (statusFilter !== 'todos') {
        if (book.status !== statusFilter) return false;
      }

      return true;
    });
  }, [books, searchQuery, readerFilter, statusFilter]);

  const readCount = useMemo(() => books.filter((b) => b.status === 'lido').length, [books]);

  return {
    searchQuery,
    setSearchQuery,
    readerFilter,
    setReaderFilter,
    statusFilter,
    setStatusFilter,
    filteredBooks,
    readCount,
  };
}
