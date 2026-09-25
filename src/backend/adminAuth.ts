import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  type User,
  type Unsubscribe,
} from "firebase/auth";
import { auth } from "./firebase";

export interface AdminAuthResult {
  success: boolean;
  user?: User;
  error?: string;
}

/**
 * Format Firebase Auth error codes into human-readable messages.
 */
export function formatAuthError(errorCode: string): string {
  switch (errorCode) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "Invalid admin email or password. Please verify and try again.";
    case "auth/invalid-email":
      return "The email address is improperly formatted.";
    case "auth/user-disabled":
      return "This admin account has been disabled. Please contact support.";
    case "auth/too-many-requests":
      return "Access to this account has been temporarily disabled due to many failed login attempts. Try again later.";
    case "auth/network-request-failed":
      return "Network connection error. Please check your internet connectivity.";
    default:
      return "Authentication failed. Please verify your credentials and try again.";
  }
}

/**
 * Sign in an administrator using Firebase Email & Password authentication.
 */
export async function loginAdmin(
  email: string,
  pass: string
): Promise<AdminAuthResult> {
  try {
    const cred = await signInWithEmailAndPassword(auth, email.trim(), pass);
    return {
      success: true,
      user: cred.user,
    };
  } catch (err: unknown) {
    const errorObj = err as { code?: string; message?: string };
    const code = errorObj?.code || "unknown";
    return {
      success: false,
      error: formatAuthError(code),
    };
  }
}

/**
 * Sign out the currently active admin session.
 */
export async function logoutAdmin(): Promise<{ success: boolean; error?: string }> {
  try {
    await signOut(auth);
    return { success: true };
  } catch (err: unknown) {
    const errorObj = err as { message?: string };
    return {
      success: false,
      error: errorObj?.message || "Failed to log out.",
    };
  }
}

/**
 * Get the currently authenticated admin user.
 */
export function getCurrentAdmin(): User | null {
  return auth.currentUser;
}

/**
 * Subscribe to real-time authentication state changes.
 */
export function subscribeToAdminAuth(
  callback: (user: User | null) => void
): Unsubscribe {
  return onAuthStateChanged(auth, callback);
}
