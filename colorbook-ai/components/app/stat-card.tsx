"use client";

import { Card, CardContent } from "@/components/ui/card";
import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: number | string;
  sublabel?: string;
  color?: "violet" | "blue" | "green" | "orange" | "pink";
}

const colorClasses = {
  violet: {
    bg: "bg-violet-500/10",
    icon: "text-violet-500",
    value: "from-violet-500 to-purple-600",
  },
  blue: {
    bg: "bg-blue-500/10",
    icon: "text-blue-500",
    value: "from-blue-500 to-cyan-500",
  },
  green: {
    bg: "bg-green-500/10",
    icon: "text-green-500",
    value: "from-green-500 to-emerald-500",
  },
  orange: {
    bg: "bg-orange-500/10",
    icon: "text-orange-500",
    value: "from-orange-500 to-amber-500",
  },
  pink: {
    bg: "bg-pink-500/10",
    icon: "text-pink-500",
    value: "from-pink-500 to-rose-500",
  },
};

export function StatCard({ icon: Icon, label, value, sublabel, color = "violet" }: StatCardProps) {
  const colors = colorClasses[color];
  
  return (
    <Card className="hover-lift transition-all hover:border-primary/20">
      <CardContent className="flex items-center gap-4 p-5">
        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${colors.bg}`}>
          <Icon className={`h-5 w-5 ${colors.icon}`} />
        </div>
        <div>
          <p className={`text-2xl font-bold bg-gradient-to-r ${colors.value} bg-clip-text text-transparent`}>
            {value}
          </p>
          <p className="text-sm text-muted-foreground">{label}</p>
          {sublabel && <p className="text-xs text-muted-foreground/70">{sublabel}</p>}
        </div>
      </CardContent>
    </Card>
  );
}
