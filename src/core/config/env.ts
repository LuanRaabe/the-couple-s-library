/**
 * Environment detection and Database collection separation utilities.
 * Supports switching between Production ('books') and Preview ('books_preview')
 * and enabling Maintenance Bypass for development/preview inspection.
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
    import.meta.env.DEV
  );
}

export function getDbTarget(): DbTarget {
  if (typeof window === 'undefined') return 'books';
  const saved = localStorage.getItem('nossa_estante_db_target');
  if (saved === 'books_preview' || saved === 'books') {
    return saved as DbTarget;
  }
  return isDevOrPreview() ? 'books_preview' : 'books';
}

export function setDbTarget(target: DbTarget): void {
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

export function setMaintenanceBypass(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  if (enabled) {
    sessionStorage.setItem('nossa_estante_maintenance_bypass', 'true');
  } else {
    sessionStorage.removeItem('nossa_estante_maintenance_bypass');
  }
}
