"use client";

import { useEffect, useState, useRef } from "react";

export interface LightboxPhoto {
  image: string;
  title?: string;
  category?: string;
}

interface PhotoLightboxModalProps {
  isOpen: boolean;
  photo: LightboxPhoto | null;
  photos?: LightboxPhoto[];
  currentIndex?: number;
  categoryLabel?: string;
  onClose: () => void;
  onNavigate?: (index: number) => void;
}

export default function PhotoLightboxModal({
  isOpen,
  photo,
  photos = [],
  currentIndex = -1,
  categoryLabel,
  onClose,
  onNavigate,
}: PhotoLightboxModalProps) {
  const [isZoomed, setIsZoomed] = useState(false);
  const touchStartXRef = useRef<number | null>(null);

  // Reset zoom whenever active photo changes
  useEffect(() => {
    setIsZoomed(false);
  }, [photo?.image]);

  // Lock body scroll while modal is active
  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  // Keyboard navigation & controls
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowRight" && onNavigate && photos.length > 1) {
        onNavigate((currentIndex + 1) % photos.length);
      } else if (e.key === "ArrowLeft" && onNavigate && photos.length > 1) {
        onNavigate((currentIndex - 1 + photos.length) % photos.length);
      } else if (e.key.toLowerCase() === "z") {
        setIsZoomed((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, onNavigate, currentIndex, photos.length]);

  // Touch swipe support for mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0]?.clientX ?? null;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartXRef.current === null || !onNavigate || photos.length <= 1) return;
    const endX = e.changedTouches[0]?.clientX ?? touchStartXRef.current;
    const diff = endX - touchStartXRef.current;

    if (diff > 50) {
      // Swiped right -> go to previous
      onNavigate((currentIndex - 1 + photos.length) % photos.length);
    } else if (diff < -50) {
      // Swiped left -> go to next
      onNavigate((currentIndex + 1) % photos.length);
    }
    touchStartXRef.current = null;
  };

  if (!isOpen || !photo) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[99999] flex flex-col items-center justify-between p-3 sm:p-6 bg-black/95 backdrop-blur-2xl animate-in fade-in duration-200 select-none"
      role="dialog"
      aria-modal="true"
      aria-label="Image Lightbox Modal"
    >
      {/* Top Header Bar */}
      <header
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-7xl flex items-center justify-between px-4 sm:px-6 py-3 rounded-2xl bg-neutral-950/85 border border-neutral-800/80 shadow-2xl backdrop-blur-md z-10"
      >
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
          <span className="w-2.5 h-2.5 rounded-full bg-white shadow-[0_0_12px_rgba(255,255,255,0.8)] flex-none" />
          <div className="flex flex-col min-w-0">
            {categoryLabel && (
              <span className="text-[10px] sm:text-xs font-mono tracking-widest uppercase text-neutral-400 truncate">
                {categoryLabel}
              </span>
            )}
            <h3 className="text-sm sm:text-base font-bold text-neutral-100 truncate max-w-xs sm:max-w-md md:max-w-xl">
              {photo.title || "Photograph Detail"}
            </h3>
          </div>
          {photos.length > 1 && currentIndex >= 0 && (
            <span className="hidden sm:inline-flex text-[11px] font-mono uppercase px-2.5 py-1 rounded-full bg-neutral-900 border border-neutral-800 text-neutral-300 flex-none">
              {currentIndex + 1} / {photos.length}
            </span>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 sm:gap-3 flex-none">
          {/* Zoom Toggle */}
          <button
            type="button"
            onClick={() => setIsZoomed((prev) => !prev)}
            className={`px-3 py-1.5 rounded-xl border text-xs font-mono transition-all flex items-center gap-1.5 cursor-pointer ${
              isZoomed
                ? "bg-white text-black border-white shadow-[0_0_15px_rgba(255,255,255,0.3)]"
                : "bg-neutral-900 border-neutral-800 text-neutral-300 hover:text-white hover:border-neutral-700"
            }`}
            title="Toggle Zoom (Z)"
            aria-label="Toggle Zoom"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {isZoomed ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7" />
              )}
            </svg>
            <span className="hidden sm:inline">{isZoomed ? "Reset (100%)" : "Zoom In"}</span>
          </button>

          {/* Open Raw Full Resolution */}
          <a
            href={photo.image}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden md:inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-neutral-900 border border-neutral-800 text-xs font-mono text-neutral-400 hover:text-white hover:border-neutral-700 transition-colors"
          >
            <span>Full Res</span>
            <span className="text-xs">&nearr;</span>
          </a>

          {/* Close Button */}
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-white hover:border-neutral-600 flex items-center justify-center text-xl transition-all cursor-pointer shadow-lg"
            aria-label="Close photo preview"
          >
            &times;
          </button>
        </div>
      </header>

      {/* Main Image Stage (Crystal Clear, Large, Centered) */}
      <div
        className="relative w-full flex-1 flex items-center justify-center p-2 sm:p-6 overflow-hidden my-auto"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className="relative max-w-full max-h-full flex items-center justify-center"
        >
          <img
            src={photo.image}
            alt={photo.title || "Selected photograph"}
            draggable={false}
            onClick={() => setIsZoomed((prev) => !prev)}
            className={`max-h-[74vh] sm:max-h-[78vh] md:max-h-[82vh] max-w-[94vw] sm:max-w-[88vw] w-auto h-auto object-contain rounded-2xl shadow-[0_25px_100px_rgba(0,0,0,0.95)] border border-neutral-800/80 transition-transform duration-300 ease-out select-none ${
              isZoomed ? "scale-125 sm:scale-135 cursor-zoom-out" : "scale-100 cursor-zoom-in"
            }`}
          />
        </div>

        {/* Navigation Arrows */}
        {photos.length > 1 && onNavigate && (
          <>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onNavigate((currentIndex - 1 + photos.length) % photos.length);
              }}
              className="absolute left-2 sm:left-6 top-1/2 -translate-y-1/2 w-11 h-11 sm:w-13 sm:h-13 rounded-full bg-neutral-950/80 border border-neutral-800 text-white hover:bg-white hover:text-black hover:scale-105 active:scale-95 flex items-center justify-center text-xl sm:text-2xl transition-all cursor-pointer shadow-2xl backdrop-blur-md z-20"
              aria-label="Previous photo"
            >
              &#8249;
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onNavigate((currentIndex + 1) % photos.length);
              }}
              className="absolute right-2 sm:right-6 top-1/2 -translate-y-1/2 w-11 h-11 sm:w-13 sm:h-13 rounded-full bg-neutral-950/80 border border-neutral-800 text-white hover:bg-white hover:text-black hover:scale-105 active:scale-95 flex items-center justify-center text-xl sm:text-2xl transition-all cursor-pointer shadow-2xl backdrop-blur-md z-20"
              aria-label="Next photo"
            >
              &#8250;
            </button>
          </>
        )}
      </div>

      {/* Bottom Hint / Caption Footer */}
      <footer
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-7xl flex items-center justify-between px-4 sm:px-6 py-2.5 rounded-2xl bg-neutral-950/75 border border-neutral-850/80 text-xs font-mono text-neutral-400 backdrop-blur-md z-10"
      >
        <div className="flex items-center gap-2 truncate">
          <span className="text-neutral-200 font-semibold truncate">{photo.title || "Selected Frame"}</span>
          {photos.length > 1 && currentIndex >= 0 && (
            <span className="sm:hidden text-neutral-500 font-mono">
              ({currentIndex + 1}/{photos.length})
            </span>
          )}
        </div>

        <div className="hidden sm:flex items-center gap-3 text-[11px] text-neutral-500">
          <span>
            Click image or press <kbd className="px-1.5 py-0.5 rounded bg-neutral-900 border border-neutral-800 text-neutral-300">Z</kbd> to zoom
          </span>
          <span>•</span>
          <span>
            <kbd className="px-1.5 py-0.5 rounded bg-neutral-900 border border-neutral-800 text-neutral-300">&larr;</kbd> / <kbd className="px-1.5 py-0.5 rounded bg-neutral-900 border border-neutral-800 text-neutral-300">&rarr;</kbd> to switch
          </span>
          <span>•</span>
          <span>
            Press <kbd className="px-1.5 py-0.5 rounded bg-neutral-900 border border-neutral-800 text-neutral-300">ESC</kbd> to close
          </span>
        </div>
      </footer>
    </div>
  );
}

