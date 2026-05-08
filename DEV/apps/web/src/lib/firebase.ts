import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';

const apiKey = import.meta.env.VITE_FIREBASE_API_KEY as string | undefined;
const authDomain = import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined;
const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID as string | undefined;

let _app: FirebaseApp | null = null;
if (apiKey && projectId) {
  _app = getApps().length ? getApps()[0]! : initializeApp({ apiKey, authDomain, projectId });
}

export const firebaseAuth = _app ? getAuth(_app) : null;

/** Opens Google sign-in popup and returns a Firebase ID Token. */
export async function signInWithGoogle(): Promise<string> {
  if (!firebaseAuth) throw new Error('Firebase chưa được cấu hình (thiếu VITE_FIREBASE_API_KEY)');
  const provider = new GoogleAuthProvider();
  const credential = await signInWithPopup(firebaseAuth, provider);
  return credential.user.getIdToken();
}
