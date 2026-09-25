"use client";

import { useState, useEffect, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAdminAuth } from "@/context/AdminAuthContext";

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_SECONDS = 60;

export default function AdminLoginPage() {
  const router = useRouter();
  const { login, isAuthenticated, isLoading: authLoading } = useAdminAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Rate limiting / brute-force lockout state
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutRemaining, setLockoutRemaining] = useState(0);

  // If already authenticated, redirect to dashboard
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      router.replace("/admin/dashboard");
    }
  }, [isAuthenticated, authLoading, router]);

  // Lockout countdown timer
  useEffect(() => {
    if (lockoutRemaining <= 0) return;
    const interval = setInterval(() => {
      setLockoutRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setFailedAttempts(0);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [lockoutRemaining]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (lockoutRemaining > 0) {
      setError(`Access locked due to repeated failed attempts. Please wait ${lockoutRemaining}s.`);
      return;
    }

    const cleanEmail = email.trim();
    if (!cleanEmail || !password) {
      setError("Please enter both administrator email and password.");
      return;
    }

    setIsSubmitting(true);
    const res = await login(cleanEmail, password);
    setIsSubmitting(false);

    if (res.success) {
      setFailedAttempts(0);
      router.replace("/admin/dashboard");
    } else {
      const nextFailures = failedAttempts + 1;
      setFailedAttempts(nextFailures);
      // Immediately clear the password on failure for security
      setPassword("");

      if (nextFailures >= MAX_FAILED_ATTEMPTS) {
        setLockoutRemaining(LOCKOUT_DURATION_SECONDS);
        setError(
          `Too many failed attempts. Security lockout active for ${LOCKOUT_DURATION_SECONDS} seconds.`
        );
      } else {
        const remainingTries = MAX_FAILED_ATTEMPTS - nextFailures;
        setError(
          `${res.error || "Authentication failed."} (${remainingTries} attempt${
            remainingTries === 1 ? "" : "s"
          } remaining before lockout)`
        );
      }
    }
  };

  const isLocked = lockoutRemaining > 0;

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center bg-black px-4 sm:px-6 overflow-hidden">
      {/* Subtle atmospheric ambient glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-neutral-900/30 rounded-full blur-[140px] pointer-events-none" />

      {/* Login Card */}
      <div className="relative w-full max-w-md p-8 sm:p-10 rounded-2xl bg-neutral-950/80 border border-neutral-900 shadow-2xl backdrop-blur-md flex flex-col gap-8 z-10">
        
        {/* Header */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono tracking-[0.3em] uppercase text-neutral-500">
              Security Console
            </span>
            <span className="flex items-center gap-1.5">
              <span className={`w-1.5 h-1.5 rounded-full ${isLocked ? "bg-red-500 animate-ping" : "bg-emerald-500 animate-pulse"}`} />
              <span className="text-[9px] font-mono text-neutral-500 uppercase">
                {isLocked ? "Lockout" : "Guarded"}
              </span>
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-neutral-100">
            Admin Access
          </h1>

          <p className="text-xs sm:text-sm text-neutral-400 font-light leading-relaxed">
            Restricted gateway for Lumieré. Authenticate with verified credentials.
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-4 rounded-xl bg-red-950/40 border border-red-900/60 text-xs text-red-300 leading-relaxed flex items-start gap-3">
            <span className="text-red-400 font-bold shrink-0">!</span>
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <label className="text-xs font-mono tracking-wider uppercase text-neutral-400">
              Admin Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@lumiere.com"
              required
              disabled={isLocked || isSubmitting}
              autoComplete="email"
              maxLength={128}
              className="w-full px-4 py-3 rounded-xl bg-neutral-900/80 border border-neutral-800 text-sm text-neutral-100 placeholder:text-neutral-600 focus:outline-none focus:border-neutral-500 focus:ring-1 focus:ring-neutral-500 transition-all font-mono disabled:opacity-50"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs font-mono tracking-wider uppercase text-neutral-400">
              Master Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              required
              disabled={isLocked || isSubmitting}
              autoComplete="current-password"
              maxLength={128}
              className="w-full px-4 py-3 rounded-xl bg-neutral-900/80 border border-neutral-800 text-sm text-neutral-100 placeholder:text-neutral-600 focus:outline-none focus:border-neutral-500 focus:ring-1 focus:ring-neutral-500 transition-all font-mono disabled:opacity-50"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting || authLoading || isLocked}
            className="mt-3 w-full py-3.5 px-6 rounded-xl bg-white text-black font-semibold text-xs tracking-widest uppercase hover:bg-neutral-200 active:scale-[0.99] transition-all disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2 cursor-pointer shadow-lg"
          >
            {isSubmitting ? (
              <>
                <span className="w-3.5 h-3.5 rounded-full border-2 border-neutral-400 border-t-black animate-spin" />
                <span>Verifying Credentials...</span>
              </>
            ) : isLocked ? (
              <span>Locked ({lockoutRemaining}s)</span>
            ) : (
              <span>Unlock Admin Console</span>
            )}
          </button>
        </form>

        {/* Security badges */}
        <div className="flex items-center justify-between text-[10px] font-mono text-neutral-600 border-t border-neutral-900 pt-4">
          <span className="flex items-center gap-1">
            <span className="text-emerald-500">✓</span> Rate-Limited
          </span>
          <span className="flex items-center gap-1">
            <span className="text-emerald-500">✓</span> RS256 Auth
          </span>
          <span className="flex items-center gap-1">
            <span className="text-emerald-500">✓</span> Anti-Brute-Force
          </span>
        </div>

        {/* Footer info */}
        <div className="flex items-center justify-between text-xs text-neutral-600 font-mono">
          <Link
            href="/"
            className="hover:text-neutral-400 transition-colors inline-flex items-center gap-1.5"
          >
            <span>&larr;</span>
            <span>Return to Website</span>
          </Link>
          <span>Firebase Auth</span>
        </div>

      </div>
    </div>
  );
}
