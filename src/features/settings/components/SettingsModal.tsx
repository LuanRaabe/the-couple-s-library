import React, { useState, useEffect } from 'react';
import { X, Settings, Heart, Trophy, Check } from 'lucide-react';
import { LibrarySettings } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: LibrarySettings;
  onSaveSettings: (newSettings: LibrarySettings) => Promise<void>;
  onRestoreBaseBooks?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
  onRestoreBaseBooks,
}) => {
  const [eleName, setEleName] = useState(settings.eleName || 'Luan');
  const [elaName, setElaName] = useState(settings.elaName || 'Theresa');
  const [yearlyGoal, setYearlyGoal] = useState<number>(settings.yearlyGoal || 40);
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onSaveSettings({
        eleName: eleName.trim() || 'Luan',
        elaName: elaName.trim() || 'Theresa',
        yearlyGoal: yearlyGoal > 0 ? yearlyGoal : 40,
        updatedAt: new Date().toISOString(),
      });
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-stone-900 rounded-3xl w-full max-w-md shadow-2xl border border-stone-200 dark:border-stone-800 flex flex-col overflow-hidden"
      >
        
        {/* Header */}
        <div className="p-5 border-b border-stone-100 dark:border-stone-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 flex items-center justify-center">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif text-lg font-bold text-stone-900 dark:text-stone-100">
                Configurações da Estante
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Personalize os nomes do casal e a meta do ano
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 rounded-full hover:bg-stone-100 dark:hover:bg-stone-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="bg-rose-50/50 dark:bg-stone-800/50 p-3.5 rounded-2xl border border-rose-200/50 dark:border-stone-700 flex items-center gap-2.5 text-xs text-rose-900 dark:text-rose-200">
            <Heart className="w-4 h-4 text-rose-500 fill-rose-500 shrink-0" />
            <span>As alterações são sincronizadas em tempo real para {settings.eleName} e {settings.elaName}!</span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1 flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              Nome do Leitor (Ele)
            </label>
            <input
              type="text"
              required
              value={eleName}
              onChange={(e) => setEleName(e.target.value)}
              placeholder="Ex: Luan"
              className="w-full px-3 py-2 text-sm rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1 flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
              Nome da Leitora (Ela)
            </label>
            <input
              type="text"
              required
              value={elaName}
              onChange={(e) => setElaName(e.target.value)}
              placeholder="Ex: Theresa"
              className="w-full px-3 py-2 text-sm rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1 flex items-center gap-1.5">
              <Trophy className="w-3.5 h-3.5 text-amber-500" />
              Meta de Livros para 2026 (Juntos)
            </label>
            <input
              type="number"
              min="1"
              max="500"
              required
              value={yearlyGoal}
              onChange={(e) => setYearlyGoal(Number(e.target.value))}
              className="w-full px-3 py-2 text-sm rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 font-bold"
            />
            <span className="text-[11px] text-stone-400 mt-0.5 block">
              Quantos livros vocês dois planejam concluir durante este ano.
            </span>
          </div>

          {onRestoreBaseBooks && (
            <div className="pt-2">
              <div className="p-3.5 rounded-2xl bg-amber-50/80 dark:bg-stone-800/80 border border-amber-200/80 dark:border-amber-900/50 flex items-center justify-between gap-3">
                <div className="text-xs">
                  <p className="font-semibold text-stone-900 dark:text-stone-100">Restaurar Acervo Original de Fábrica</p>
                  <p className="text-[11px] text-stone-500 dark:text-stone-400">
                    Aviso: isso redefine os 84 títulos iniciais e sobrescreve notas, capas e progresso nesses 84 livros.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const ok = window.confirm(
                      "⚠️ ATENÇÃO: Restaurar o acervo original de fábrica irá sobrescrever os dados atuais dos 84 livros iniciais no banco de dados, resetando suas avaliações, resenhas e capas personalizadas nesses 84 livros.\n\nTem certeza de que deseja continuar?"
                    );
                    if (ok) {
                      onClose();
                      onRestoreBaseBooks();
                    }
                  }}
                  className="px-3 py-1.5 text-xs font-semibold bg-white dark:bg-stone-700 text-stone-700 dark:text-stone-200 border border-stone-300 dark:border-stone-600 rounded-xl hover:bg-rose-50 hover:text-rose-700 hover:border-rose-300 shadow-xs shrink-0 transition-colors"
                >
                  Restaurar
                </button>
              </div>
            </div>
          )}

          <div className="pt-3 flex justify-end gap-2 border-t border-stone-100 dark:border-stone-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-xl"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{isSaving ? 'Salvando...' : 'Salvar Alterações'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
