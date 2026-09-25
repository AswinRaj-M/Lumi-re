"use client";

import { useEffect, useState } from "react";
import DriftWall, { DriftWallItem } from "./DriftWall";
import PhotoLightboxModal from "./PhotoLightboxModal";
import { type WorkItem, isWorkDeleted } from "@/backend";

const REAL_GALLERY_PHOTOS: DriftWallItem[] = [
  { image: "/uploads/works/1790259461080_Stark_man.jpg", title: "Stark man" },
  { image: "/uploads/works/1790259460853_music_icon.webp", title: "Music Icon" },
  { image: "/uploads/works/1790259460251_Hinokami_kagura.jpg", title: "Hinokami kagura" },
  { image: "/uploads/works/1790259460106_download.jpg", title: "Cinematic Core" },
  { image: "/uploads/works/1790259459606_ChatGPT_Image_Sep_20__2026__03_21_03_PM.png", title: "ChatGPT Image" },
  { image: "/uploads/works/1790259459194_Aswin_.jpeg", title: "Aswin" },
  { image: "/uploads/works/1790259458501_Aegon_6_targarion.png", title: "Aegon 6 targarion" },
  { image: "/uploads/works/1790259356381_wp11822209.jpg", title: "Chassis Frame" },
  { image: "/uploads/works/1790259355964_strange.jpeg", title: "Strange" },
  { image: "/uploads/works/1790259355338_pexels-photo-14189663.webp", title: "Decisive Exposure" },
  { image: "/uploads/works/1790259354984_images.jpeg", title: "Optical Core" },
  { image: "/uploads/works/1790259354483_download.jpeg", title: "Mechanical Shutter" },
  { image: "/uploads/works/1790259353713_bmw-m2-m-performance-parts-2023-5k-8k-3440x1440-8990.jpg", title: "BMW M2" },
  { image: "/uploads/works/1790259353004_a4a37761b7a1d24fe49144a011a9ce1d.jpg", title: "Curtain Study" },
];

interface GalleryDriftWallProps {
  initialWorks?: WorkItem[];
}

export default function GalleryDriftWall({ initialWorks }: GalleryDriftWallProps = {}) {
  const initialItems: DriftWallItem[] =
    initialWorks && initialWorks.length > 0
      ? initialWorks
          .filter((w) => !isWorkDeleted(w.id))
          .map((w) => ({
            image: w.imageUrl,
            title: w.title,
          }))
      : REAL_GALLERY_PHOTOS.filter((p) => !isWorkDeleted(p.image));

  const [items, setItems] = useState<DriftWallItem[]>(initialItems);
  const [selectedPhoto, setSelectedPhoto] = useState<DriftWallItem | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);

  useEffect(() => {
    let isMounted = true;

    async function loadGalleryPhotos() {
      try {
        const res = await fetch("/api/works?category=gallery");
        const data = await res.json();
        if (data.success && Array.isArray(data.works)) {
          const galleryWorks = data.works.filter(
            (w: WorkItem) => w.category === "gallery" && !isWorkDeleted(w.id)
          );

          if (isMounted) {
            const mapped: DriftWallItem[] = galleryWorks.map((w: WorkItem) => ({
              image: w.imageUrl,
              title: w.title,
            }));
            setItems(mapped);
          }
        }
      } catch (err) {
        console.warn("Could not load gallery photos for DriftWall:", err);
      }
    }

    loadGalleryPhotos();

    // Poll periodically to catch newly uploaded gallery photos from admin
    const interval = setInterval(loadGalleryPhotos, 5000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const handlePhotoClick = (item: DriftWallItem) => {
    const idx = items.findIndex((p) => p.image === item.image);
    setSelectedPhoto(item);
    setSelectedIndex(idx >= 0 ? idx : 0);
  };

  const handleClose = () => {
    setSelectedPhoto(null);
    setSelectedIndex(-1);
  };

  const handleNavigate = (idx: number) => {
    if (items[idx]) {
      setSelectedPhoto(items[idx]);
      setSelectedIndex(idx);
    }
  };

  return (
    <>
      <div className="relative w-full h-[720px] sm:h-[820px] md:h-[900px] lg:h-[960px] overflow-hidden bg-black select-none">
        {/* Soft luminous ambient backlight */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.07),transparent_70%)] pointer-events-none z-[1]" />

        {/* --- 4-SIDE SOFT GENTLE BLEND GRADIENTS --- */}
        {/* Top edge soft fade */}
        <div className="absolute top-0 inset-x-0 h-20 sm:h-28 bg-gradient-to-b from-black via-black/45 to-transparent pointer-events-none z-[5]" />

        {/* Bottom edge soft fade */}
        <div className="absolute bottom-0 inset-x-0 h-20 sm:h-28 bg-gradient-to-t from-black via-black/45 to-transparent pointer-events-none z-[5]" />

        {/* Left edge gentle fade */}
        <div className="absolute left-0 inset-y-0 w-14 sm:w-24 md:w-32 bg-gradient-to-r from-black/75 via-black/25 to-transparent pointer-events-none z-[5]" />

        {/* Right edge gentle fade */}
        <div className="absolute right-0 inset-y-0 w-14 sm:w-24 md:w-32 bg-gradient-to-l from-black/75 via-black/25 to-transparent pointer-events-none z-[5]" />

        {/* --- SOFT CORNER SHADOWS --- */}
        {/* Top-Left Corner Shadow */}
        <div className="absolute top-0 left-0 w-36 sm:w-56 h-36 sm:h-56 bg-[radial-gradient(circle_at_top_left,rgba(0,0,0,0.55)_0%,rgba(0,0,0,0.2)_50%,transparent_80%)] pointer-events-none z-[6]" />

        {/* Top-Right Corner Shadow */}
        <div className="absolute top-0 right-0 w-36 sm:w-56 h-36 sm:h-56 bg-[radial-gradient(circle_at_top_right,rgba(0,0,0,0.55)_0%,rgba(0,0,0,0.2)_50%,transparent_80%)] pointer-events-none z-[6]" />

        {/* Bottom-Left Corner Shadow */}
        <div className="absolute bottom-0 left-0 w-36 sm:w-56 h-36 sm:h-56 bg-[radial-gradient(circle_at_bottom_left,rgba(0,0,0,0.55)_0%,rgba(0,0,0,0.2)_50%,transparent_80%)] pointer-events-none z-[6]" />

        {/* Bottom-Right Corner Shadow */}
        <div className="absolute bottom-0 right-0 w-36 sm:w-56 h-36 sm:h-56 bg-[radial-gradient(circle_at_bottom_right,rgba(0,0,0,0.55)_0%,rgba(0,0,0,0.2)_50%,transparent_80%)] pointer-events-none z-[6]" />

        {/* Subtle perimeter vignette (keeps center completely bright and clear) */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_65%,rgba(0,0,0,0.18)_85%,rgba(0,0,0,0.45)_100%)] pointer-events-none z-[4]" />

        <DriftWall
          items={items}
          columns={Math.min(6, Math.max(3, items.length))}
          tileWidth={220}
          tileHeight={145}
          gap={20}
          tilt={14}
          turn={-12}
          perspective={1300}
          depth={130}
          speed={38}
          direction="up"
          variance={0.45}
          parallax={0.65}
          lift={70}
          fade={0}
          dim={0.98}
          overlayColor="transparent"
          radius={14}
          roll={0}
          pauseOnHover={false}
          grayscale={false}
          onItemClick={handlePhotoClick}
        />
      </div>

      {/* Full-Screen Focused Photo Lightbox Modal */}
      <PhotoLightboxModal
        isOpen={!!selectedPhoto}
        photo={selectedPhoto}
        photos={items}
        currentIndex={selectedIndex}
        categoryLabel="The Infinite Drift // Photographic Archive"
        onClose={handleClose}
        onNavigate={handleNavigate}
      />
    </>
  );
}
