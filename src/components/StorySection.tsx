export default function StorySection() {
  const specs = [
    {
      index: "01",
      title: "Full-Frame Optical Core",
      detail: "Back-illuminated architecture capturing uncompromising dynamic range with cinematic depth of field across extreme lighting environments.",
      tag: "61.4 MP / 15+ STOPS DR",
    },
    {
      index: "02",
      title: "Electromagnetic Shutter",
      detail: "High-precision carbon-composite curtain mechanism engineered for over 500,000 continuous actuations with zero focal-plane distortion.",
      tag: "1/8000s / 10 FPS",
    },
    {
      index: "03",
      title: "Magnesium Alloy Chassis",
      detail: "Monocoque aerospace-grade frame calibrated to sub-micron tolerances, providing structural rigidity while dissipating mechanical resonance.",
      tag: "0.002mm TOLERANCE",
    },
    {
      index: "04",
      title: "Passive Thermal Architecture",
      detail: "Pure graphite conduction pathway dissipating sensor and processor thermal energy continuously during uncompressed 4K capture.",
      tag: "GRAPHITE CORE / ZERO NOISE",
    },
  ];

  return (
    <section id="architecture" className="relative w-full bg-black text-white px-6 sm:px-12 md:px-20 lg:px-32 py-32 sm:py-40 z-30">
      <div className="max-w-7xl mx-auto flex flex-col gap-24 sm:gap-32">
        
        {/* Section Intro */}
        <div className="flex flex-col gap-6 max-w-3xl">
          <div className="inline-flex items-center gap-3">
            <span className="w-2 h-2 rounded-full bg-neutral-400" />
            <span className="text-xs font-semibold tracking-[0.3em] uppercase text-neutral-400">
              The Architecture of Vision
            </span>
          </div>

          <h2 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black uppercase tracking-tight text-neutral-100 leading-[1.05]">
            Engineered from the inside out.
          </h2>

          <p className="text-base sm:text-lg md:text-xl text-neutral-400 font-light leading-relaxed max-w-2xl pt-2">
            Every prism, sensor, and optical mount is calibrated with micrometer
            precision. An intimate deconstruction of modern camera craftsmanship.
          </p>
        </div>

        {/* Specifications Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
          {specs.map((item) => (
            <div
              key={item.index}
              className="group relative flex flex-col justify-between p-8 sm:p-10 rounded-2xl bg-neutral-950/80 border border-neutral-900 transition-all duration-300 hover:border-neutral-700"
            >
              <div className="flex flex-col gap-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-neutral-500 tracking-wider">
                    {item.index}
                  </span>
                  <span className="text-[11px] font-mono tracking-widest uppercase text-neutral-400 border border-neutral-800 rounded-full px-3 py-1">
                    {item.tag}
                  </span>
                </div>

                <h3 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-100">
                  {item.title}
                </h3>

                <p className="text-sm sm:text-base text-neutral-400 font-light leading-relaxed">
                  {item.detail}
                </p>
              </div>

              <div className="pt-8 mt-8 border-t border-neutral-900/60 flex items-center justify-between text-xs font-mono text-neutral-600 group-hover:text-neutral-400 transition-colors">
                <span>SPECIFICATION</span>
                <span>CALIBRATED</span>
              </div>
            </div>
          ))}
        </div>


        {/* Minimal Editorial Footer */}
        <footer className="flex flex-col sm:flex-row items-center justify-between gap-6 pt-6 text-xs text-neutral-500 tracking-wider">
          <span className="font-semibold uppercase tracking-[0.2em] text-neutral-400">
            Lumieré
          </span>
          <span>&copy; 2026. All rights reserved.</span>
        </footer>

      </div>
    </section>
  );
}
