import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getStorage, type FirebaseStorage } from "firebase/storage";
import { getFirestore, type Firestore } from "firebase/firestore";
import { firebaseConfig } from "./config";

// Singleton Firebase initialization for Next.js App Router
const app: FirebaseApp =
  getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

const auth: Auth = getAuth(app);
const storage: FirebaseStorage = getStorage(app);
const db: Firestore = getFirestore(app);

export { app, auth, storage, db };
