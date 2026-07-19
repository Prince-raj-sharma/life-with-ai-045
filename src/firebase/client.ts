import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyDummyKeyForBuildStepPlaceholder123",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "dummy-project.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "dummy-project",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "dummy-project.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "123456789",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:123456789:web:abcdef"
};

// Initialize Firebase client SDK exclusively in browser environment to prevent Node.js SSR socket hangs
const app = typeof window !== "undefined" 
  ? (getApps().length > 0 ? getApp() : initializeApp(firebaseConfig))
  : ({} as ReturnType<typeof initializeApp>);

const auth = typeof window !== "undefined" ? getAuth(app) : ({} as ReturnType<typeof getAuth>);
const db = typeof window !== "undefined" ? getFirestore(app) : ({} as ReturnType<typeof getFirestore>);
const storage = typeof window !== "undefined" ? getStorage(app) : ({} as ReturnType<typeof getStorage>);
const googleProvider = typeof window !== "undefined" ? new GoogleAuthProvider() : ({} as GoogleAuthProvider);

export { app, auth, db, storage, googleProvider };
