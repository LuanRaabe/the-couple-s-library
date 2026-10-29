import React, { useState, useEffect } from 'react';
import { 
  Wrench, 
  Database, 
  ShieldCheck, 
  ShieldAlert, 
  RefreshCw, 
  X, 
  Trash2, 
  Layers,
  CheckCircle2,
  Sparkles
} from 'lucide-react';
import { isDevOrPreview, getDbTarget, setDbTarget, DbTarget } from '@/core/config/env';
import { getAllDraftBookIds, clearAllBookDrafts } from '@/core/session/draft';
import { testConnection } from '@/core/firebase';
import { recoverPreviewToProductionInDb } from '@/features/books';

interface DebugMenuProps {
  isOpen: boolean;
  onClose: () => void;
  isMaintenanceMode: boolean;
  onEnableMaintenance: () => void;
  onDisableMaintenance: () => void;
  onDbTargetChanged?: () => void;
  onSyncProductionSpreadsheet?: (onProgress: (completed: number, total: number, msg?: string) => void) => Promise<void>;
}

export const DebugMenu: React.FC<DebugMenuProps> = ({
  isOpen,
  onClose,
  isMaintenanceMode,
  onEnableMaintenance,
  onDisableMaintenance,
  onDbTargetChanged,
  onSyncProductionSpreadsheet,
}) => {
  const [currentDb, setCurrentDb] = useState<DbTarget>(() => getDbTarget());
  const [draftCount, setDraftCount] = useState<number>(0);
  const [connStatus, setConnStatus] = useState<string | null>(null);
  const [isTestingConn, setIsTestingConn] = useState(false);

  // Sync spreadsheet state in debug menu
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);

  // Recover preview state
  const [isRecovering, setIsRecovering] = useState(false);
  const [recoverStatus, setRecoverStatus] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setDraftCount(getAllDraftBookIds().length);
      setCurrentDb(getDbTarget());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSwitchDb = (target: DbTarget) => {
    setDbTarget(target);
    setCurrentDb(target);
    if (onDbTargetChanged) onDbTargetChanged();
  };

  const handleClearDrafts = () => {
    clearAllBookDrafts();
    setDraftCount(0);
  };

  const handleRunConnTest = async () => {
    setIsTestingConn(true);
    setConnStatus('Testando conexão com o Cloud Firestore...');
    try {
      await testConnection();
      setConnStatus('✓ Conexão com Firestore ativa e responsiva!');
    } catch (err: any) {
      setConnStatus(`✗ Erro na conexão: ${err.message}`);
    } finally {
      setIsTestingConn(false);
    }
  };

  const handleRunSyncSpreadsheet = async () => {
    if (!onSyncProductionSpreadsheet) return;
    setIsSyncing(true);
    setSyncStatus('Sincronizando 84 livros da planilha com o banco de produção...');
    try {
      await onSyncProductionSpreadsheet((completed, total, msg) => {
        setSyncStatus(`Sincronizando: ${completed}/${total} (${msg || ''})`);
      });
      setSyncStatus('✓ 84 livros da planilha gravados no banco de produção com sucesso!');
    } catch (err: any) {
      setSyncStatus(`✗ Erro ao sincronizar: ${err.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleRunRecoverPreview = async () => {
    setIsRecovering(true);
    setRecoverStatus('Buscando e copiando alterações de books_preview para books...');
    try {
      const count = await recoverPreviewToProductionInDb();
      if (count === 0) {
        setRecoverStatus('ℹ Nenhum dado em books_preview encontrado para recuperar.');
      } else {
        setRecoverStatus(`✓ ${count} livro(s) recuperados com sucesso para a coleção 'books'!`);
        if (onDbTargetChanged) onDbTargetChanged();
      }
    } catch (err: any) {
      setRecoverStatus(`✗ Erro na recuperação: ${err.message}`);
    } finally {
      setIsRecovering(false);
    }
  };

  const isPreview = isDevOrPreview();

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-stone-900 rounded-3xl w-full max-w-lg shadow-2xl border border-stone-200 dark:border-stone-800 overflow-hidden text-xs"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 bg-stone-900 text-stone-100 flex items-center justify-between border-b border-stone-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <Wrench className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <span>Menu de Depuração & Manutenção</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                  isPreview ? 'bg-amber-400 text-stone-950' : 'bg-emerald-500 text-white'
                }`}>
                  {isPreview ? 'Ambiente Preview / Dev' : 'Ambiente Produção'}
                </span>
              </h3>
              <p className="text-[11px] text-stone-400">
                Controle de bancos, navegação sem login e rascunhos de sessão
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-white rounded-full hover:bg-stone-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-5 max-h-[80vh] overflow-y-auto">
          
          {/* Section 1: Maintenance Mode (Bypass Login) */}
          <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-stone-800/60 border border-amber-200/80 dark:border-stone-700 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {isMaintenanceMode ? (
                  <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                ) : (
                  <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                )}
                <div>
                  <h4 className="font-bold text-stone-900 dark:text-stone-100">
                    Navegar sem Login (Bypass de Manutenção)
                  </h4>
                  <p className="text-stone-500 dark:text-stone-400 text-[11px]">
                    Permite navegar e testar a estante em preview sem precisar logar na conta Google.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className={`font-semibold ${isMaintenanceMode ? 'text-amber-700 dark:text-amber-300' : 'text-stone-500'}`}>
                Status: {isMaintenanceMode ? 'Ativo (Navegação livre)' : 'Inativo (Exige Login)'}
              </span>

              {isMaintenanceMode ? (
                <button
                  type="button"
                  onClick={() => {
                    onDisableMaintenance();
                  }}
                  className="px-3 py-1.5 bg-stone-200 dark:bg-stone-700 hover:bg-stone-300 dark:hover:bg-stone-600 text-stone-800 dark:text-stone-200 rounded-xl font-semibold transition-colors cursor-pointer"
                >
                  Desativar Bypass
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    onEnableMaintenance();
                    onClose();
                  }}
                  className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-semibold shadow-xs transition-colors cursor-pointer"
                >
                  Ativar Modo Manutenção
                </button>
              )}
            </div>
          </div>

          {/* Section 2: Database Target Separation (Preview vs Deploy) */}
          <div className="p-4 rounded-2xl bg-stone-50 dark:bg-stone-800/40 border border-stone-200 dark:border-stone-700 space-y-3">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-stone-700 dark:text-stone-300" />
              <div>
                <h4 className="font-bold text-stone-900 dark:text-stone-100">
                  Separação de Banco (Coleções Firestore)
                </h4>
                <p className="text-stone-500 dark:text-stone-400 text-[11px]">
                  Alterne entre a base de produção do casal e a base isolada de preview para testes.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => handleSwitchDb('books_preview')}
                className={`p-3 rounded-xl border text-left flex flex-col gap-1 transition-all cursor-pointer ${
                  currentDb === 'books_preview'
                    ? 'bg-amber-100/70 dark:bg-amber-950/60 border-amber-500 text-amber-950 dark:text-amber-200 font-bold shadow-xs'
                    : 'bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-400 hover:border-stone-400'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs">Coleção Preview</span>
                  {currentDb === 'books_preview' && <CheckCircle2 className="w-3.5 h-3.5 text-amber-600" />}
                </div>
                <span className="text-[10px] opacity-80">books_preview</span>
                <span className="text-[10px] text-amber-700 dark:text-amber-400 font-medium mt-1">
                  Recomendado em Staging
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleSwitchDb('books')}
                className={`p-3 rounded-xl border text-left flex flex-col gap-1 transition-all cursor-pointer ${
                  currentDb === 'books'
                    ? 'bg-emerald-100/70 dark:bg-emerald-950/60 border-emerald-500 text-emerald-950 dark:text-emerald-200 font-bold shadow-xs'
                    : 'bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-400 hover:border-stone-400'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs">Coleção Produção</span>
                  {currentDb === 'books' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                </div>
                <span className="text-[10px] opacity-80">books</span>
                <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-medium mt-1">
                  Base real do casal
                </span>
              </button>
            </div>
          </div>

          {/* Section 3: Sync Production Database with Spreadsheet */}
          {onSyncProductionSpreadsheet && (
            <div className="p-4 rounded-2xl bg-stone-50 dark:bg-stone-800/40 border border-stone-200 dark:border-stone-700 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    <span>Atualizar Banco de Produção (84 Livros)</span>
                  </h4>
                  <p className="text-stone-500 dark:text-stone-400 text-[11px]">
                    Sincroniza todos os 84 livros da planilha diretamente na coleção de produção ('books').
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleRunSyncSpreadsheet}
                  disabled={isSyncing}
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-semibold flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
                  <span>{isSyncing ? 'Sincronizando...' : 'Sincronizar'}</span>
                </button>
              </div>

              {syncStatus && (
                <p className={`p-2.5 rounded-xl font-mono text-[11px] ${
                  syncStatus.startsWith('✓')
                    ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                    : 'bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300'
                }`}>
                  {syncStatus}
                </p>
              )}
            </div>
          )}

          {/* Section: Recover trapped preview books into production */}
          <div className="p-4 rounded-2xl bg-amber-500/10 dark:bg-amber-950/20 border border-amber-300 dark:border-amber-800/60 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-bold text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  <span>Recuperar Alterações de Preview para Produção</span>
                </h4>
                <p className="text-stone-600 dark:text-stone-400 text-[11px]">
                  Copia livros e alterações salvas em 'books_preview' e mescla com a coleção principal 'books'.
                </p>
              </div>

              <button
                type="button"
                onClick={handleRunRecoverPreview}
                disabled={isRecovering}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-semibold flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50 shrink-0"
              >
                <RefreshCw className={`w-3 h-3 ${isRecovering ? 'animate-spin' : ''}`} />
                <span>{isRecovering ? 'Recuperando...' : 'Recuperar'}</span>
              </button>
            </div>

            {recoverStatus && (
              <p className={`p-2.5 rounded-xl font-mono text-[11px] ${
                recoverStatus.startsWith('✓')
                  ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                  : 'bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300'
              }`}>
                {recoverStatus}
              </p>
            )}
          </div>

          {/* Section 4: Browser SessionStorage Drafts */}
          <div className="p-4 rounded-2xl bg-stone-50 dark:bg-stone-800/40 border border-stone-200 dark:border-stone-700 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-stone-700 dark:text-stone-300" />
                <div>
                  <h4 className="font-bold text-stone-900 dark:text-stone-100">
                    Rascunhos de Edição em SessionStorage
                  </h4>
                  <p className="text-stone-500 dark:text-stone-400 text-[11px]">
                    {draftCount === 0
                      ? 'Nenhum rascunho de livro pendente na sessão atual.'
                      : `${draftCount} livro(s) com edições salvas na session do navegador.`}
                  </p>
                </div>
              </div>

              {draftCount > 0 && (
                <button
                  type="button"
                  onClick={handleClearDrafts}
                  className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 rounded-xl font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Limpar Rascunhos</span>
                </button>
              )}
            </div>
          </div>

          {/* Section 5: Firestore Connection Diagnostics */}
          <div className="p-4 rounded-2xl bg-stone-50 dark:bg-stone-800/40 border border-stone-200 dark:border-stone-700 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-bold text-stone-900 dark:text-stone-100">
                  Diagnóstico de Conexão Firestore
                </h4>
                <p className="text-stone-500 dark:text-stone-400 text-[11px]">
                  Verifica a acessibilidade do backend Cloud Firestore no projeto atual.
                </p>
              </div>

              <button
                type="button"
                onClick={handleRunConnTest}
                disabled={isTestingConn}
                className="px-3 py-1.5 bg-stone-200 hover:bg-stone-300 dark:bg-stone-700 dark:hover:bg-stone-600 text-stone-800 dark:text-stone-200 rounded-xl font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <RefreshCw className={`w-3 h-3 ${isTestingConn ? 'animate-spin' : ''}`} />
                <span>Testar</span>
              </button>
            </div>

            {connStatus && (
              <p className={`p-2.5 rounded-xl font-mono text-[11px] ${
                connStatus.startsWith('✓') 
                  ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800' 
                  : 'bg-rose-50 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
              }`}>
                {connStatus}
              </p>
            )}
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 bg-stone-100 dark:bg-stone-800/60 border-t border-stone-200 dark:border-stone-700 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-stone-900 hover:bg-stone-800 text-white dark:bg-stone-100 dark:hover:bg-stone-200 dark:text-stone-900 rounded-xl font-semibold cursor-pointer shadow-xs"
          >
            Fechar Menu
          </button>
        </div>
      </div>
    </div>
  );
};
