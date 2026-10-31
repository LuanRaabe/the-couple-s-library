import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { RefreshCw } from 'lucide-react';
import { useAuth } from '@/features/auth';

interface ProtectedRouteProps {
  children?: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { currentUser, isMaintenanceMode, authInitialized, sessionExpired } = useAuth();
  const location = useLocation();

  if (!authInitialized) {
    return (
      <div className="min-h-screen bg-[#faf8f5] dark:bg-stone-950 flex flex-col items-center justify-center p-4">
        <RefreshCw className="w-8 h-8 animate-spin text-amber-600 mb-3" />
        <p className="font-serif text-sm text-stone-500">
          Carregando Nossa Estante...
        </p>
      </div>
    );
  }

  // If not authenticated and not in maintenance mode, or session is expired, redirect to /login
  if ((!currentUser && !isMaintenanceMode) || sessionExpired) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children ? <>{children}</> : null;
};
