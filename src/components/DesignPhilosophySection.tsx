"use client";

export default function DesignPhilosophySection() {
  return (
    <section className="relative w-full bg-black text-white px-6 sm:px-12 md:px-20 lg:px-32 py-14 sm:py-20 z-30 border-y border-neutral-900 flex flex-col items-center justify-center text-center">
      <div className="max-w-5xl mx-auto flex flex-col items-center gap-4 sm:gap-5">
        <span className="text-xs font-mono uppercase tracking-[0.35em] text-neutral-500">
          Design Philosophy
        </span>
        <blockquote className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight text-neutral-200 max-w-4xl leading-snug">
          &ldquo;Behind every decisive frame is an unseen symphony of mechanical and optical perfection.&rdquo;
        </blockquote>
      </div>
    </section>
  );
}
