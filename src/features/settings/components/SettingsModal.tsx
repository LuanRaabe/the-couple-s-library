import React, { useState, useEffect } from 'react';
import { X, Settings, Heart, Trophy, Check, Database, RotateCcw, Sparkles } from 'lucide-react';
import { LibrarySettings } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: LibrarySettings;
  onSaveSettings: (newSettings: LibrarySettings) => Promise<void>;
  onSyncProductionSpreadsheet?: (
    onProgress: (completed: number, total: number, msg?: string) => void
  ) => Promise<void>;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
  onSyncProductionSpreadsheet,
}) => {
  const [eleName, setEleName] = useState(settings?.eleName || 'Luan');
  const [elaName, setElaName] = useState(settings?.elaName || 'Theresa');
  const [yearlyGoal, setYearlyGoal] = useState<number>(settings?.yearlyGoal || 40);
  const [isSaving, setIsSaving] = useState(false);

  // Production spreadsheet sync state
  const [isSyncingSpreadsheet, setIsSyncingSpreadsheet] = useState(false);
  const [syncProgress, setSyncProgress] = useState<{
    completed: number;
    total: number;
    msg: string;
    percent: number;
  }>({ completed: 0, total: 84, msg: '', percent: 0 });
  const [syncSuccess, setSyncSuccess] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  useEffect(() => {
    if (settings) {
      setEleName(settings.eleName || 'Luan');
      setElaName(settings.elaName || 'Theresa');
      setYearlyGoal(settings.yearlyGoal || 40);
    }
  }, [settings]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isSyncingSpreadsheet) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, isSyncingSpreadsheet]);

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

  const handleRunSpreadsheetSync = async () => {
    if (!onSyncProductionSpreadsheet) return;
    if (
      !window.confirm(
        'Deseja sincronizar o banco de produção com todos os 84 livros da planilha? As notas e status existentes serão preservados.'
      )
    ) {
      return;
    }

    setIsSyncingSpreadsheet(true);
    setSyncSuccess(false);
    setSyncError(null);
    setSyncProgress({ completed: 0, total: 84, msg: 'Iniciando sincronização...', percent: 0 });

    try {
      await onSyncProductionSpreadsheet((completed, total, msg) => {
        setSyncProgress({
          completed,
          total,
          msg: msg || '',
          percent: total > 0 ? Math.min(100, Math.round((completed / total) * 100)) : 0,
        });
      });
      setSyncSuccess(true);
    } catch (err: any) {
      console.error('Erro na sincronização da planilha:', err);
      setSyncError('Não foi possível sincronizar o banco com a planilha.');
    } finally {
      setIsSyncingSpreadsheet(false);
    }
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSyncingSpreadsheet) {
          onClose();
        }
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-stone-900 rounded-3xl w-full max-w-md shadow-2xl border border-stone-200 dark:border-stone-800 flex flex-col overflow-hidden max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="p-5 border-b border-stone-100 dark:border-stone-800 flex items-center justify-between sticky top-0 bg-white/95 dark:bg-stone-900/95 backdrop-blur-md z-10">
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
            disabled={isSyncingSpreadsheet}
            className="p-2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 rounded-full hover:bg-stone-100 dark:hover:bg-stone-800 disabled:opacity-50"
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

          {/* Spreadsheet Database Sync Section */}
          {onSyncProductionSpreadsheet && (
            <div className="pt-3 border-t border-stone-100 dark:border-stone-800 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-stone-800 dark:text-stone-200">
                <Database className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                <span>Banco de Produção & Planilha</span>
              </div>
              <div className="p-3 bg-stone-50 dark:bg-stone-800/40 rounded-xl border border-stone-200/80 dark:border-stone-700/80 space-y-2.5">
                <p className="text-[11px] text-stone-500 dark:text-stone-400 leading-relaxed">
                  Sincroniza os <strong>84 livros</strong> originais da planilha diretamente no banco de dados principal de produção.
                </p>

                {isSyncingSpreadsheet && (
                  <div className="space-y-1.5 py-1">
                    <div className="flex justify-between text-[11px] text-stone-600 dark:text-stone-300 font-medium">
                      <span className="flex items-center gap-1.5">
                        <RotateCcw className="w-3 h-3 animate-spin text-amber-600" />
                        Sincronizando ({syncProgress.completed} de {syncProgress.total})...
                      </span>
                      <span className="font-mono font-bold text-amber-600 dark:text-amber-400">
                        {syncProgress.percent}%
                      </span>
                    </div>
                    <div className="w-full bg-stone-200 dark:bg-stone-700 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-amber-600 h-1.5 rounded-full transition-all duration-200"
                        style={{ width: `${syncProgress.percent}%` }}
                      />
                    </div>
                  </div>
                )}

                {syncSuccess && (
                  <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 text-[11px] text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>84 livros da planilha sincronizados com sucesso no banco de produção!</span>
                  </div>
                )}

                {syncError && (
                  <p className="text-[11px] text-rose-500 font-medium">
                    {syncError}
                  </p>
                )}

                <button
                  type="button"
                  disabled={isSyncingSpreadsheet}
                  onClick={handleRunSpreadsheetSync}
                  className="w-full py-2 px-3 bg-stone-800 hover:bg-stone-900 dark:bg-stone-700 dark:hover:bg-stone-600 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>
                    {isSyncingSpreadsheet
                      ? `Sincronizando (${syncProgress.completed}/${syncProgress.total})...`
                      : 'Sincronizar Banco de Produção (84 Livros)'}
                  </span>
                </button>
              </div>
            </div>
          )}

          <div className="pt-3 flex justify-end gap-2 border-t border-stone-100 dark:border-stone-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isSyncingSpreadsheet}
              className="px-4 py-2 text-xs font-semibold text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-xl"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving || isSyncingSpreadsheet}
              className="px-5 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm cursor-pointer"
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
