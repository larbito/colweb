import Link from "next/link";
import { BookOpen } from "lucide-react";

const links = {
  product: [
    { label: "Features", href: "#features" },
    { label: "Pricing", href: "#pricing" },
    { label: "FAQ", href: "/faq" },
  ],
  company: [
    { label: "About", href: "#" },
    { label: "Blog", href: "#" },
    { label: "Contact", href: "#" },
  ],
  legal: [
    { label: "Terms", href: "/terms" },
    { label: "Privacy", href: "/privacy" },
  ],
};

export function MarketingFooter() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto max-w-5xl px-6 py-12">
        <div className="grid gap-8 sm:grid-cols-2 md:grid-cols-4">
          <div>
            <Link href="/" className="flex items-center gap-2 font-medium">
              <BookOpen className="h-5 w-5" />
              <span>ColorBook AI</span>
            </Link>
            <p className="mt-3 text-sm text-muted-foreground">
              Generate KDP-ready coloring books with AI.
            </p>
          </div>
          
          <div>
            <p className="mb-3 text-sm font-medium">Product</p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {links.product.map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className="transition-colors hover:text-foreground">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          
          <div>
            <p className="mb-3 text-sm font-medium">Company</p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {links.company.map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className="transition-colors hover:text-foreground">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          
          <div>
            <p className="mb-3 text-sm font-medium">Legal</p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {links.legal.map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className="transition-colors hover:text-foreground">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
        
        <div className="mt-12 border-t border-border pt-8 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} ColorBook AI. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
