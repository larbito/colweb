"use client";

/**
 * Simple platform logos strip showing supported publishing platforms.
 * Minimal design matching existing site style.
 */
export function PlatformLogos() {
  const platforms = [
    { name: "Amazon KDP", abbr: "KDP" },
    { name: "Etsy", abbr: "Etsy" },
    { name: "IngramSpark", abbr: "Ingram" },
    { name: "Lulu", abbr: "Lulu" },
    { name: "Gumroad", abbr: "Gumroad" },
  ];

  return (
    <section className="border-t border-border/40 bg-muted/20 py-8">
      <div className="mx-auto max-w-6xl px-6">
        <p className="mb-5 text-center text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Works with
        </p>
        <div className="flex flex-wrap items-center justify-center gap-8">
          {platforms.map((platform) => (
            <div 
              key={platform.name} 
              className="text-sm font-medium text-muted-foreground/60 hover:text-muted-foreground transition-colors"
              title={platform.name}
            >
              {platform.abbr}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

