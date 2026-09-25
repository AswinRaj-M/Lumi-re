"use client";

import { useEffect, useState, useRef, FormEvent, ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useAdminAuth } from "@/context/AdminAuthContext";
import {
  uploadWorkImage,
  subscribeWorkImages,
  deleteWorkImage,
  changeWorkCategory,
  reorderFeaturedWorks,
  type WorkItem,
  type PhotoCategory,
} from "@/backend";
import DeleteConfirmModal from "@/components/DeleteConfirmModal";
import ReplacePhotoModal from "@/components/ReplacePhotoModal";
import PhotoPreviewModal from "@/components/PhotoPreviewModal";

export default function AdminDashboardPage() {
  const router = useRouter();
  const { adminUser, isAuthenticated, isLoading: authLoading, logout } = useAdminAuth();

  // Active Category View: 'featured' | 'gallery' | 'all'
  const [selectedView, setSelectedView] = useState<PhotoCategory | "all">("featured");

  // Unified Upload Form State
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadCategory, setUploadCategory] = useState<PhotoCategory>("featured");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);

  // Works Gallery State
  const [works, setWorks] = useState<WorkItem[]>([]);
  const [isWorksLoading, setIsWorksLoading] = useState(true);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Modals State
  const [itemToDelete, setItemToDelete] = useState<WorkItem | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [itemToReplace, setItemToReplace] = useState<WorkItem | null>(null);
  const [itemToPreview, setItemToPreview] = useState<WorkItem | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadFormRef = useRef<HTMLDivElement>(null);

  // Computed Counts
  const featuredWorks = works
    .filter((w) => w.category === "featured")
    .sort((a, b) => (a.displayOrder ?? 99) - (b.displayOrder ?? 99));
  const galleryWorks = works
    .filter((w) => w.category === "gallery")
    .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
  const featuredCount = featuredWorks.length;
  const isFeaturedFull = featuredCount >= 5;

  // Route Guard
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace("/admin/login");
    }
  }, [authLoading, isAuthenticated, router]);

  // Subscribe to real-time works
  useEffect(() => {
    if (!isAuthenticated) return;

    const unsubscribe = subscribeWorkImages(
      (items) => {
        setWorks(items);
        setIsWorksLoading(false);
      },
      (err) => {
        console.error("Failed to load works:", err);
        setIsWorksLoading(false);
      }
    );

    return () => unsubscribe();
  }, [isAuthenticated]);

  // Auto-switch upload category if featured is already full
  useEffect(() => {
    if (isFeaturedFull && uploadCategory === "featured") {
      setUploadCategory("gallery");
    }
  }, [isFeaturedFull, uploadCategory]);

  // Handle file selection (supports single and multiple)
  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    setUploadError(null);
    setUploadSuccess(null);
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const validFiles: File[] = [];
    for (const f of files) {
      if (!["image/jpeg", "image/png", "image/webp", "image/avif"].includes(f.type)) {
        setUploadError("Only photo formats (JPEG, PNG, WebP, AVIF) are allowed. SVGs and executable files are prohibited.");
        return;
      }
      if (f.size > 15 * 1024 * 1024) {
        setUploadError(`File "${f.name}" exceeds the 15MB size limit.`);
        return;
      }
      validFiles.push(f);
    }

    // Check featured slot capacity if featured is selected
    if (uploadCategory === "featured") {
      const remainingSlots = 5 - featuredCount;
      if (validFiles.length > remainingSlots) {
        setUploadError(
          `Featured photos limit: Only ${remainingSlots} slot${
            remainingSlots === 1 ? "" : "s"
          } left (max 5). You selected ${validFiles.length} file${
            validFiles.length === 1 ? "" : "s"
          }. Please choose up to ${remainingSlots} or select Gallery Photos.`
        );
        return;
      }
    }

    // Revoke old URLs
    previewUrls.forEach((url) => URL.revokeObjectURL(url));

    const newUrls = validFiles.map((f) => URL.createObjectURL(f));
    setSelectedFiles(validFiles);
    setPreviewUrls(newUrls);

    // Default title from first file name if title is empty
    if (!uploadTitle && validFiles.length === 1) {
      const nameWithoutExt = validFiles[0].name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");
      setUploadTitle(nameWithoutExt);
    }
  };

  const handleClearSelected = () => {
    previewUrls.forEach((url) => URL.revokeObjectURL(url));
    setSelectedFiles([]);
    setPreviewUrls([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Submit Upload
  const handleUpload = async (e: FormEvent) => {
    e.preventDefault();
    setUploadError(null);
    setUploadSuccess(null);
    setActionError(null);
    setActionSuccess(null);

    if (!selectedFiles.length) {
      setUploadError("Please choose at least one image to upload.");
      return;
    }

    // Frontend validation of featured limit
    if (uploadCategory === "featured" && featuredCount + selectedFiles.length > 5) {
      setUploadError(
        "Featured photo limit reached. Remove or replace an existing featured photo before adding another."
      );
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      let uploadedCount = 0;

      for (let i = 0; i < selectedFiles.length; i++) {
        const currentFile = selectedFiles[i];
        const titleToUse =
          selectedFiles.length === 1
            ? uploadTitle.trim() || currentFile.name.replace(/\.[^/.]+$/, "")
            : `${uploadTitle.trim() || "Work"} #${i + 1}`;

        const savedItem = await uploadWorkImage({
          file: currentFile,
          title: titleToUse,
          category: uploadCategory,
          userEmail: adminUser?.email || "admin",
          onProgress: (pct) => {
            const overallPct = Math.round(
              ((i + pct / 100) / selectedFiles.length) * 100
            );
            setUploadProgress(overallPct);
          },
        });

        setWorks((prev) => [savedItem, ...prev.filter((w) => w.id !== savedItem.id)]);
        uploadedCount++;
      }

      setUploadSuccess(
        `Successfully uploaded ${uploadedCount} photo${
          uploadedCount === 1 ? "" : "s"
        } to ${uploadCategory === "featured" ? "Featured Photos" : "Gallery Photos"}!`
      );
      setUploadTitle("");
      handleClearSelected();

      // Automatically switch view to the category uploaded to
      setSelectedView(uploadCategory);
    } catch (err: unknown) {
      const errorObj = err as { message?: string };
      setUploadError(
        errorObj?.message ||
          "Failed to upload photo. Please check your connection and permissions."
      );
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  // Category Toggle (Move between Featured and Gallery)
  const handleChangeCategory = async (item: WorkItem) => {
    setActionError(null);
    setActionSuccess(null);

    const targetCategory: PhotoCategory =
      item.category === "featured" ? "gallery" : "featured";

    // Frontend pre-check for moving to featured
    if (targetCategory === "featured" && featuredCount >= 5) {
      setActionError(
        "Cannot move this photo to Featured. Featured Photos already contains 5 photos. Remove or move an existing Featured Photo first."
      );
      return;
    }

    const res = await changeWorkCategory(item.id, targetCategory);
    if (res.success) {
      setActionSuccess(
        `Moved "${item.title}" to ${
          targetCategory === "featured" ? "Featured Photos" : "Gallery Photos"
        }.`
      );
      // Fetch fresh works to ensure order consistency
      fetch("/api/works")
        .then((r) => r.json())
        .then((d) => {
          if (d.success && Array.isArray(d.works)) setWorks(d.works);
        })
        .catch(() => {});
    } else {
      setActionError(res.error || "Failed to change photo category.");
    }
  };

  // Reorder Featured Photo (Up / Down)
  const handleReorder = async (currentIndex: number, direction: "up" | "down") => {
    setActionError(null);
    setActionSuccess(null);

    const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= featuredWorks.length) return;

    const reordered = [...featuredWorks];
    const temp = reordered[currentIndex];
    reordered[currentIndex] = reordered[targetIndex];
    reordered[targetIndex] = temp;

    // Optimistically update state
    const orderMap = new Map<string, number>();
    reordered.forEach((item, idx) => orderMap.set(item.id, idx + 1));

    setWorks((prev) =>
      prev.map((w) =>
        w.category === "featured" && orderMap.has(w.id)
          ? { ...w, displayOrder: orderMap.get(w.id) }
          : w
      )
    );

    const orderedIds = reordered.map((w) => w.id);
    const res = await reorderFeaturedWorks(orderedIds);
    if (!res.success) {
      setActionError(res.error || "Failed to persist new order.");
    } else {
      setActionSuccess("Featured photos reordered successfully.");
    }
  };

  // Confirm Delete
  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;

    const targetId = itemToDelete.id;
    const targetStoragePath = itemToDelete.storagePath;

    setDeletingId(targetId);
    setDeleteError(null);

    try {
      const res = await deleteWorkImage(targetId, targetStoragePath);
      if (res.success) {
        setWorks((prev) => prev.filter((w) => w.id !== targetId));
        setItemToDelete(null);
        setDeleteError(null);
        setActionSuccess(`"${itemToDelete.title}" deleted.`);
      } else {
        setDeleteError(res.error || "Could not delete photo. Please try again.");
      }
    } catch (err: unknown) {
      const errorObj = err as { message?: string };
      setDeleteError(errorObj?.message || "An unexpected error occurred during deletion.");
    } finally {
      setDeletingId(null);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.replace("/admin/login");
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "—";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (authLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 rounded-full border-2 border-neutral-700 border-t-white animate-spin" />
          <span className="text-xs font-mono tracking-widest text-neutral-500 uppercase">
            Loading Admin Console...
          </span>
        </div>
      </div>
    );
  }

  // Filter items to display based on selected view
  const displayItems =
    selectedView === "featured"
      ? featuredWorks
      : selectedView === "gallery"
      ? galleryWorks
      : works;

  return (
    <div className="min-h-screen bg-black text-white px-4 sm:px-8 md:px-12 lg:px-16 py-8 flex flex-col gap-10">
      
      {/* Top Header */}
      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-neutral-900">
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
          <span className="text-xs font-mono tracking-[0.25em] uppercase text-neutral-200 font-bold">
            Lumieré // Photo Studio
          </span>
        </div>

        <div className="flex items-center gap-4 text-xs font-mono">
          <div className="px-3 py-1.5 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-300 flex items-center gap-2">
            <span className="text-neutral-500">ADMIN:</span>
            <span className="text-neutral-100 font-semibold">{adminUser?.email}</span>
          </div>

          <Link
            href="/"
            target="_blank"
            className="px-3.5 py-1.5 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-white hover:border-neutral-600 transition-colors"
          >
            Preview Site &rarr;
          </Link>

          <button
            onClick={handleLogout}
            className="px-3.5 py-1.5 rounded-lg bg-neutral-950 border border-neutral-800 text-neutral-400 hover:text-white hover:border-neutral-600 transition-colors cursor-pointer"
          >
            Sign Out
          </button>
        </div>
      </header>

      {/* Main Studio Body */}
      <main className="max-w-7xl w-full mx-auto flex flex-col gap-12">
        
        {/* Page Title & Intro */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
          <div className="flex flex-col gap-2">
            <div className="inline-flex items-center gap-2 text-[11px] font-mono tracking-widest uppercase text-neutral-500">
              <span>Photo Management System</span>
              <span>&bull;</span>
              <span className="text-emerald-400">One Unified Upload</span>
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black uppercase tracking-tight text-neutral-100">
              Photo Management
            </h1>
            <p className="text-sm sm:text-base text-neutral-400 font-light max-w-2xl">
              One unified upload system with two distinct categories: <strong className="text-neutral-200">Featured Photos</strong> (max 5, ordered for the primary showcase) and <strong className="text-neutral-200">Gallery Photos</strong> (complete photography collection).
            </p>
          </div>

          <button
            onClick={() => uploadFormRef.current?.scrollIntoView({ behavior: "smooth" })}
            className="self-start sm:self-auto px-5 py-3 rounded-xl bg-white text-black text-xs font-bold uppercase tracking-wider hover:bg-neutral-200 transition-all flex items-center gap-2 cursor-pointer shadow-lg shrink-0"
          >
            <span>+ Add Photos</span>
          </button>
        </div>

        {/* Global Feedback Banners */}
        {actionError && (
          <div className="p-4 rounded-xl bg-red-950/40 border border-red-900/60 text-xs text-red-300 leading-relaxed flex items-start justify-between gap-3 animate-in fade-in">
            <div className="flex items-start gap-3">
              <span className="text-red-400 font-bold text-sm">!</span>
              <span>{actionError}</span>
            </div>
            <button
              onClick={() => setActionError(null)}
              className="text-neutral-500 hover:text-white"
            >
              &times;
            </button>
          </div>
        )}

        {actionSuccess && (
          <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-900/60 text-xs text-emerald-300 leading-relaxed flex items-start justify-between gap-3 animate-in fade-in">
            <div className="flex items-start gap-3">
              <span className="text-emerald-400 font-bold">&check;</span>
              <span>{actionSuccess}</span>
            </div>
            <button
              onClick={() => setActionSuccess(null)}
              className="text-neutral-500 hover:text-white"
            >
              &times;
            </button>
          </div>
        )}

        {/* ========================================================
            CATEGORY VIEW SELECTOR & PHOTO MANAGEMENT INTERFACE
            ======================================================== */}
        <section className="flex flex-col gap-6">
          
          {/* Category Selector Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-neutral-950 border border-neutral-900">
            <div className="flex items-center gap-3">
              <span className="text-xs font-mono uppercase tracking-wider text-neutral-400">
                Category:
              </span>

              {/* Category Dropdown / Segmented Selector */}
              <div className="inline-flex rounded-xl bg-neutral-900 p-1 border border-neutral-800">
                <button
                  type="button"
                  onClick={() => setSelectedView("featured")}
                  className={`px-4 py-2 rounded-lg text-xs font-mono tracking-wider uppercase transition-all cursor-pointer flex items-center gap-2 ${
                    selectedView === "featured"
                      ? "bg-white text-black font-bold shadow-md"
                      : "text-neutral-400 hover:text-white"
                  }`}
                >
                  <span>Featured Photos</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] ${
                      selectedView === "featured"
                        ? "bg-black text-white"
                        : "bg-neutral-800 text-neutral-300"
                    }`}
                  >
                    {featuredCount} / 5
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedView("gallery")}
                  className={`px-4 py-2 rounded-lg text-xs font-mono tracking-wider uppercase transition-all cursor-pointer flex items-center gap-2 ${
                    selectedView === "gallery"
                      ? "bg-white text-black font-bold shadow-md"
                      : "text-neutral-400 hover:text-white"
                  }`}
                >
                  <span>Gallery Photos</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] ${
                      selectedView === "gallery"
                        ? "bg-black text-white"
                        : "bg-neutral-800 text-neutral-300"
                    }`}
                  >
                    {galleryWorks.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedView("all")}
                  className={`hidden md:flex px-3.5 py-2 rounded-lg text-xs font-mono tracking-wider uppercase transition-all cursor-pointer items-center gap-2 ${
                    selectedView === "all"
                      ? "bg-white text-black font-bold shadow-md"
                      : "text-neutral-400 hover:text-white"
                  }`}
                >
                  <span>All ({works.length})</span>
                </button>
              </div>
            </div>

            {/* Quick Status Pill */}
            <div className="text-xs font-mono text-neutral-500 flex items-center gap-2">
              {selectedView === "featured" ? (
                <span className="flex items-center gap-2">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isFeaturedFull ? "bg-amber-400" : "bg-emerald-400"
                    }`}
                  />
                  <span>
                    {isFeaturedFull
                      ? "Limit reached (5/5). Showcase is full."
                      : `${5 - featuredCount} slot${5 - featuredCount === 1 ? "" : "s"} remaining`}
                  </span>
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-400" />
                  <span>Full Collection: Unlimited uploads</span>
                </span>
              )}
            </div>
          </div>

          {/* Category Section Header */}
          <div className="flex flex-col gap-1 border-b border-neutral-900 pb-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xl sm:text-2xl font-bold uppercase tracking-tight text-neutral-100 flex items-center gap-3">
                <span>
                  {selectedView === "featured"
                    ? "Featured Photos"
                    : selectedView === "gallery"
                    ? "Gallery Photos"
                    : "All Uploaded Photos"}
                </span>
                <span className="text-xs font-mono px-2.5 py-1 rounded-full bg-neutral-900 border border-neutral-800 text-neutral-400">
                  {selectedView === "featured"
                    ? `${featuredCount} / 5 max`
                    : `${displayItems.length} photos`}
                </span>
              </h2>

              <span className="text-xs font-mono text-neutral-500 uppercase tracking-widest hidden sm:inline">
                {selectedView === "featured" ? "Main Showcase Order" : "Collection Archive"}
              </span>
            </div>

            {selectedView === "featured" && (
              <p className="text-xs text-neutral-400 font-light">
                These are the first 5 photos users see in the main photography showcase. Use the <strong className="text-neutral-200">↑ Move Up</strong> and <strong className="text-neutral-200">↓ Move Down</strong> buttons to calibrate their exact display order.
              </p>
            )}
          </div>

          {/* Photos Display Grid */}
          {isWorksLoading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-4 text-center">
              <div className="w-7 h-7 rounded-full border-2 border-neutral-700 border-t-white animate-spin" />
              <span className="text-xs font-mono tracking-widest text-neutral-500 uppercase">
                Loading photo catalog...
              </span>
            </div>
          ) : displayItems.length === 0 ? (
            /* Empty State */
            <div className="p-16 rounded-2xl bg-neutral-950/40 border border-neutral-900 flex flex-col items-center justify-center text-center gap-4">
              <div className="w-12 h-12 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center text-neutral-500">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-base font-bold text-neutral-300">
                No {selectedView === "featured" ? "featured" : "gallery"} photos yet
              </h3>
              <p className="text-xs text-neutral-500 max-w-sm font-light">
                {selectedView === "featured"
                  ? "Upload up to 5 photos to this category below to display them prominently on the site's main showcase."
                  : "Upload photos to build the complete photography gallery archive."}
              </p>
              <button
                onClick={() => {
                  setUploadCategory(selectedView === "featured" ? "featured" : "gallery");
                  uploadFormRef.current?.scrollIntoView({ behavior: "smooth" });
                }}
                className="mt-2 px-4 py-2 rounded-xl bg-neutral-900 border border-neutral-700 text-xs font-mono text-white hover:border-neutral-500 transition-colors cursor-pointer"
              >
                + Add Photos to {selectedView === "featured" ? "Featured" : "Gallery"}
              </button>
            </div>
          ) : (
            /* Photos Grid */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {displayItems.map((item, index) => {
                const isFeatured = item.category === "featured";
                const isFirst = index === 0;
                const isLast = index === displayItems.length - 1;

                return (
                  <div
                    key={item.id}
                    className="group relative flex flex-col justify-between rounded-2xl bg-neutral-950 border border-neutral-900 hover:border-neutral-700 transition-all duration-300 overflow-hidden shadow-lg"
                  >
                    {/* Image Preview & Order Pill */}
                    <div
                      onClick={() => setItemToPreview(item)}
                      className="relative w-full h-60 bg-neutral-900/60 overflow-hidden cursor-pointer"
                    >
                      <Image
                        src={item.imageUrl}
                        alt={item.title}
                        fill
                        unoptimized
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                      />

                      {/* Category & Order Badges */}
                      <div className="absolute top-3 left-3 flex items-center gap-2 z-10">
                        {isFeatured ? (
                          <span className="text-[11px] font-mono font-bold tracking-widest uppercase text-black bg-white shadow-md rounded-md px-2.5 py-1">
                            #{item.displayOrder ?? index + 1} FEATURED
                          </span>
                        ) : (
                          <span className="text-[11px] font-mono tracking-widest uppercase text-white bg-black/80 backdrop-blur-md border border-neutral-700/60 rounded-md px-2.5 py-1">
                            GALLERY
                          </span>
                        )}
                      </div>

                      {/* Click to Preview overlay hint */}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <span className="px-3 py-1.5 rounded-lg bg-black/70 border border-neutral-700 text-xs font-mono text-white">
                          Click to View Full Size
                        </span>
                      </div>
                    </div>

                    {/* Metadata */}
                    <div className="p-5 flex flex-col gap-4">
                      <div className="flex flex-col gap-1">
                        <h3 className="text-base font-bold tracking-tight text-neutral-100 group-hover:text-white transition-colors truncate">
                          {item.title}
                        </h3>
                        <div className="flex items-center justify-between text-[11px] font-mono text-neutral-500">
                          <span>
                            {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : "Recent"}
                          </span>
                          <span>{formatFileSize(item.fileSize)}</span>
                        </div>
                      </div>

                      {/* Reorder Buttons (Only for Featured Photos) */}
                      {isFeatured && (
                        <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-neutral-900/80 border border-neutral-800/80">
                          <span className="text-[11px] font-mono text-neutral-400">
                            Display Order: <strong className="text-white">#{item.displayOrder ?? index + 1}</strong>
                          </span>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleReorder(index, "up")}
                              disabled={isFirst}
                              title="Move Up in order"
                              className="px-2.5 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-xs text-neutral-200 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
                            >
                              &uarr; Up
                            </button>
                            <button
                              type="button"
                              onClick={() => handleReorder(index, "down")}
                              disabled={isLast}
                              title="Move Down in order"
                              className="px-2.5 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-xs text-neutral-200 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
                            >
                              &darr; Down
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Primary Actions: Replace, Move Category, Delete */}
                      <div className="pt-3 border-t border-neutral-900 flex items-center justify-between text-xs font-mono gap-2">
                        {/* Change Category Action */}
                        <button
                          type="button"
                          onClick={() => handleChangeCategory(item)}
                          className={`text-xs transition-colors flex items-center gap-1 cursor-pointer ${
                            isFeatured
                              ? "text-blue-400 hover:text-blue-300"
                              : isFeaturedFull
                              ? "text-neutral-500 hover:text-amber-400"
                              : "text-amber-400 hover:text-amber-300"
                          }`}
                          title={
                            !isFeatured && isFeaturedFull
                              ? "Featured category is full (5/5). Remove or move an existing featured photo first."
                              : undefined
                          }
                        >
                          <span>{isFeatured ? "Move to Gallery" : "Move to Featured"}</span>
                        </button>

                        <div className="flex items-center gap-3">
                          {/* Preview Button */}
                          <button
                            type="button"
                            onClick={() => setItemToPreview(item)}
                            className="text-neutral-400 hover:text-white transition-colors cursor-pointer"
                          >
                            Preview
                          </button>

                          {/* Replace Photo Button */}
                          <button
                            type="button"
                            onClick={() => setItemToReplace(item)}
                            className="text-neutral-400 hover:text-white transition-colors cursor-pointer"
                          >
                            Replace
                          </button>

                          {/* Delete Photo Button */}
                          <button
                            type="button"
                            onClick={() => {
                              setItemToDelete(item);
                              setDeleteError(null);
                            }}
                            className="text-red-400 hover:text-red-300 transition-colors cursor-pointer"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ========================================================
            SECTION: ONE UNIFIED PHOTO UPLOAD SYSTEM
            ======================================================== */}
        <section
          ref={uploadFormRef}
          className="p-6 sm:p-10 rounded-2xl bg-neutral-950/90 border border-neutral-900 flex flex-col gap-8 shadow-2xl backdrop-blur-md"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-neutral-900/80 pb-5 gap-2">
            <div className="flex items-center gap-3">
              <span className="w-2.5 h-2.5 rounded-full bg-white shadow-[0_0_10px_rgba(255,255,255,0.6)]" />
              <h2 className="text-lg sm:text-xl font-bold uppercase tracking-tight text-neutral-100">
                Add Photos
              </h2>
            </div>
            <span className="text-xs font-mono text-neutral-500 uppercase tracking-widest">
              Unified Upload Console &bull; Direct Cloud Storage
            </span>
          </div>

          {/* Feedback Alerts */}
          {uploadError && (
            <div className="p-4 rounded-xl bg-red-950/40 border border-red-900/60 text-xs text-red-300 leading-relaxed flex items-start gap-3 animate-in fade-in">
              <span className="text-red-400 font-bold">!</span>
              <span>{uploadError}</span>
            </div>
          )}

          {uploadSuccess && (
            <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-900/60 text-xs text-emerald-300 leading-relaxed flex items-start gap-3 animate-in fade-in">
              <span className="text-emerald-400 font-bold">&check;</span>
              <span>{uploadSuccess}</span>
            </div>
          )}

          <form onSubmit={handleUpload} className="flex flex-col gap-8">
            
            {/* 1. File Upload Dropzone */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-mono tracking-wider uppercase text-neutral-400">
                Select Photo(s) <span className="text-neutral-600">(JPG, PNG, WebP, AVIF up to 15MB &bull; Multi-select supported)</span>
              </label>

              {previewUrls.length === 0 ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="group relative border-2 border-dashed border-neutral-800 hover:border-neutral-600 rounded-2xl p-8 sm:p-12 flex flex-col items-center justify-center text-center cursor-pointer transition-all bg-neutral-900/20 hover:bg-neutral-900/40"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/avif"
                    multiple
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <div className="w-12 h-12 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center text-neutral-400 group-hover:text-white group-hover:scale-105 transition-all mb-4">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                    </svg>
                  </div>
                  <span className="text-sm font-semibold text-neutral-200 group-hover:text-white transition-colors">
                    Click to select or drag and drop photo(s)
                  </span>
                  <span className="text-xs font-mono text-neutral-500 mt-1">
                    Select 1 or more images to store in the cloud
                  </span>
                </div>
              ) : (
                /* Selected Previews */
                <div className="flex flex-col gap-4 p-4 rounded-2xl border border-neutral-800 bg-neutral-900/30">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono text-neutral-400">
                      Selected: <strong className="text-white">{selectedFiles.length} file{selectedFiles.length === 1 ? "" : "s"}</strong>
                    </span>
                    <button
                      type="button"
                      onClick={handleClearSelected}
                      className="text-xs font-mono text-red-400 hover:text-red-300 underline cursor-pointer"
                    >
                      Clear All
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3">
                    {previewUrls.map((url, idx) => (
                      <div
                        key={idx}
                        className="relative h-28 rounded-xl overflow-hidden bg-neutral-950 border border-neutral-800 flex flex-col justify-end p-2 group"
                      >
                        <Image src={url} alt={`Preview ${idx + 1}`} fill unoptimized className="object-cover" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />
                        <span className="relative z-10 text-[10px] font-mono text-white truncate">
                          {selectedFiles[idx]?.name}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 2. Unified Category Selector (Radio Style as Required) */}
            <div className="flex flex-col gap-3">
              <label className="text-xs font-mono tracking-wider uppercase text-neutral-400">
                Photo Category
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Option 1: Featured Photos */}
                <label
                  className={`relative p-5 rounded-2xl border flex flex-col gap-2 transition-all cursor-pointer ${
                    uploadCategory === "featured"
                      ? "border-white bg-neutral-900/80 shadow-lg ring-1 ring-white/50"
                      : "border-neutral-800 bg-neutral-900/30 hover:border-neutral-700"
                  } ${isFeaturedFull ? "opacity-60 cursor-not-allowed" : ""}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="photoCategory"
                        value="featured"
                        checked={uploadCategory === "featured"}
                        disabled={isFeaturedFull}
                        onChange={() => setUploadCategory("featured")}
                        className="w-4 h-4 text-white bg-neutral-900 border-neutral-700 focus:ring-0 cursor-pointer"
                      />
                      <span className="text-sm font-bold text-neutral-100">
                        Featured Photos
                      </span>
                    </div>

                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                        isFeaturedFull
                          ? "bg-amber-950/80 border border-amber-800 text-amber-300"
                          : "bg-neutral-800 text-neutral-300"
                      }`}
                    >
                      {featuredCount} / 5 max
                    </span>
                  </div>

                  <p className="text-xs text-neutral-400 font-light pl-7">
                    Primary showcase highlight photos. Maximum 5 photos per project.
                  </p>

                  {isFeaturedFull && (
                    <div className="text-[11px] font-mono text-amber-400 pl-7 pt-1">
                      Limit reached (5/5). Remove or replace an existing featured photo to add more here.
                    </div>
                  )}
                </label>

                {/* Option 2: Gallery Photos */}
                <label
                  className={`relative p-5 rounded-2xl border flex flex-col gap-2 transition-all cursor-pointer ${
                    uploadCategory === "gallery"
                      ? "border-white bg-neutral-900/80 shadow-lg ring-1 ring-white/50"
                      : "border-neutral-800 bg-neutral-900/30 hover:border-neutral-700"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="photoCategory"
                        value="gallery"
                        checked={uploadCategory === "gallery"}
                        onChange={() => setUploadCategory("gallery")}
                        className="w-4 h-4 text-white bg-neutral-900 border-neutral-700 focus:ring-0 cursor-pointer"
                      />
                      <span className="text-sm font-bold text-neutral-100">
                        Gallery Photos
                      </span>
                    </div>

                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-300">
                      Unlimited
                    </span>
                  </div>

                  <p className="text-xs text-neutral-400 font-light pl-7">
                    Complete photography archive and full portfolio collection.
                  </p>
                </label>

              </div>
            </div>

            {/* 3. Title Input */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-mono tracking-wider uppercase text-neutral-400">
                Photo Title / Headline
              </label>
              <input
                type="text"
                value={uploadTitle}
                onChange={(e) => setUploadTitle(e.target.value)}
                placeholder="e.g. Optical Core Reflection"
                className="w-full px-4 py-3 rounded-xl bg-neutral-900/80 border border-neutral-800 text-sm text-neutral-100 placeholder:text-neutral-600 focus:outline-none focus:border-neutral-500 focus:ring-1 focus:ring-neutral-500 transition-all font-mono"
              />
            </div>

            {/* 4. Progress Bar */}
            {isUploading && (
              <div className="flex flex-col gap-2 pt-2">
                <div className="flex items-center justify-between text-xs font-mono text-neutral-400">
                  <span>Uploading to cloud storage...</span>
                  <span className="text-white font-bold">{uploadProgress}%</span>
                </div>
                <div className="w-full h-1.5 bg-neutral-900 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-white transition-all duration-200"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* 5. Submit Button */}
            <div className="flex items-center justify-end gap-4 pt-2">
              <button
                type="submit"
                disabled={isUploading || selectedFiles.length === 0}
                className="py-3 px-8 rounded-xl bg-white text-black font-semibold text-xs tracking-widest uppercase hover:bg-neutral-200 active:scale-[0.99] transition-all disabled:opacity-40 disabled:pointer-events-none flex items-center gap-2 cursor-pointer shadow-lg"
              >
                {isUploading ? (
                  <>
                    <span className="w-3.5 h-3.5 rounded-full border-2 border-neutral-400 border-t-black animate-spin" />
                    <span>Uploading...</span>
                  </>
                ) : (
                  <span>
                    Upload {selectedFiles.length > 1 ? `${selectedFiles.length} Photos` : "Photo"}
                  </span>
                )}
              </button>
            </div>
          </form>
        </section>

      </main>

      {/* Footer */}
      <footer className="max-w-7xl w-full mx-auto pt-8 border-t border-neutral-900 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono text-neutral-600">
        <span>Lumieré // Unified Photo Management Console</span>
        <span>Storage & Firestore Active</span>
      </footer>

      {/* Reusable Delete Modal */}
      <DeleteConfirmModal
        isOpen={!!itemToDelete}
        onClose={() => setItemToDelete(null)}
        onConfirm={handleConfirmDelete}
        title="Delete Photo"
        itemTitle={itemToDelete?.title}
        isDeleting={!!deletingId}
        errorMessage={deleteError}
        confirmText="Delete Permanently"
        cancelText="Cancel"
      />

      {/* Replace Photo Modal */}
      <ReplacePhotoModal
        isOpen={!!itemToReplace}
        item={itemToReplace}
        onClose={() => setItemToReplace(null)}
        onSuccess={(updated) => {
          setWorks((prev) => prev.map((w) => (w.id === updated.id ? updated : w)));
          setActionSuccess(`Photo "${updated.title}" successfully replaced!`);
        }}
        userEmail={adminUser?.email || "admin"}
      />

      {/* Full Preview Modal */}
      <PhotoPreviewModal
        isOpen={!!itemToPreview}
        item={itemToPreview}
        onClose={() => setItemToPreview(null)}
      />

    </div>
  );
}
