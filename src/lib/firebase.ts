import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

export let auth: ReturnType<typeof getAuth>;
export let isFirebaseConfigured = false;
export let googleProvider: GoogleAuthProvider;

try {
  if (firebaseConfig.apiKey && firebaseConfig.apiKey !== 'your_api_key_here') {
    const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
    auth = getAuth(app);
    isFirebaseConfigured = true;
    googleProvider = new GoogleAuthProvider();
  } else {
    console.warn("Firebase configuration is missing or invalid. Please check your environment variables.");
    // Provide dummy objects to prevent app crash on load
    auth = { currentUser: null } as any;
    googleProvider = {} as any;
  }
} catch (error) {
  console.error("Firebase initialization failed:", error);
  auth = { currentUser: null } as any;
  googleProvider = {} as any;
}
