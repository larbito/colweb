import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FileQuestion, Home, HelpCircle } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6">
      <div className="text-center">
        <div className="mb-6 inline-flex h-20 w-20 items-center justify-center rounded-full bg-muted">
          <FileQuestion className="h-10 w-10 text-muted-foreground" />
        </div>
        
        <h1 className="mb-2 text-4xl font-semibold tracking-tight">Page not found</h1>
        <p className="mb-8 text-lg text-muted-foreground">
          Sorry, we couldn't find the page you're looking for.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button asChild className="rounded-full">
            <Link href="/">
              <Home className="mr-2 h-4 w-4" />
              Back to Home
            </Link>
          </Button>
          <Button asChild variant="outline" className="rounded-full">
            <Link href="/faq">
              <HelpCircle className="mr-2 h-4 w-4" />
              View FAQ
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

