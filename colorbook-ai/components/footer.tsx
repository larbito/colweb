import Link from "next/link";

const links = {
  product: [
    { label: "Features", href: "/#features" },
    { label: "Pricing", href: "/#pricing" },
    { label: "FAQ", href: "/#faq" },
    { label: "Blog", href: "/blog" },
  ],
  company: [
    { label: "About", href: "/about" },
    { label: "Contact", href: "/contact" },
  ],
  legal: [
    { label: "Terms", href: "/terms" },
    { label: "Privacy", href: "/privacy" },
  ],
};

export function Footer() {
  return (
    <footer className="border-t border-border/40">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="grid gap-8 sm:grid-cols-2 md:grid-cols-4">
          <div>
            <Link href="/" className="flex items-center gap-2 font-semibold">
              <svg width="24" height="24" viewBox="0 0 28 28" fill="none" className="text-primary">
                <rect width="28" height="28" rx="8" fill="currentColor" fillOpacity="0.15"/>
                <path d="M8 10C8 8.89543 8.89543 8 10 8H18C19.1046 8 20 8.89543 20 10V18C20 19.1046 19.1046 20 18 20H10C8.89543 20 8 19.1046 8 18V10Z" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M11 12H17M11 15H15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              ColorBook AI
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
                  <Link href={link.href} className="transition hover:text-foreground">{link.label}</Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="mb-3 text-sm font-medium">Company</p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {links.company.map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className="transition hover:text-foreground">{link.label}</Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="mb-3 text-sm font-medium">Legal</p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {links.legal.map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className="transition hover:text-foreground">{link.label}</Link>
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
