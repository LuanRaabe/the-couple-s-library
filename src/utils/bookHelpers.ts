import { BookStatus, ReaderId } from '../types/book';

export const STATUS_LABELS: Record<BookStatus, string> = {
  quero_ler: 'Quero Ler',
  lendo: 'Lendo',
  lido: 'Lido',
  abandonado: 'Abandonado',
  pausado: 'Pausado',
};

export const STATUS_COLORS: Record<BookStatus, { bg: string; text: string; border: string; dot: string }> = {
  quero_ler: {
    bg: 'bg-sky-50 dark:bg-sky-950/40',
    text: 'text-sky-700 dark:text-sky-300',
    border: 'border-sky-200 dark:border-sky-800',
    dot: 'bg-sky-500',
  },
  lendo: {
    bg: 'bg-amber-50 dark:bg-amber-950/40',
    text: 'text-amber-800 dark:text-amber-300',
    border: 'border-amber-200 dark:border-amber-800',
    dot: 'bg-amber-500 animate-pulse',
  },
  lido: {
    bg: 'bg-emerald-50 dark:bg-emerald-950/40',
    text: 'text-emerald-800 dark:text-emerald-300',
    border: 'border-emerald-200 dark:border-emerald-800',
    dot: 'bg-emerald-500',
  },
  abandonado: {
    bg: 'bg-rose-50 dark:bg-rose-950/40',
    text: 'text-rose-800 dark:text-rose-300',
    border: 'border-rose-200 dark:border-rose-800',
    dot: 'bg-rose-400',
  },
  pausado: {
    bg: 'bg-stone-100 dark:bg-stone-800/60',
    text: 'text-stone-700 dark:text-stone-300',
    border: 'border-stone-300 dark:border-stone-700',
    dot: 'bg-stone-400',
  },
};

export function getReaderBadge(reader: ReaderId, eleName: string, elaName: string) {
  if (reader === 'ele') {
    return {
      label: eleName || 'Ele',
      bg: 'bg-amber-100 dark:bg-amber-950/60',
      text: 'text-amber-900 dark:text-amber-200',
      border: 'border-amber-300/60 dark:border-amber-800',
      colorCode: '#d97706',
    };
  }
  if (reader === 'ela') {
    return {
      label: elaName || 'Ela',
      bg: 'bg-rose-100 dark:bg-rose-950/60',
      text: 'text-rose-900 dark:text-rose-200',
      border: 'border-rose-300/60 dark:border-rose-800',
      colorCode: '#e11d48',
    };
  }
  return {
    label: `${eleName || 'Ele'} & ${elaName || 'Ela'}`,
    bg: 'bg-purple-100 dark:bg-purple-950/60',
    text: 'text-purple-900 dark:text-purple-200',
    border: 'border-purple-300/60 dark:border-purple-800',
    colorCode: '#9333ea',
  };
}

export function calculateProgress(currentPage?: number, pageCount?: number): number {
  if (!pageCount || pageCount <= 0) return 0;
  if (!currentPage || currentPage <= 0) return 0;
  return Math.min(100, Math.round((currentPage / pageCount) * 100));
}
