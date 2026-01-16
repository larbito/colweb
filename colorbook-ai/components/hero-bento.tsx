"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FloatingCard } from "@/components/floating-card";
import { Sparkles, FileText, Image } from "lucide-react";

export function HeroBento() {
  return (
    <div className="relative h-[500px] md:h-[600px]">
      {/* Background gradient blob */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute right-0 top-1/4 h-96 w-96 rounded-full bg-gradient-to-br from-primary/30 via-transparent to-transparent blur-3xl" />
      </div>

      {/* Floating cards in bento layout */}
      <FloatingCard delay={0} className="absolute left-0 top-12 w-64">
        <Card className="glass-card shadow-2xl">
          <CardHeader className="space-y-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 ring-1 ring-primary/20">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <CardTitle className="text-sm font-semibold">Size Presets</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {["8.5×11", "A4", "8×10"].map((size) => (
              <Badge key={size} variant="secondary" className="border-primary/10">
                {size}
              </Badge>
            ))}
          </CardContent>
        </Card>
      </FloatingCard>

      <FloatingCard delay={0.2} className="absolute right-0 top-32 w-72">
        <Card className="glass-card shadow-2xl">
          <CardHeader className="space-y-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500/20 to-blue-500/5 ring-1 ring-blue-500/20">
              <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <CardTitle className="text-sm font-semibold">Story Prompts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs">
            <div className="rounded-xl border border-border/50 bg-muted/60 px-3 py-2.5 text-foreground/80 backdrop-blur">
              Page 1: Panda in a bamboo forest
            </div>
            <div className="rounded-xl border border-border/50 bg-muted/60 px-3 py-2.5 text-foreground/80 backdrop-blur">
              Page 2: Playing with butterfly friends
            </div>
            <div className="rounded-xl border border-border/50 bg-muted/60 px-3 py-2.5 text-foreground/80 backdrop-blur">
              Page 3: Discovering a hidden waterfall
            </div>
          </CardContent>
        </Card>
      </FloatingCard>

      <FloatingCard delay={0.4} className="absolute bottom-12 left-1/4 w-64">
        <Card className="glass-card shadow-2xl">
          <CardHeader className="space-y-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500/20 to-purple-500/5 ring-1 ring-purple-500/20">
              <Image className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <CardTitle className="text-sm font-semibold">Preview Page</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="aspect-[8.5/11] rounded-xl border-2 border-dashed border-border/50 bg-gradient-to-br from-muted/40 to-muted/10" />
          </CardContent>
        </Card>
      </FloatingCard>
    </div>
  );
}

