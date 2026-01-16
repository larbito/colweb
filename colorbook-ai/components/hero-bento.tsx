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
        <Card className="border-border bg-card/80 shadow-lg backdrop-blur">
          <CardHeader className="space-y-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <CardTitle className="text-sm">Size Presets</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {["8.5×11", "A4", "8×10"].map((size) => (
              <Badge key={size} variant="secondary">
                {size}
              </Badge>
            ))}
          </CardContent>
        </Card>
      </FloatingCard>

      <FloatingCard delay={0.2} className="absolute right-0 top-32 w-72">
        <Card className="border-border bg-card/80 shadow-lg backdrop-blur">
          <CardHeader className="space-y-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <CardTitle className="text-sm">Story Prompts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs text-muted-foreground">
            <div className="rounded-lg border border-border bg-muted/40 px-3 py-2">
              Page 1: Panda in a bamboo forest
            </div>
            <div className="rounded-lg border border-border bg-muted/40 px-3 py-2">
              Page 2: Playing with butterfly friends
            </div>
            <div className="rounded-lg border border-border bg-muted/40 px-3 py-2">
              Page 3: Discovering a hidden waterfall
            </div>
          </CardContent>
        </Card>
      </FloatingCard>

      <FloatingCard delay={0.4} className="absolute bottom-12 left-1/4 w-64">
        <Card className="border-border bg-card/80 shadow-lg backdrop-blur">
          <CardHeader className="space-y-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10">
              <Image className="h-5 w-5 text-primary" />
            </div>
            <CardTitle className="text-sm">Preview Page</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="aspect-[8.5/11] rounded-lg border-2 border-dashed border-border bg-muted/20" />
          </CardContent>
        </Card>
      </FloatingCard>
    </div>
  );
}

