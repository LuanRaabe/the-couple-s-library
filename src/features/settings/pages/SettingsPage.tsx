import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Settings, Heart, Trophy, Check, ArrowLeft, User, Sparkles, BookOpen, Save, Loader2 } from 'lucide-react';
import { useLibraryContext } from '@/shared/context/LibraryContext';

export const SettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { settings, saveSettings, books, readCount } = useLibraryContext();

  const isProfileSubroute = location.pathname.includes('/profile');

  const [eleName, setEleName] = useState(settings?.eleName || 'Luan');
  const [elaName, setElaName] = useState(settings?.elaName || 'Theresa');
  const [yearlyGoal, setYearlyGoal] = useState<number>(settings?.yearlyGoal || 40);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (settings) {
      setEleName(settings.eleName || 'Luan');
      setElaName(settings.elaName || 'Theresa');
      setYearlyGoal(settings.yearlyGoal || 40);
    }
  }, [settings]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      await saveSettings({
        eleName: eleName.trim() || 'Luan',
        elaName: elaName.trim() || 'Theresa',
        yearlyGoal: yearlyGoal > 0 ? yearlyGoal : 40,
        updatedAt: new Date().toISOString(),
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  const goalPercent = Math.min(100, Math.round((readCount / (settings.yearlyGoal || 1)) * 100));

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-20 animate-in fade-in duration-150">
      
      {/* Top Header */}
      <div className="flex items-center justify-between gap-4 pb-4 border-b border-stone-200/80 dark:border-stone-800">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/books')}
            className="p-2 sm:px-3 sm:py-2 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors flex items-center gap-1.5 font-medium text-xs sm:text-sm cursor-pointer shadow-2xs shrink-0"
            title="Voltar para a Estante"
          >
            <ArrowLeft className="w-4 h-4 text-amber-600" />
            <span>Voltar para a Estante</span>
          </button>
          
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
              Personalização
            </span>
            <h1 className="font-serif text-xl sm:text-2xl font-bold text-stone-900 dark:text-stone-100 leading-tight">
              Configurações da Estante
            </h1>
          </div>
        </div>

        {/* Tab switch between General Settings & Profile */}
        <div className="flex p-1 bg-stone-200/70 dark:bg-stone-800 rounded-2xl text-xs font-semibold">
          <button
            type="button"
            onClick={() => navigate('/settings')}
            className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
              !isProfileSubroute
                ? 'bg-white dark:bg-stone-900 text-amber-800 dark:text-amber-300 shadow-2xs font-bold'
                : 'text-stone-600 dark:text-stone-400'
            }`}
          >
            Geral
          </button>
          <button
            type="button"
            onClick={() => navigate('/settings/profile')}
            className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
              isProfileSubroute
                ? 'bg-white dark:bg-stone-900 text-amber-800 dark:text-amber-300 shadow-2xs font-bold'
                : 'text-stone-600 dark:text-stone-400'
            }`}
          >
            Perfil do Casal
          </button>
        </div>
      </div>

      {/* Save Success Banner */}
      {saveSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-medium flex items-center gap-2 animate-in fade-in">
          <Check className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Configurações salvas com sucesso no banco de dados!</span>
        </div>
      )}

      {/* Settings Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* Readers Identification Card */}
        <div className="bg-white dark:bg-stone-900 rounded-3xl p-5 sm:p-7 border border-stone-200/80 dark:border-stone-800 shadow-xs space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <Heart className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-serif text-base font-bold text-stone-900 dark:text-stone-100">
                Identidade dos Leitores
              </h2>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Personalize os nomes que aparecem nos filtros, notas e recomendações
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1.5">
                Nome de "Ele":
              </label>
              <div className="relative">
                <span className="w-3 h-3 rounded-full bg-blue-500 absolute left-3.5 top-1/2 -translate-y-1/2"></span>
                <input
                  type="text"
                  required
                  value={eleName}
                  onChange={(e) => setEleName(e.target.value)}
                  placeholder="Ex: Luan"
                  className="w-full h-11 pl-9 pr-4 text-sm rounded-2xl border border-stone-300 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-800/60 text-stone-900 dark:text-stone-100 focus:bg-white dark:focus:bg-stone-800 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1.5">
                Nome de "Ela":
              </label>
              <div className="relative">
                <span className="w-3 h-3 rounded-full bg-rose-500 absolute left-3.5 top-1/2 -translate-y-1/2"></span>
                <input
                  type="text"
                  required
                  value={elaName}
                  onChange={(e) => setElaName(e.target.value)}
                  placeholder="Ex: Theresa"
                  className="w-full h-11 pl-9 pr-4 text-sm rounded-2xl border border-stone-300 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-800/60 text-stone-900 dark:text-stone-100 focus:bg-white dark:focus:bg-stone-800 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 font-medium"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Reading Goal Card */}
        <div className="bg-white dark:bg-stone-900 rounded-3xl p-5 sm:p-7 border border-stone-200/80 dark:border-stone-800 shadow-xs space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 flex items-center justify-center">
              <Trophy className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-serif text-base font-bold text-stone-900 dark:text-stone-100">
                Meta de Leitura Compartilhada
              </h2>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Defina o objetivo anual de livros lidos pelo casal
              </p>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-4">
              <div className="w-32">
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1.5">
                  Meta Anual:
                </label>
                <input
                  type="number"
                  min="1"
                  max="500"
                  required
                  value={yearlyGoal}
                  onChange={(e) => setYearlyGoal(Number(e.target.value))}
                  className="w-full h-11 px-3.5 text-sm rounded-2xl border border-stone-300 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-800/60 text-stone-900 dark:text-stone-100 focus:bg-white dark:focus:bg-stone-800 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 font-bold"
                />
              </div>

              <div className="flex-1 text-xs text-stone-500 dark:text-stone-400">
                <span className="font-semibold text-stone-800 dark:text-stone-200">
                  Progresso Atual: {readCount} de {yearlyGoal} livros ({goalPercent}%)
                </span>
                <div className="w-full h-2.5 bg-stone-100 dark:bg-stone-800 rounded-full overflow-hidden mt-1.5">
                  <div
                    className="h-full bg-gradient-to-r from-amber-500 to-amber-600 rounded-full transition-all duration-300"
                    style={{ width: `${goalPercent}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Shelf Summary Stats Card */}
        <div className="bg-amber-50/50 dark:bg-stone-900 rounded-3xl p-5 sm:p-7 border border-amber-200/60 dark:border-stone-800 space-y-3">
          <h3 className="font-serif text-sm font-bold text-amber-900 dark:text-amber-200 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-amber-600" />
            <span>Resumo da Estante</span>
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
            <div className="bg-white dark:bg-stone-800/80 p-3 rounded-2xl border border-stone-200/60 dark:border-stone-700/60">
              <span className="text-[10px] text-stone-400 block font-medium">Total de Obras</span>
              <span className="font-bold text-base text-stone-900 dark:text-stone-100">{books.length}</span>
            </div>
            <div className="bg-white dark:bg-stone-800/80 p-3 rounded-2xl border border-stone-200/60 dark:border-stone-700/60">
              <span className="text-[10px] text-stone-400 block font-medium">Concluídos (Lidos)</span>
              <span className="font-bold text-base text-emerald-600 dark:text-emerald-400">{readCount}</span>
            </div>
            <div className="bg-white dark:bg-stone-800/80 p-3 rounded-2xl border border-stone-200/60 dark:border-stone-700/60 col-span-2 sm:col-span-1">
              <span className="text-[10px] text-stone-400 block font-medium">Estante Compartilhada</span>
              <span className="font-bold text-xs text-amber-700 dark:text-amber-300 truncate block">
                {eleName} & {elaName}
              </span>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={isSaving}
            className="px-6 py-3 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-2xl text-xs sm:text-sm font-semibold flex items-center gap-2 shadow-sm transition-all cursor-pointer"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Salvando...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Salvar Configurações</span>
              </>
            )}
          </button>
        </div>

      </form>

    </div>
  );
};
