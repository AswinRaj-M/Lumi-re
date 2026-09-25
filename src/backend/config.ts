// Firebase configuration provider

export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId?: string;
}

export const firebaseConfig: FirebaseConfig = {
  apiKey:
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY ||
    "AIzaSyAru7_9Z4PSpFkFmW5TDXTFgKIMI1itNq8",
  authDomain:
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ||
    "photography-aafba.firebaseapp.com",
  projectId:
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "photography-aafba",
  storageBucket:
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
    "photography-aafba.firebasestorage.app",
  messagingSenderId:
    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "987227284093",
  appId:
    process.env.NEXT_PUBLIC_FIREBASE_APP_ID ||
    "1:987227284093:web:326a4146fbb8902142c714",
  measurementId:
    process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "G-G9BR8YFZKS",
};
