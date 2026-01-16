import type { ReactNode } from "react";
import { MarketingNav } from "@/components/marketing-nav";
import { MarketingFooter } from "@/components/marketing-footer";

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <MarketingNav />
      <main>{children}</main>
      <MarketingFooter />
    </div>
  );
}

