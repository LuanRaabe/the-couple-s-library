import { auth } from '@/core/firebase/client';

export const AUTH_SESSION_EXPIRED_EVENT = 'nossa_estante_auth_session_expired';

export interface SessionExpiredDetail {
  reason?: string;
  timestamp: number;
}

/**
 * Checks whether an error from Firestore or Firebase Auth indicates that
 * the user's credentials, ID token or permissions are expired/revoked/invalid.
 */
export function isAuthOrPermissionError(error: unknown): boolean {
  if (!error) return false;
  const errObj = error as any;
  const code = (errObj.code || '').toLowerCase();
  const message = (errObj.message || String(error)).toLowerCase();

  return (
    code === 'permission-denied' ||
    code === 'unauthenticated' ||
    code.includes('auth/user-token-expired') ||
    code.includes('auth/id-token-expired') ||
    code.includes('auth/null-user') ||
    code.includes('auth/invalid-user-token') ||
    code.includes('auth/user-disabled') ||
    code.includes('auth/user-not-found') ||
    message.includes('permission-denied') ||
    message.includes('missing or insufficient permissions') ||
    message.includes('unauthenticated') ||
    message.includes('token expired') ||
    message.includes('id-token-expired') ||
    message.includes('user-token-expired')
  );
}

/**
 * Broadcasts a global session expired notification across the app.
 */
export function notifySessionExpired(reason = 'Sua sessão expirou por inatividade. Faça login novamente para continuar salvando.'): void {
  if (typeof window === 'undefined') return;
  const detail: SessionExpiredDetail = {
    reason,
    timestamp: Date.now(),
  };
  window.dispatchEvent(new CustomEvent(AUTH_SESSION_EXPIRED_EVENT, { detail }));
}

/**
 * Proactively verifies and attempts to refresh the Firebase Auth ID token.
 * Returns true if the token is valid or successfully refreshed.
 * If the refresh token has expired or is invalid, notifies session expiration and returns false.
 */
export async function ensureFreshSession(): Promise<boolean> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    return false;
  }

  try {
    // Force refresh the token to verify with Google/Firebase servers
    await currentUser.getIdToken(true);
    return true;
  } catch (err: any) {
    console.warn('Falha na renovação da sessão Firebase:', err);
    notifySessionExpired('Sua sessão expirou por tempo de inatividade. Por favor, faça login com o Google para continuar.');
    return false;
  }
}

/**
 * Wraps a Firestore write or read operation with automatic token refresh recovery.
 * If the operation fails with a permission/token error, it attempts to force-refresh
 * the Firebase ID token and retries the operation once.
 * If the retry still fails, it dispatches the session expired event so the app redirects to login.
 */
export async function withAuthRecovery<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (initialError: any) {
    if (isAuthOrPermissionError(initialError)) {
      console.warn('Erro de autenticação/permissão detectado. Tentando recuperar sessão...');
      const refreshed = await ensureFreshSession();
      if (refreshed) {
        try {
          // Retry the operation with the fresh token
          return await operation();
        } catch (retryError: any) {
          if (isAuthOrPermissionError(retryError)) {
            notifySessionExpired('Sua sessão expirou por inatividade. Faça login novamente para salvar suas alterações.');
          }
          throw retryError;
        }
      } else {
        notifySessionExpired('Sua sessão expirou por inatividade. Faça login novamente para salvar suas alterações.');
      }
    }
    throw initialError;
  }
}
