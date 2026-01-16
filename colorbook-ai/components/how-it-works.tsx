import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Ruler, FileText, Download } from "lucide-react";

const steps = [
  {
    number: "01",
    title: "Choose size & style",
    description: "Pick KDP trim size, complexity level, and line thickness presets.",
    icon: Ruler,
  },
  {
    number: "02",
    title: "Generate story prompts",
    description: "Draft prompts in an editable table you fully control.",
    icon: FileText,
  },
  {
    number: "03",
    title: "Review pages & export PDF",
    description: "Approve each page, then export with numbering and layout options.",
    icon: Download,
  },
];

export function HowItWorks() {
  return (
    <div className="grid gap-8 md:grid-cols-3">
      {steps.map((step, idx) => (
        <div key={step.number} className="relative">
          {/* Connecting line on desktop */}
          {idx < steps.length - 1 && (
            <div className="absolute left-full top-16 hidden h-px w-full bg-gradient-to-r from-border to-transparent md:block" />
          )}
          
          <Card className="relative glass-card transition-all duration-300 hover:border-primary/20 hover:shadow-xl">
            <CardHeader className="space-y-5">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-primary/30 bg-gradient-to-br from-primary/20 to-primary/5 text-xl font-bold text-primary">
                  {step.number}
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-muted via-muted/80 to-muted/60">
                  <step.icon className="h-5 w-5 text-foreground" />
                </div>
              </div>
              <CardTitle className="text-xl font-semibold">{step.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed text-muted-foreground">{step.description}</p>
            </CardContent>
          </Card>
        </div>
      ))}
    </div>
  );
}

