"use client";

import FeaturedAccordionShowcase from "./FeaturedAccordionShowcase";
import { type WorkItem } from "@/backend";

interface FeaturedShowcaseSectionProps {
  initialWorks?: WorkItem[];
}

export default function FeaturedShowcaseSection({ initialWorks }: FeaturedShowcaseSectionProps) {
  return (
    <section
      id="featured-showcase"
      className="relative w-full bg-black text-white px-4 sm:px-12 md:px-20 lg:px-32 py-16 sm:py-24 md:py-32 z-30 border-t border-neutral-900"
    >
      <div className="max-w-7xl mx-auto flex flex-col gap-10 sm:gap-16">
        
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 max-w-4xl">
          <div className="flex flex-col gap-5">
            <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full border border-neutral-800 bg-neutral-950/80 w-fit backdrop-blur-md">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              <span className="text-[10px] sm:text-xs font-mono tracking-[0.3em] uppercase text-neutral-300 font-medium">
                Featured Photography // 01 — 05
              </span>
            </div>

            <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black uppercase tracking-tight text-neutral-100 leading-[1.05]">
              The Primary Showcase.
            </h2>

            <p className="text-sm sm:text-base md:text-lg text-neutral-400 font-light leading-relaxed max-w-2xl">
              Five decisive frames capturing uncompromising optical craft and cinematic depth. Tap or hover to expand each study.
            </p>
          </div>
        </div>

        {/* The 5-Photo Accordion Gallery Showcase */}
        <div className="w-full">
          <FeaturedAccordionShowcase height={460} initialWorks={initialWorks} />
        </div>

      </div>
    </section>
  );
}
