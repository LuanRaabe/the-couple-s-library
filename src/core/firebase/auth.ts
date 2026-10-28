import { signInWithPopup, signOut, UserCredential } from 'firebase/auth';
import { auth, googleProvider } from './client';

export async function loginWithGoogle(): Promise<UserCredential> {
  try {
    return await signInWithPopup(auth, googleProvider);
  } catch (error) {
    console.error('Google Sign-in error:', error);
    throw error;
  }
}

export async function logoutUser(): Promise<void> {
  try {
    await signOut(auth);
  } catch (error) {
    console.error('Sign-out error:', error);
    throw error;
  }
}
