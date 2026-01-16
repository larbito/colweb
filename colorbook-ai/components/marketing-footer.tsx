import Link from "next/link";
import { Separator } from "@/components/ui/separator";

export function MarketingFooter() {
  return (
    <footer className="border-t border-border bg-background">
      <div className="container py-12">
        <div className="grid gap-8 md:grid-cols-4">
          <div className="space-y-2">
            <p className="text-sm font-semibold">ColorBook AI</p>
            <p className="text-sm text-muted-foreground">
              Build KDP-ready coloring books with story prompts and print-safe line art.
            </p>
          </div>
          <div className="space-y-2 text-sm">
            <p className="font-semibold">Product</p>
            <ul className="space-y-2 text-muted-foreground">
              <li>
                <Link href="/pricing" className="hover:text-foreground">
                  Pricing
                </Link>
              </li>
              <li>
                <Link href="/faq" className="hover:text-foreground">
                  FAQ
                </Link>
              </li>
              <li>
                <Link href="/app" className="hover:text-foreground">
                  Dashboard
                </Link>
              </li>
            </ul>
          </div>
          <div className="space-y-2 text-sm">
            <p className="font-semibold">Company</p>
            <ul className="space-y-2 text-muted-foreground">
              <li>
                <Link href="/pricing" className="hover:text-foreground">
                  Roadmap
                </Link>
              </li>
              <li>
                <Link href="/faq" className="hover:text-foreground">
                  Support
                </Link>
              </li>
              <li>
                <Link href="/app" className="hover:text-foreground">
                  Contact
                </Link>
              </li>
            </ul>
          </div>
          <div className="space-y-2 text-sm">
            <p className="font-semibold">Legal</p>
            <ul className="space-y-2 text-muted-foreground">
              <li>
                <Link href="/terms" className="hover:text-foreground">
                  Terms
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="hover:text-foreground">
                  Privacy
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <Separator className="my-8" />
        <p className="text-xs text-muted-foreground">
          © {new Date().getFullYear()} ColorBook AI. All rights reserved.
        </p>
      </div>
    </footer>
  );
}

