import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useLibraryContext } from '@/shared/context/LibraryContext';
import { AddBookPage } from '@/components/AddBookPage';

export const BookNewPage: React.FC = () => {
  const navigate = useNavigate();
  const { handleAddBook, settings, activeReader } = useLibraryContext();

  return (
    <AddBookPage
      onBack={() => navigate('/books')}
      onAddBook={async (bookData) => {
        await handleAddBook(bookData);
        navigate('/books');
      }}
      settings={settings}
      activeReader={activeReader}
    />
  );
};
