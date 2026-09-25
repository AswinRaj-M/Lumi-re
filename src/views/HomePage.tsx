import CinematicHero from "@/components/CinematicHero";
import FeaturedShowcaseSection from "@/components/FeaturedShowcaseSection";
import DesignPhilosophySection from "@/components/DesignPhilosophySection";
import FullGallerySection from "@/components/FullGallerySection";
import StorySection from "@/components/StorySection";
import { getLocalWorksServer } from "@/backend/localWorks";

export default function HomePage() {
  const featuredWorks = getLocalWorksServer("featured");
  const galleryWorks = getLocalWorksServer("gallery");

  return (
    <main className="min-h-screen bg-black text-white selection:bg-white selection:text-black">
      <CinematicHero />
      <FeaturedShowcaseSection initialWorks={featuredWorks} />
      <DesignPhilosophySection />
      <FullGallerySection initialWorks={galleryWorks} />
      <StorySection />
    </main>
  );
}

