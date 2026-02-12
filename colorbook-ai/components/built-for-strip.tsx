import { Printer, FileOutput, Sparkles, Layers, Moon, Zap } from "lucide-react";

const items = [
  { icon: Printer, label: "KDP Ready" },
  { icon: FileOutput, label: "PDF Export" },
  { icon: Sparkles, label: "AI Prompts" },
  { icon: Layers, label: "Bulk Generation" },
  { icon: Zap, label: "Instant Preview" },
  { icon: Moon, label: "Dark Mode" },
];

export function BuiltForStrip() {
  return (
    <section className="border-y border-border/40 bg-muted/30">
      <div className="mx-auto max-w-6xl px-6 py-8">
        <p className="mb-6 text-center text-sm font-medium text-muted-foreground">Built for KDP creators</p>
        <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-4">
          {items.map((item) => (
            <div key={item.label} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors">
              <item.icon className="h-4 w-4 text-primary/70" />
              <span>{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

