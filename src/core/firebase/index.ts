import { testConnection } from './firestore';

export * from './client';
export * from './auth';
export * from './firestore';
export * from './errors';

// Run connection check on initialization
testConnection();
