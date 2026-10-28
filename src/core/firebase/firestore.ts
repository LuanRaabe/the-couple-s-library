import { doc, getDocFromServer } from 'firebase/firestore';
import { db } from './client';

/**
 * Wraps any Firestore promise with an explicit timeout to ensure UI never hangs indefinitely.
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs = 9000,
  errorMsg = 'Tempo limite excedido ao comunicar com o servidor Firestore.'
): Promise<T> {
  let timer: any;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error(errorMsg));
    }, timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Recursively removes undefined fields from payload to satisfy Firestore restrictions.
 */
export function sanitizeForFirestore<T>(data: T): T {
  if (data === undefined || data === null) {
    return data;
  }
  if (Array.isArray(data)) {
    return data
      .filter((item) => item !== undefined)
      .map((item) => sanitizeForFirestore(item)) as unknown as T;
  }
  if (typeof data === 'object' && !(data instanceof Date)) {
    const result: Record<string, any> = {};
    for (const [key, val] of Object.entries(data)) {
      if (val !== undefined) {
        result[key] = sanitizeForFirestore(val);
      }
    }
    return result as T;
  }
  return data;
}

/**
 * Non-blocking connectivity test on startup
 */
export async function testConnection(): Promise<void> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error) {
      console.warn('Firebase initial connectivity check note:', error.message);
    }
  }
}
