import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, initializeAuth, browserLocalPersistence, browserPopupRedirectResolver, Auth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

let app;
let auth: any = null;

if (firebaseConfig.apiKey && firebaseConfig.apiKey !== 'undefined') {
  if (!getApps().length) {
    app = initializeApp(firebaseConfig);
    auth = initializeAuth(app, {
      persistence: browserLocalPersistence,
      popupRedirectResolver: browserPopupRedirectResolver,
    });
  } else {
    app = getApp();
    auth = getAuth(app);
  }
} else {
  console.warn("Firebase configuration is missing. Authentication features are disabled.");
  // Provide a mock auth object so the app doesn't crash on import, 
  // but attempting to use auth functions will throw errors that can be caught by the UI.
  auth = {
    currentUser: null,
    onAuthStateChanged: () => () => {},
  };
}

export { auth };
export const googleProvider = new GoogleAuthProvider();
