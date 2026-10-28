import { useState, useEffect } from 'react';
import { User as FirebaseUser, onAuthStateChanged } from 'firebase/auth';
import { auth, loginWithGoogle, logoutUser as firebaseLogout } from '@/core/firebase';
import { isMaintenanceBypass, setMaintenanceBypass } from '@/core/config/env';

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

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setRealUser(user);
      setAuthInitialized(true);
    });
    return () => unsubscribe();
  }, []);

  const enableMaintenanceBypass = () => {
    setMaintenanceBypass(true);
    setIsBypassActive(true);
  };

  const disableMaintenanceBypass = () => {
    setMaintenanceBypass(false);
    setIsBypassActive(false);
  };

  const logoutUser = async () => {
    if (isBypassActive) {
      disableMaintenanceBypass();
    }
    if (realUser) {
      await firebaseLogout();
    }
  };

  // If realUser is logged in, use realUser. Otherwise, if maintenance bypass is active, use MAINTENANCE_USER.
  const currentUser: FirebaseUser | null = realUser || (isBypassActive ? MAINTENANCE_USER : null);

  return {
    currentUser,
    realUser,
    isMaintenanceMode: isBypassActive && !realUser,
    authInitialized,
    loginWithGoogle,
    logoutUser,
    enableMaintenanceBypass,
    disableMaintenanceBypass,
  };
}
