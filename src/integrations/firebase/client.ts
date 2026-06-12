import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseApiKey = import.meta.env.VITE_FIREBASE_API_KEY;

if (!firebaseApiKey) {
  throw new Error("Missing VITE_FIREBASE_API_KEY environment variable");
}

const firebaseConfig = {
  apiKey: firebaseApiKey,
  authDomain: "fortress-message-comm.firebaseapp.com",
  projectId: "fortress-message-comm",
  storageBucket: "fortress-message-comm.firebasestorage.app",
  messagingSenderId: "218672035850",
  appId: "1:218672035850:web:b64118894d0c760e8087f3",
  measurementId: "G-YT3WLJW7FG"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();

export default app;
