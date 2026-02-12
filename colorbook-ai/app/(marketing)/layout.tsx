import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { GradientBackground } from "@/components/gradient-bg";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <GradientBackground />
      <Navbar />
      {children}
      <Footer />
    </>
  );
}
