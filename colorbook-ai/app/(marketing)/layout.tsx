import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { FloatingEmojis } from "@/components/floating-emojis";
import { GradientBackground } from "@/components/gradient-bg";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <GradientBackground />
      <FloatingEmojis />
      <Navbar />
      {children}
      <Footer />
    </>
  );
}
