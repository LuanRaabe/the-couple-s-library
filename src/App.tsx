/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// Auth Feature & Guard
import { useAuth } from '@/features/auth';
import { LoginPage } from '@/features/auth/pages/LoginPage';
import { ProtectedRoute } from '@/shared/components/ProtectedRoute';

// Layout Shell
import { AppLayout } from '@/shared/layouts/AppLayout';

// Feature Pages (FDD Architecture)
import { BooksPage } from '@/features/books/pages/BooksPage';
import { BookNewPage } from '@/features/books/pages/BookNewPage';
import { BookDetailPage } from '@/features/books/pages/BookDetailPage';
import { BookEditPage } from '@/features/books/pages/BookEditPage';
import { RecommendationsPage } from '@/features/recommendations/pages/RecommendationsPage';
import { StatsPage } from '@/features/stats/pages/StatsPage';
import { SettingsPage } from '@/features/settings/pages/SettingsPage';

// Settings & Debug
import { useLibrarySettings } from '@/features/settings';
import { DebugMenu } from '@/components/DebugMenu';

export default function App() {
  const { 
    currentUser, 
    enableMaintenanceBypass, 
    disableMaintenanceBypass, 
    isMaintenanceMode 
  } = useAuth();
  
  const { settings } = useLibrarySettings(currentUser);
  const [isDebugMenuOpen, setIsDebugMenuOpen] = useState(false);

  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route
          path="/login"
          element={
            <LoginPage
              settings={settings}
              onOpenDebugMenu={() => setIsDebugMenuOpen(true)}
            />
          }
        />
        <Route
          path="/auth/login"
          element={<Navigate to="/login" replace />}
        />

        {/* Protected Routes enclosed in AppLayout Shell */}
        <Route
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          {/* Root Redirect: / -> /books */}
          <Route path="/" element={<Navigate to="/books" replace />} />

          {/* Books Feature Routes */}
          <Route path="/books" element={<BooksPage />} />
          <Route path="/books/new" element={<BookNewPage />} />
          <Route path="/books/:bookId" element={<BookDetailPage />} />
          <Route path="/books/:bookId/edit" element={<BookEditPage />} />
          <Route path="/books/:bookId/notes" element={<BookDetailPage />} />
          <Route path="/books/:bookId/annotations" element={<BookDetailPage />} />

          {/* Recommendations Feature Route */}
          <Route path="/recommendations" element={<RecommendationsPage />} />

          {/* Stats Feature Route */}
          <Route path="/stats" element={<StatsPage />} />

          {/* Settings Feature Routes */}
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/settings/profile" element={<SettingsPage />} />
        </Route>

        {/* Fallback Catch-All */}
        <Route path="*" element={<Navigate to="/books" replace />} />
      </Routes>

      {/* Debug Menu Accessible on Login / Gate Screen */}
      <DebugMenu
        isOpen={isDebugMenuOpen}
        onClose={() => setIsDebugMenuOpen(false)}
        isMaintenanceMode={isMaintenanceMode}
        onEnableMaintenance={enableMaintenanceBypass}
        onDisableMaintenance={disableMaintenanceBypass}
        onDbTargetChanged={() => window.location.reload()}
        onSyncProductionSpreadsheet={async () => {}}
      />
    </BrowserRouter>
  );
}
