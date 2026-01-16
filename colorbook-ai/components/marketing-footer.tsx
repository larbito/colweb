import Link from "next/link";
import { BookOpen } from "lucide-react";
import { Separator } from "@/components/ui/separator";

export function MarketingFooter() {
  return (
    <footer className="border-t border-border bg-card/30">
      <div className="container py-16">
        <div className="grid gap-12 md:grid-cols-4">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-2xl border border-border bg-gradient-to-br from-primary/20 to-primary/5">
                <BookOpen className="h-4 w-4 text-primary" />
              </div>
              <span className="font-semibold">ColorBook AI</span>
            </div>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Generate KDP-ready coloring books with story prompts and print-safe line art.
            </p>
          </div>
          
          <div className="space-y-3">
            <p className="text-sm font-semibold">Product</p>
            <ul className="space-y-2.5 text-sm text-muted-foreground">
              <li>
                <Link href="#features" className="transition hover:text-foreground">
                  Features
                </Link>
              </li>
              <li>
                <Link href="/pricing" className="transition hover:text-foreground">
                  Pricing
                </Link>
              </li>
              <li>
                <Link href="/faq" className="transition hover:text-foreground">
                  FAQ
                </Link>
              </li>
              <li>
                <Link href="/app" className="transition hover:text-foreground">
                  Dashboard
                </Link>
              </li>
            </ul>
          </div>
          
          <div className="space-y-3">
            <p className="text-sm font-semibold">Company</p>
            <ul className="space-y-2.5 text-sm text-muted-foreground">
              <li>
                <Link href="#" className="transition hover:text-foreground">
                  About
                </Link>
              </li>
              <li>
                <Link href="#" className="transition hover:text-foreground">
                  Blog
                </Link>
              </li>
              <li>
                <Link href="#" className="transition hover:text-foreground">
                  Contact
                </Link>
              </li>
            </ul>
          </div>
          
          <div className="space-y-3">
            <p className="text-sm font-semibold">Legal</p>
            <ul className="space-y-2.5 text-sm text-muted-foreground">
              <li>
                <Link href="/terms" className="transition hover:text-foreground">
                  Terms
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="transition hover:text-foreground">
                  Privacy
                </Link>
              </li>
            </ul>
          </div>
        </div>
        
        <Separator className="my-10" />
        
        <div className="flex flex-col items-center justify-between gap-4 text-sm text-muted-foreground md:flex-row">
          <p>© {new Date().getFullYear()} ColorBook AI. All rights reserved.</p>
          <p className="text-xs">Built for KDP creators, teachers, and parents.</p>
        </div>
      </div>
    </footer>
  );
}

