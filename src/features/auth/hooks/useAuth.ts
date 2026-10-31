import { useState, useEffect } from 'react';
import { User as FirebaseUser, onAuthStateChanged } from 'firebase/auth';
import { auth, loginWithGoogle as firebaseLoginWithGoogle, logoutUser as firebaseLogout } from '@/core/firebase';
import { isMaintenanceBypass, setMaintenanceBypass } from '@/core/config/env';
import { 
  AUTH_SESSION_EXPIRED_EVENT, 
  SessionExpiredDetail, 
  notifySessionExpired 
} from '@/core/session/authSession';

const MAINTENANCE_USER = {
  uid: 'dev-maintenance-admin',
  displayName: 'Luan & Theresa (Preview Manutenção)',
  email: 'luan.raabe202@gmail.com',
  emailVerified: true,
  isAnonymous: false,
  photoURL: null,
} as unknown as FirebaseUser;

export function useAuth() {
  const [realUser, setRealUser] = useState<FirebaseUser | null>(null);
  const [authInitialized, setAuthInitialized] = useState(false);
  const [isBypassActive, setIsBypassActive] = useState<boolean>(() => isMaintenanceBypass());
  const [sessionExpired, setSessionExpired] = useState(false);
  const [sessionExpiredReason, setSessionExpiredReason] = useState<string | null>(null);

  // 1. Firebase Auth state listener with proactive session verification
  useEffect(() => {
    let isMounted = true;

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!isMounted) return;

      if (user) {
        try {
          // Proactively verify the token on startup.
          // getIdToken(false) checks expiration and automatically uses the refresh token
          // if near expiration. If the refresh token was revoked or expired, this throws.
          await user.getIdToken(false);
          if (isMounted) {
            setRealUser(user);
            setSessionExpired(false);
            setSessionExpiredReason(null);
          }
        } catch (err: any) {
          console.warn('Sessão expirada ou inválida detectada na inicialização:', err);
          if (isMounted) {
            setRealUser(null);
            setSessionExpired(true);
            setSessionExpiredReason('Sua sessão expirou por tempo de inatividade. Por favor, faça login com o Google para continuar.');
            firebaseLogout().catch(() => {});
          }
        }
      } else {
        if (isMounted) {
          setRealUser(null);
        }
      }

      if (isMounted) {
        setAuthInitialized(true);
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  // 2. Global session expired listener (triggered by token refresh failure or unauthorized write attempts)
  useEffect(() => {
    const handleSessionExpired = (e: Event) => {
      const detail = (e as CustomEvent<SessionExpiredDetail>).detail;
      setSessionExpired(true);
      setSessionExpiredReason(detail?.reason || 'Sua sessão expirou por tempo de inatividade.');
      setRealUser(null);
      setIsBypassActive(false);
      // Clean up stale client state
      firebaseLogout().catch(() => {});
    };

    window.addEventListener(AUTH_SESSION_EXPIRED_EVENT, handleSessionExpired);
    return () => {
      window.removeEventListener(AUTH_SESSION_EXPIRED_EVENT, handleSessionExpired);
    };
  }, []);

  // 3. Proactive session validation when user returns to tab after leaving the site open/closed for a long time
  useEffect(() => {
    const handleVisibilityOrFocus = async () => {
      if (document.visibilityState === 'visible' && auth.currentUser) {
        try {
          // Attempt to validate/refresh ID token
          await auth.currentUser.getIdToken(false);
        } catch (err: any) {
          console.warn('Sessão expirada detectada ao reabrir a aba:', err);
          notifySessionExpired('Sua sessão expirou enquanto a aba esteve inativa.');
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityOrFocus);
    window.addEventListener('focus', handleVisibilityOrFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
      window.removeEventListener('focus', handleVisibilityOrFocus);
    };
  }, []);

  const enableMaintenanceBypass = () => {
    setMaintenanceBypass(true);
    setIsBypassActive(true);
  };

  const disableMaintenanceBypass = () => {
    setMaintenanceBypass(false);
    setIsBypassActive(false);
  };

  const loginWithGoogle = async () => {
    try {
      const cred = await firebaseLoginWithGoogle();
      setSessionExpired(false);
      setSessionExpiredReason(null);
      return cred;
    } catch (err) {
      console.error('Falha no login com Google:', err);
      throw err;
    }
  };

  const logoutUser = async () => {
    if (isBypassActive) {
      disableMaintenanceBypass();
    }
    if (realUser) {
      await firebaseLogout();
    }
    setSessionExpired(false);
    setSessionExpiredReason(null);
  };

  const dismissSessionExpiredNotice = () => {
    setSessionExpired(false);
    setSessionExpiredReason(null);
  };

  // If realUser is logged in, use realUser. Otherwise, if maintenance bypass is active, use MAINTENANCE_USER.
  const currentUser: FirebaseUser | null = realUser || (isBypassActive ? MAINTENANCE_USER : null);

  return {
    currentUser,
    realUser,
    isMaintenanceMode: isBypassActive && !realUser,
    authInitialized,
    sessionExpired,
    sessionExpiredReason,
    dismissSessionExpiredNotice,
    loginWithGoogle,
    logoutUser,
    enableMaintenanceBypass,
    disableMaintenanceBypass,
  };
}
