"use client";

import GalleryDriftWall from "./GalleryDriftWall";
import { type WorkItem } from "@/backend";

interface FullGallerySectionProps {
  initialWorks?: WorkItem[];
}

export default function FullGallerySection({ initialWorks }: FullGallerySectionProps) {
  return (
    <section
      id="full-gallery"
      className="relative w-full bg-black text-white pt-24 sm:pt-32 pb-20 sm:pb-28 z-30 overflow-hidden"
    >
      <div className="w-full flex flex-col gap-10 sm:gap-14">
        
        {/* Section Header */}
        <div className="max-w-7xl mx-auto w-full px-6 sm:px-12 md:px-20 lg:px-32 flex flex-col gap-5">
          <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full border border-neutral-800 bg-neutral-950/80 w-fit backdrop-blur-md">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
            <span className="text-[10px] sm:text-xs font-mono tracking-[0.3em] uppercase text-neutral-300 font-medium">
              Gallery Archive // Complete Collection
            </span>
          </div>

          <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black uppercase tracking-tight text-neutral-100 leading-[1.05]">
            The Infinite Drift.
          </h2>

          <p className="text-sm sm:text-base md:text-lg text-neutral-400 font-light leading-relaxed max-w-2xl">
            An expansive 3D perspective wall exhibiting the full photographer archive. Move your cursor across the field to tilt the plane, and click any frame to bring it to the front.
          </p>
        </div>

        {/* 3D DriftWall Gallery - Expands across all 4 sides with seamless website blending */}
        <div className="w-full">
          <GalleryDriftWall initialWorks={initialWorks} />
        </div>

      </div>
    </section>
  );
}

