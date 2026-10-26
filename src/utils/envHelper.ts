/**
 * Environment detection and Database separation utilities.
 * Allows separating Production ('books') from Preview ('books_preview')
 * and enabling Maintenance Bypass for developers.
 */

export type DbTarget = 'books' | 'books_preview';

export function isDevOrPreview(): boolean {
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname;
  return (
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host.includes('ais-dev') ||
    host.includes('ais-pre') ||
    host.includes('run.app') ||
    import.meta.env.DEV
  );
}

export function getDbTarget(): DbTarget {
  if (typeof window === 'undefined') return 'books';
  const saved = localStorage.getItem('nossa_estante_db_target');
  if (saved === 'books_preview' || saved === 'books') {
    return saved as DbTarget;
  }
  // In dev/preview, default can be 'books_preview' or 'books' based on setting
  return isDevOrPreview() ? 'books_preview' : 'books';
}

export function setDbTarget(target: DbTarget) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('nossa_estante_db_target', target);
}

export function getSettingsCollection(): string {
  const target = getDbTarget();
  return target === 'books_preview' ? 'settings_preview' : 'settings';
}

export function isMaintenanceBypass(): boolean {
  if (typeof window === 'undefined') return false;
  return sessionStorage.getItem('nossa_estante_maintenance_bypass') === 'true';
}

export function setMaintenanceBypass(enabled: boolean) {
  if (typeof window === 'undefined') return;
  if (enabled) {
    sessionStorage.setItem('nossa_estante_maintenance_bypass', 'true');
  } else {
    sessionStorage.removeItem('nossa_estante_maintenance_bypass');
  }
}
