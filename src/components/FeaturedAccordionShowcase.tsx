"use client";

import { useEffect, useState } from "react";
import AccordionGallery, { AccordionGalleryItem } from "./AccordionGallery";
import PhotoLightboxModal from "./PhotoLightboxModal";
import { type WorkItem, isWorkDeleted } from "@/backend";

const REAL_FEATURED_PHOTOS: AccordionGalleryItem[] = [
  { image: "/uploads/works/1790258171376_Aegon_6_targarion.png", label: "Aegon 6 targarion", link: "#", alt: "Aegon 6 targarion" },
  { image: "/uploads/works/1790258191655_Aswin_.jpeg", label: "Aswin", link: "#", alt: "Aswin" },
  { image: "/uploads/works/1790258224614_Gemini_Generated_Image_huxzx4huxzx4huxz.png", label: "BMW M4 CS", link: "#", alt: "BMW M4 CS" },
  { image: "/uploads/works/1790258244951_Stark_man.jpg", label: "Stark man", link: "#", alt: "Stark man" },
];

interface FeaturedAccordionShowcaseProps {
  className?: string;
  height?: number;
  initialWorks?: WorkItem[];
}

export default function FeaturedAccordionShowcase({
  className = "",
  height = 420,
  initialWorks,
}: FeaturedAccordionShowcaseProps) {
  const initialItems: AccordionGalleryItem[] =
    initialWorks && initialWorks.length > 0
      ? initialWorks
          .filter((w) => !isWorkDeleted(w.id))
          .slice(0, 5)
          .map((w) => ({
            image: w.imageUrl,
            label: w.title,
            link: "#",
            alt: w.title,
          }))
      : REAL_FEATURED_PHOTOS.filter((p) => !isWorkDeleted(p.image));

  const [items, setItems] = useState<AccordionGalleryItem[]>(initialItems);
  const [isLoaded, setIsLoaded] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<AccordionGalleryItem | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(typeof window !== "undefined" && window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadFeaturedPhotos() {
      try {
        const res = await fetch("/api/works?category=featured");
        const data = await res.json();
        if (data.success && Array.isArray(data.works)) {
          // Strictly sort by displayOrder (1..5) and exclude deleted items
          const sorted = [...data.works]
            .filter((w: WorkItem) => w.category === "featured" && !isWorkDeleted(w.id))
            .sort((a: WorkItem, b: WorkItem) => (a.displayOrder ?? 99) - (b.displayOrder ?? 99))
            .slice(0, 5);

          if (isMounted) {
            const mapped: AccordionGalleryItem[] = sorted.map((w: WorkItem) => ({
              image: w.imageUrl,
              label: w.title,
              link: "#",
              alt: w.title,
            }));
            setItems(mapped);
          }
        }
      } catch (err) {
        console.warn("Could not load featured works for showcase, using default showcase:", err);
      } finally {
        if (isMounted) setIsLoaded(true);
      }
    }

    loadFeaturedPhotos();

    // Re-check periodically or on focus to catch admin updates
    const interval = setInterval(loadFeaturedPhotos, 6000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const handlePhotoClick = (item: AccordionGalleryItem, index: number) => {
    // On mobile screens (< 768px), tapping expands the picture in the accordion
    // (the same action as hovering on desktop) without opening the lightbox preview
    if (isMobile || (typeof window !== "undefined" && window.innerWidth < 768)) {
      return;
    }
    setSelectedPhoto(item);
    setSelectedIndex(index);
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
      <div className={`w-full ${className}`}>
        <AccordionGallery
          items={items}
          defaultIndex={Math.min(2, Math.max(0, items.length - 1))}
          expandRatio={isMobile ? 0.58 : 0.52}
          trigger={isMobile ? "click" : "hover"}
          accentColor="#ffffff"
          overlayColor="#060010"
          textColor="#ffffff"
          grayscale
          showLabels
          duration={0.6}
          ease="power3.out"
          parallax={isMobile ? 0.3 : 0.5}
          tilt={isMobile ? 4 : 8}
          stagger={0.06}
          height={isMobile ? 330 : height}
          gap={isMobile ? 6 : 10}
          radius={isMobile ? 12 : 16}
          orientation="horizontal"
          onItemClick={handlePhotoClick}
        />
      </div>

      {/* Full-Screen Lightbox Modal bringing clicked photo to the front of the screen */}
      <PhotoLightboxModal
        isOpen={!!selectedPhoto}
        photo={
          selectedPhoto
            ? {
                image: selectedPhoto.image,
                title: selectedPhoto.label || selectedPhoto.alt || "Featured Frame",
              }
            : null
        }
        photos={items.map((it) => ({
          image: it.image,
          title: it.label || it.alt || "Featured Frame",
        }))}
        currentIndex={selectedIndex}
        categoryLabel="The Primary Showcase // Curated Frame"
        onClose={handleClose}
        onNavigate={handleNavigate}
      />
    </>
  );
}

