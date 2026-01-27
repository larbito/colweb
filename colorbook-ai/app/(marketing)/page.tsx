import { GradientBackground } from "@/components/gradient-bg";
import { HeroBento } from "@/components/hero-bento";
import { BuiltForStrip } from "@/components/built-for-strip";
import { FeatureBento } from "@/components/feature-bento";
import { StyleCloneSection } from "@/components/style-clone-section";
import { HowItWorks } from "@/components/how-it-works";
import { Testimonials } from "@/components/testimonials";
import { Pricing } from "@/components/pricing";
import { FAQ } from "@/components/faq";
import { FinalCTA } from "@/components/final-cta";

export default function HomePage() {
  return (
    <main className="relative">
      <GradientBackground />
      <HeroBento />
      <BuiltForStrip />
      <FeatureBento />
      <StyleCloneSection />
      <HowItWorks />
      <Testimonials />
      <Pricing />
      <FAQ />
      <FinalCTA />
    </main>
  );
}
