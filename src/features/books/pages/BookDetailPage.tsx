import React from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, BookOpen } from 'lucide-react';
import { useLibraryContext } from '@/shared/context/LibraryContext';
import { BookDetailPage as BookDetailView } from '@/components/BookDetailPage';

export const BookDetailPage: React.FC = () => {
  const { bookId } = useParams<{ bookId: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const {
    books,
    settings,
    activeReader,
    handleUpdateBook,
    handleDeleteBook,
  } = useLibraryContext();

  const currentBook = books.find((b) => b.id === bookId);

  if (!currentBook) {
    return (
      <div className="py-20 text-center space-y-4 bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 max-w-lg mx-auto p-6">
        <BookOpen className="w-14 h-14 text-stone-300 dark:text-stone-700 mx-auto" />
        <div className="space-y-1">
          <h2 className="font-serif text-lg font-bold text-stone-900 dark:text-stone-100">
            Livro não localizado
          </h2>
          <p className="text-xs text-stone-500 dark:text-stone-400">
            O livro solicitado pode ter sido excluído ou o endereço informado está incorreto.
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

  return (
    <BookDetailView
      book={currentBook}
      onBack={() => navigate('/books')}
      settings={settings}
      activeReader={activeReader}
      onUpdateBook={handleUpdateBook}
      onDeleteBook={async (id) => {
        await handleDeleteBook(id);
        navigate('/books');
      }}
    />
  );
};
