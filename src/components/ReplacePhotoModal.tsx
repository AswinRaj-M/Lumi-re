"use client";

import { useState, useRef, useEffect, ChangeEvent, FormEvent } from "react";
import Image from "next/image";
import { WorkItem, replaceWorkImage } from "@/backend";

interface ReplacePhotoModalProps {
  isOpen: boolean;
  item: WorkItem | null;
  onClose: () => void;
  onSuccess: (updated: WorkItem) => void;
  userEmail?: string;
}

export default function ReplacePhotoModal({
  isOpen,
  item,
  onClose,
  onSuccess,
  userEmail,
}: ReplacePhotoModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [title, setTitle] = useState(item?.title || "");
  const [isReplacing, setIsReplacing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape" && !isReplacing) onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isReplacing, onClose]);

  if (!isOpen || !item) return null;

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const selected = e.target.files?.[0];
    if (!selected) return;

    if (!["image/jpeg", "image/png", "image/webp", "image/avif"].includes(selected.type)) {
      setError("Please select a valid photo file (JPEG, PNG, WebP, AVIF).");
      return;
    }

    if (selected.size > 15 * 1024 * 1024) {
      setError("Image must be smaller than 15MB.");
      return;
    }

    setFile(selected);
    const url = URL.createObjectURL(selected);
    setPreviewUrl(url);
  };

  const handleClose = () => {
    if (!isReplacing) {
      setFile(null);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
      setError(null);
      onClose();
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError("Please select a replacement image file.");
      return;
    }

    setIsReplacing(true);
    setProgress(0);
    setError(null);

    try {
      const updated = await replaceWorkImage({
        workId: item.id,
        file,
        newTitle: title.trim() || item.title,
        userEmail,
        onProgress: (pct) => setProgress(pct),
      });

      onSuccess(updated);
      handleClose();
    } catch (err: unknown) {
      const errObj = err as { message?: string };
      setError(errObj?.message || "Failed to replace image.");
    } finally {
      setIsReplacing(false);
      setProgress(0);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-2xl bg-neutral-950 border border-neutral-800 p-6 sm:p-8 flex flex-col gap-6 shadow-2xl">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-900 pb-4">
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.5)]" />
            <h3 className="text-lg font-bold uppercase tracking-tight text-neutral-100">
              Replace Photo
            </h3>
          </div>
          <span className="text-xs font-mono uppercase px-2.5 py-1 rounded bg-neutral-900 border border-neutral-800 text-neutral-400">
            {item.category === "featured" ? `Featured #${item.displayOrder}` : "Gallery"}
          </span>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-red-950/40 border border-red-900/60 text-xs text-red-300">
            {error}
          </div>
        )}

        {/* Current vs New preview */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] font-mono text-neutral-500 uppercase">Current Photo</span>
            <div className="relative w-full h-32 rounded-xl bg-neutral-900 border border-neutral-800 overflow-hidden">
              <Image src={item.imageUrl} alt={item.title} fill unoptimized className="object-cover" />
            </div>
            <span className="text-xs text-neutral-400 truncate">{item.title}</span>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] font-mono text-neutral-500 uppercase">New Replacement</span>
            {previewUrl ? (
              <div className="relative w-full h-32 rounded-xl bg-neutral-900 border border-neutral-700 overflow-hidden">
                <Image src={previewUrl} alt="Replacement Preview" fill unoptimized className="object-cover" />
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="w-full h-32 rounded-xl border border-dashed border-neutral-700 hover:border-neutral-500 bg-neutral-900/40 flex flex-col items-center justify-center text-center p-2 cursor-pointer transition-colors"
              >
                <span className="text-xs text-neutral-300 font-medium">Choose file</span>
                <span className="text-[10px] text-neutral-500 mt-1">JPG, PNG, WebP, AVIF up to 15MB</span>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-mono text-neutral-400 uppercase">
              Photo Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={item.title}
              className="w-full px-4 py-2.5 rounded-xl bg-neutral-900 border border-neutral-800 text-sm text-neutral-100 focus:outline-none focus:border-neutral-600 font-mono"
            />
          </div>

          {isReplacing && (
            <div className="flex flex-col gap-1.5 pt-1">
              <div className="flex justify-between text-xs font-mono text-neutral-400">
                <span>Replacing image asset...</span>
                <span>{progress}%</span>
              </div>
              <div className="w-full h-1 bg-neutral-900 rounded-full overflow-hidden">
                <div className="h-full bg-amber-400 transition-all" style={{ width: `${progress}%` }} />
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-900">
            <button
              type="button"
              onClick={handleClose}
              disabled={isReplacing}
              className="px-4 py-2 rounded-xl text-xs font-mono text-neutral-400 hover:text-white transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isReplacing || !file}
              className="px-5 py-2.5 rounded-xl bg-white text-black text-xs font-bold uppercase tracking-wider hover:bg-neutral-200 transition-all disabled:opacity-40 cursor-pointer shadow-lg"
            >
              {isReplacing ? "Replacing..." : "Confirm Replacement"}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
