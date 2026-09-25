"use client";

import { useEffect, ReactNode } from "react";

export interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  itemTitle?: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  isDeleting?: boolean;
  errorMessage?: string | null;
  children?: ReactNode;
}

export default function DeleteConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title = "Delete Work Item",
  itemTitle,
  description = "This action is irreversible. The high-resolution asset and metadata will be permanently deleted from the media vault.",
  confirmText = "Delete Permanently",
  cancelText = "Cancel",
  isDeleting = false,
  errorMessage,
  children,
}: DeleteConfirmModalProps) {
  // Close modal on Escape key press
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isDeleting) {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isDeleting, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md transition-all animate-in fade-in duration-200"
      onClick={() => {
        if (!isDeleting) onClose();
      }}
    >
      {/* Modal Dialog Container */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md rounded-2xl bg-neutral-950 border border-red-900/60 shadow-[0_0_50px_rgba(220,38,38,0.18)] p-6 sm:p-8 flex flex-col gap-6 overflow-hidden animate-in zoom-in-95 duration-200"
      >
        {/* Subtle Top Red Accent Line */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-[2px] bg-gradient-to-r from-transparent via-red-500 to-transparent shadow-[0_0_12px_rgba(239,68,68,0.8)]" />

        {/* Header with Danger Icon */}
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-red-950/80 border border-red-900/80 text-red-400 flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(220,38,38,0.25)]">
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.75"
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </div>

          <div className="flex flex-col gap-1.5 pt-0.5">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono tracking-widest uppercase text-red-400 font-semibold">
                Destructive Action
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
            </div>

            <h3 className="text-xl font-bold uppercase tracking-tight text-neutral-100">
              {title}
            </h3>
          </div>
        </div>

        {/* Content & Warning */}
        <div className="flex flex-col gap-3">
          {itemTitle && (
            <div className="p-3.5 rounded-xl bg-red-950/20 border border-red-900/40 text-xs font-mono text-neutral-200">
              <span className="text-neutral-500">TARGET: </span>
              <span className="text-red-300 font-bold break-all">
                &ldquo;{itemTitle}&rdquo;
              </span>
            </div>
          )}

          <p className="text-xs sm:text-sm text-neutral-400 font-light leading-relaxed">
            {description}
          </p>

          {errorMessage && (
            <div className="p-3 rounded-xl bg-red-950/60 border border-red-500/50 text-red-300 text-xs font-mono leading-relaxed flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {children}
        </div>

        {/* Action Buttons */}
        <div className="pt-4 border-t border-neutral-900 flex items-center justify-end gap-3 font-mono text-xs">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 hover:text-white transition-colors cursor-pointer disabled:opacity-50"
          >
            {cancelText}
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 active:scale-[0.98] text-white font-bold tracking-wider uppercase shadow-[0_0_20px_rgba(220,38,38,0.35)] transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
          >
            {isDeleting ? (
              <>
                <span className="w-3 h-3 rounded-full border-2 border-white border-t-transparent animate-spin" />
                <span>Deleting...</span>
              </>
            ) : (
              <span>{confirmText}</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
