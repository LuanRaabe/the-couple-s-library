import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LoginPage as LoginCard } from '@/components/LoginPage';
import { useAuth } from '../hooks/useAuth';
import { LibrarySettings } from '@/features/settings';

interface LoginPageProps {
  settings: LibrarySettings;
  onOpenDebugMenu: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  settings,
  onOpenDebugMenu,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const destination = (location.state as any)?.from?.pathname || '/books';

  const { 
    currentUser, 
    sessionExpired, 
    sessionExpiredReason, 
    loginWithGoogle, 
    enableMaintenanceBypass 
  } = useAuth();

  // If already authenticated and session not expired, redirect to intended destination
  useEffect(() => {
    if (currentUser && !sessionExpired) {
      navigate(destination, { replace: true });
    }
  }, [currentUser, sessionExpired, navigate, destination]);

  return (
    <LoginCard
      onLogin={async () => {
        await loginWithGoogle();
        navigate(destination, { replace: true });
      }}
      onEnableMaintenance={() => {
        enableMaintenanceBypass();
        navigate(destination, { replace: true });
      }}
      onOpenDebugMenu={onOpenDebugMenu}
      eleName={settings.eleName}
      elaName={settings.elaName}
      sessionExpired={sessionExpired}
      sessionExpiredReason={sessionExpiredReason}
    />
  );
};
