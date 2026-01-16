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
          
          <Card className="relative rounded-2xl border-border bg-card/50 backdrop-blur">
            <CardHeader className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-primary/20 bg-primary/10 text-lg font-semibold text-primary">
                  {step.number}
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-muted">
                  <step.icon className="h-5 w-5 text-foreground" />
                </div>
              </div>
              <CardTitle className="text-lg">{step.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{step.description}</p>
            </CardContent>
          </Card>
        </div>
      ))}
    </div>
  );
}

