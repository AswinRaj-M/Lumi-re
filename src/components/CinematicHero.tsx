"use client";

import { useEffect, useRef } from "react";

function clamp(val: number, min: number, max: number): number {
  return Math.min(Math.max(val, min), max);
}

function smoothStep(edge0: number, edge1: number, x: number): number {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

const TOTAL_FRAMES = 124;

export default function CinematicHero() {
  const containerRef = useRef<HTMLDivElement>(null);
  const stickyRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stageWrapperRef = useRef<HTMLDivElement>(null);
  const titleWrapperRef = useRef<HTMLDivElement>(null);
  const scrollIndicatorRef = useRef<HTMLDivElement>(null);

  // Animation and frame tracking refs (zero React re-renders on scroll)
  const imagesRef = useRef<HTMLImageElement[]>([]);
  const isLoadedRef = useRef<boolean[]>([]);
  const targetFrameRef = useRef<number>(0);
  const currentFrameRef = useRef<number>(0);
  const lastRenderedFrameRef = useRef<number>(-1);
  const progressRef = useRef<number>(0);
  const animationFrameRef = useRef<number | null>(null);

  // Cached layout measurements
  const measurementsRef = useRef({
    top: 0,
    height: 0,
    viewport: 0,
    maxScroll: 0,
  });

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    // Cache layout measurements
    const updateMeasurements = () => {
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const scrollTop = window.scrollY;
      const top = rect.top + scrollTop;
      const height = container.offsetHeight;
      const viewport = window.innerHeight;
      const maxScroll = Math.max(1, height - viewport);

      measurementsRef.current = {
        top,
        height,
        viewport,
        maxScroll,
      };
    };

    updateMeasurements();

    // Render frame to canvas with high DPI and zero latency
    const drawFrame = (frameIndex: number) => {
      const cvs = canvasRef.current;
      if (!cvs) return;
      const ctx = cvs.getContext("2d", { alpha: true });
      if (!ctx) return;

      const idx = clamp(frameIndex, 0, TOTAL_FRAMES - 1);
      const img = imagesRef.current[idx];

      // Draw if image is loaded; if not yet loaded, find nearest loaded frame
      let renderImg: HTMLImageElement | null = null;
      if (img && img.complete && img.naturalWidth > 0) {
        renderImg = img;
      } else {
        // Search nearest loaded frame
        for (let offset = 1; offset < TOTAL_FRAMES; offset++) {
          const prev = idx - offset;
          const next = idx + offset;
          if (prev >= 0 && imagesRef.current[prev]?.complete && imagesRef.current[prev].naturalWidth > 0) {
            renderImg = imagesRef.current[prev];
            break;
          }
          if (next < TOTAL_FRAMES && imagesRef.current[next]?.complete && imagesRef.current[next].naturalWidth > 0) {
            renderImg = imagesRef.current[next];
            break;
          }
        }
      }

      if (!renderImg) return;

      // Adjust canvas internal dimensions to match source resolution (1920x814)
      if (cvs.width !== renderImg.naturalWidth || cvs.height !== renderImg.naturalHeight) {
        cvs.width = renderImg.naturalWidth;
        cvs.height = renderImg.naturalHeight;
      }

      ctx.clearRect(0, 0, cvs.width, cvs.height);
      ctx.drawImage(renderImg, 0, 0, cvs.width, cvs.height);
    };

    // Preload all 124 WebP frames
    const images: HTMLImageElement[] = [];
    const loadedFlags: boolean[] = new Array(TOTAL_FRAMES).fill(false);

    for (let i = 0; i < TOTAL_FRAMES; i++) {
      const img = new Image();
      const num = String(i + 1).padStart(3, "0");
      img.src = `/frames/frame_${num}.webp`;
      img.onload = () => {
        loadedFlags[i] = true;
        // Paint initial frame as soon as frame 1 arrives
        if (i === 0 && lastRenderedFrameRef.current === -1) {
          drawFrame(0);
          lastRenderedFrameRef.current = 0;
        }
      };
      images.push(img);
    }

    imagesRef.current = images;
    isLoadedRef.current = loadedFlags;

    // Passive scroll handler: updates target frames, no DOM queries
    const handleScroll = () => {
      const { top, maxScroll } = measurementsRef.current;
      const currentScroll = window.scrollY - top;
      const progress = clamp(currentScroll / maxScroll, 0, 1);
      progressRef.current = progress;

      // Map scrubbing across 0% -> 75% of scroll runway for deliberate pacing
      const videoProgress = clamp(progress / 0.75, 0, 1);
      targetFrameRef.current = videoProgress * (TOTAL_FRAMES - 1);
    };

    // 60-120fps hardware-accelerated RAF animation loop
    const animate = () => {
      const p = progressRef.current;

      // 1. Smoothly interpolate current frame toward target frame
      const target = targetFrameRef.current;
      currentFrameRef.current += (target - currentFrameRef.current) * 0.28;

      const roundedFrame = Math.round(currentFrameRef.current);
      if (roundedFrame !== lastRenderedFrameRef.current) {
        drawFrame(roundedFrame);
        lastRenderedFrameRef.current = roundedFrame;
      }

      // 2. Camera End Fade-out (Between 68% and 78% scroll progress)
      if (stageWrapperRef.current) {
        const fadeProgress = smoothStep(0.68, 0.78, p);
        const opacity = 1 - fadeProgress;
        const scale = 1 - fadeProgress * 0.05;
        stageWrapperRef.current.style.opacity = opacity.toFixed(3);
        stageWrapperRef.current.style.transform = `scale3d(${scale.toFixed(4)}, ${scale.toFixed(4)}, 1)`;
        stageWrapperRef.current.style.visibility = opacity <= 0.001 ? "hidden" : "visible";
      }

      // 3. Website Title & Showcase Reveal: Lumieré (Between 76% and 88%)
      if (titleWrapperRef.current) {
        const titleProgress = smoothStep(0.76, 0.88, p);
        const opacity = titleProgress;
        const scale = 0.96 + titleProgress * 0.04;
        const translateY = (1 - titleProgress) * 20;
        titleWrapperRef.current.style.opacity = opacity.toFixed(3);
        titleWrapperRef.current.style.transform = `translate3d(0, ${translateY.toFixed(2)}px, 0) scale3d(${scale.toFixed(4)}, ${scale.toFixed(4)}, 1)`;
        titleWrapperRef.current.style.visibility = opacity <= 0.001 ? "hidden" : "visible";
        titleWrapperRef.current.style.pointerEvents = titleProgress > 0.65 ? "auto" : "none";
      }

      // 4. Initial Scroll hint cue fades out on initial scroll
      if (scrollIndicatorRef.current) {
        const hintOpacity = clamp(1 - p * 15, 0, 1);
        scrollIndicatorRef.current.style.opacity = hintOpacity.toFixed(2);
        scrollIndicatorRef.current.style.visibility = hintOpacity <= 0.001 ? "hidden" : "visible";
      }

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", updateMeasurements);
    window.addEventListener("orientationchange", updateMeasurements);

    handleScroll();

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", updateMeasurements);
      window.removeEventListener("orientationchange", updateMeasurements);
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, []);

  return (
    <section
      ref={containerRef}
      className="hero-scroll-container"
      style={{ height: "700vh" }}
    >
      <div ref={stickyRef} className="hero-sticky flex items-center justify-center">
        {/* Padded Video Stage: Generous breathing room, seamless black canvas */}
        <div
          ref={stageWrapperRef}
          className="relative w-full h-full flex items-center justify-center p-6 sm:p-10 md:p-14 lg:p-20 pointer-events-none will-change-[transform,opacity]"
        >
          <div className="relative w-full h-full max-w-5xl max-h-[75vh] flex items-center justify-center">
            <canvas
              ref={canvasRef}
              className="w-full h-full object-contain pointer-events-none select-none"
              style={{
                width: "100%",
                height: "100%",
                objectFit: "contain",
                filter: "contrast(1.12) brightness(0.96)",
              }}
            />
          </div>
        </div>

        {/* Website Title Stage: Lumieré (Reveals seamlessly after video fade away) */}
        <div
          ref={titleWrapperRef}
          className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center will-change-[transform,opacity] select-none"
          style={{ opacity: 0, visibility: "hidden", pointerEvents: "none" }}
        >
          {/* Subtle cinematic radial glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[340px] sm:w-[560px] md:w-[780px] h-[340px] sm:h-[480px] bg-gradient-to-r from-neutral-800/30 via-white/10 to-neutral-800/30 rounded-full blur-[140px] pointer-events-none" />

          <div className="relative flex flex-col items-center gap-6 sm:gap-8 max-w-4xl z-10">
            {/* Category / Heritage Pill */}
            <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full border border-neutral-800/90 bg-neutral-950/80 backdrop-blur-md shadow-lg">
              <span className="w-1.5 h-1.5 rounded-full bg-neutral-400 animate-pulse" />
              <span className="text-[10px] sm:text-xs font-mono tracking-[0.35em] uppercase text-neutral-300 font-medium">
                The Art of Vision
              </span>
            </div>

            {/* Primary Website Title: Lumieré */}
            <h1 className="text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-black uppercase tracking-[0.18em] sm:tracking-[0.22em] md:tracking-[0.28em] text-transparent bg-clip-text bg-gradient-to-b from-white via-neutral-100 to-neutral-500 drop-shadow-[0_15px_45px_rgba(255,255,255,0.15)] pl-[0.18em] sm:pl-[0.22em] md:pl-[0.28em] leading-[1.05]">
              Lumieré
            </h1>

            {/* Tagline & Decorative Divider */}
            <div className="flex flex-col items-center gap-3">
              <p className="text-xs sm:text-sm md:text-base font-light tracking-[0.25em] uppercase text-neutral-400 max-w-xl text-center">
                Unveiling the unseen symphony of optical craft
              </p>
              <div className="w-20 h-[1px] bg-gradient-to-r from-transparent via-neutral-600 to-transparent mt-1" />
            </div>

            {/* Downward Exploration Prompt */}
            <div className="flex flex-col items-center gap-2 pt-6 opacity-75">
              <span className="text-[10px] font-mono tracking-[0.3em] uppercase text-neutral-500">
                Scroll to explore architecture
              </span>
              <div className="w-[1px] h-6 bg-gradient-to-b from-neutral-500 to-transparent animate-pulse" />
            </div>
          </div>
        </div>

        {/* Minimal Scroll Cue */}
        <div
          ref={scrollIndicatorRef}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-2 pointer-events-none select-none transition-opacity duration-300"
        >
          <span className="text-[10px] sm:text-[11px] font-medium tracking-[0.25em] text-neutral-400 uppercase">
            Scroll to explore
          </span>
          <div className="w-[1px] h-6 bg-gradient-to-b from-neutral-400 to-transparent" />
        </div>
      </div>
    </section>
  );
}
