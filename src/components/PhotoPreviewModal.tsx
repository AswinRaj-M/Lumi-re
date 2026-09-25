"use client";

import { useEffect } from "react";
import Image from "next/image";
import { WorkItem } from "@/backend";

interface PhotoPreviewModalProps {
  isOpen: boolean;
  item: WorkItem | null;
  onClose: () => void;
}

export default function PhotoPreviewModal({
  isOpen,
  item,
  onClose,
}: PhotoPreviewModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !item) return null;

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "—";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8 bg-black/90 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative max-w-5xl w-full max-h-[92vh] flex flex-col rounded-2xl bg-neutral-950 border border-neutral-800 overflow-hidden shadow-2xl"
      >
        {/* Top Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-neutral-900 bg-neutral-950/80">
          <div className="flex items-center gap-3">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                item.category === "featured"
                  ? "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)]"
                  : "bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.6)]"
              }`}
            />
            <h3 className="text-base font-bold text-neutral-100 truncate max-w-md">
              {item.title}
            </h3>
            <span className="text-[11px] font-mono uppercase px-2.5 py-0.5 rounded-full border border-neutral-800 bg-neutral-900 text-neutral-400">
              {item.category === "featured" ? `Featured #${item.displayOrder}` : "Gallery"}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <a
              href={item.imageUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-mono text-neutral-400 hover:text-white transition-colors"
            >
              Open Original &nearr;
            </a>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-neutral-900 border border-neutral-800 flex items-center justify-center text-neutral-400 hover:text-white transition-colors cursor-pointer"
            >
              &times;
            </button>
          </div>
        </div>

        {/* Big Image View */}
        <div className="relative w-full flex-1 min-h-[50vh] max-h-[70vh] bg-black flex items-center justify-center p-4">
          <div className="relative w-full h-full min-h-[400px]">
            <Image
              src={item.imageUrl}
              alt={item.title}
              fill
              unoptimized
              className="object-contain"
            />
          </div>
        </div>

        {/* Footer Info */}
        <div className="p-4 border-t border-neutral-900 bg-neutral-950/90 flex flex-wrap items-center justify-between gap-4 text-xs font-mono text-neutral-500">
          <div className="flex items-center gap-4">
            <span>Size: <strong className="text-neutral-300">{formatFileSize(item.fileSize)}</strong></span>
            <span>Uploaded: <strong className="text-neutral-300">{item.createdAt ? new Date(item.createdAt).toLocaleDateString() : "Recent"}</strong></span>
            <span>By: <strong className="text-neutral-300">{item.uploadedBy || "admin"}</strong></span>
          </div>
          <span className="text-neutral-600 truncate max-w-xs">{item.storagePath}</span>
        </div>
      </div>
    </div>
  );
}
