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
    <section className="border-y border-border/30">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <p className="mb-8 text-center text-sm font-medium uppercase tracking-widest text-muted-foreground/70">
          Built for KDP creators
        </p>
        <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-6">
          {items.map((item) => (
            <div key={item.label} className="flex items-center gap-2.5 text-[15px] text-muted-foreground">
              <item.icon className="h-[18px] w-[18px]" />
              <span>{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
