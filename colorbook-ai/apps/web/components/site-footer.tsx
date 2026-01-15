import Link from 'next/link';

export function SiteFooter() {
  return (
    <footer className="border-t">
      <div className="container flex flex-col gap-4 py-10 md:flex-row md:items-center md:justify-between">
        <p className="text-sm text-muted-foreground">
          © {new Date().getFullYear()} Colorbook AI. All rights reserved.
        </p>
        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
          <Link className="hover:text-foreground" href="/terms">
            Terms
          </Link>
          <Link className="hover:text-foreground" href="/privacy">
            Privacy
          </Link>
        </div>
      </div>
    </footer>
  );
}


