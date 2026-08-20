import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyBB_i4-PxcX8AuRNvVK0ct18i8KngqfEHQ",
  authDomain: "priya-ai-671f5.firebaseapp.com",
  projectId: "priya-ai-671f5",
  storageBucket: "priya-ai-671f5.firebasestorage.app",
  messagingSenderId: "237105088544",
  appId: "1:237105088544:web:2ef905cd8213cc30ae9445",
  measurementId: "G-VCV9N423XX"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
