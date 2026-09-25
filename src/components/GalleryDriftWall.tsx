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
  const [windowWidth, setWindowWidth] = useState<number>(1200);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const isMobile = windowWidth < 640;
  const isTablet = windowWidth >= 640 && windowWidth < 1024;

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
      <div className="relative w-full h-[350px] sm:h-[480px] md:h-[720px] lg:h-[960px] overflow-hidden bg-black select-none">
        {/* Soft luminous ambient backlight */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.07),transparent_70%)] pointer-events-none z-[1]" />

        {/* --- 4-SIDE SOFT GENTLE BLEND GRADIENTS --- */}
        {/* Top edge soft fade */}
        <div className="absolute top-0 inset-x-0 h-12 sm:h-20 md:h-28 bg-gradient-to-b from-black via-black/45 to-transparent pointer-events-none z-[5]" />

        {/* Bottom edge soft fade */}
        <div className="absolute bottom-0 inset-x-0 h-12 sm:h-20 md:h-28 bg-gradient-to-t from-black via-black/45 to-transparent pointer-events-none z-[5]" />

        {/* Left edge gentle fade */}
        <div className="absolute left-0 inset-y-0 w-8 sm:w-16 md:w-32 bg-gradient-to-r from-black/75 via-black/25 to-transparent pointer-events-none z-[5]" />

        {/* Right edge gentle fade */}
        <div className="absolute right-0 inset-y-0 w-8 sm:w-16 md:w-32 bg-gradient-to-l from-black/75 via-black/25 to-transparent pointer-events-none z-[5]" />

        {/* --- SOFT CORNER SHADOWS --- */}
        {/* Top-Left Corner Shadow */}
        <div className="absolute top-0 left-0 w-24 sm:w-36 md:w-56 h-24 sm:h-36 md:h-56 bg-[radial-gradient(circle_at_top_left,rgba(0,0,0,0.55)_0%,rgba(0,0,0,0.2)_50%,transparent_80%)] pointer-events-none z-[6]" />

        {/* Top-Right Corner Shadow */}
        <div className="absolute top-0 right-0 w-24 sm:w-36 md:w-56 h-24 sm:h-36 md:h-56 bg-[radial-gradient(circle_at_top_right,rgba(0,0,0,0.55)_0%,rgba(0,0,0,0.2)_50%,transparent_80%)] pointer-events-none z-[6]" />

        {/* Bottom-Left Corner Shadow */}
        <div className="absolute bottom-0 left-0 w-24 sm:w-36 md:w-56 h-24 sm:h-36 md:h-56 bg-[radial-gradient(circle_at_bottom_left,rgba(0,0,0,0.55)_0%,rgba(0,0,0,0.2)_50%,transparent_80%)] pointer-events-none z-[6]" />

        {/* Bottom-Right Corner Shadow */}
        <div className="absolute bottom-0 right-0 w-24 sm:w-36 md:w-56 h-24 sm:h-36 md:h-56 bg-[radial-gradient(circle_at_bottom_right,rgba(0,0,0,0.55)_0%,rgba(0,0,0,0.2)_50%,transparent_80%)] pointer-events-none z-[6]" />

        {/* Subtle perimeter vignette (keeps center completely bright and clear) */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_65%,rgba(0,0,0,0.18)_85%,rgba(0,0,0,0.45)_100%)] pointer-events-none z-[4]" />

        <DriftWall
          items={items}
          columns={isMobile ? 3 : isTablet ? 4 : Math.min(6, Math.max(3, items.length))}
          tileWidth={isMobile ? 115 : isTablet ? 160 : 220}
          tileHeight={isMobile ? 80 : isTablet ? 105 : 145}
          gap={isMobile ? 10 : isTablet ? 14 : 20}
          tilt={isMobile ? 9 : isTablet ? 12 : 14}
          turn={isMobile ? -8 : isTablet ? -10 : -12}
          perspective={isMobile ? 900 : isTablet ? 1100 : 1300}
          depth={isMobile ? 65 : isTablet ? 95 : 130}
          speed={isMobile ? 24 : isTablet ? 30 : 38}
          direction="up"
          variance={0.45}
          parallax={isMobile ? 0.35 : 0.65}
          lift={isMobile ? 28 : 70}
          fade={0}
          dim={0.98}
          overlayColor="transparent"
          radius={isMobile ? 10 : 14}
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
