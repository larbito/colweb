"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface QuickActionCardProps {
  emoji: string;
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
  gradient?: string;
  badge?: string;
}

export function QuickActionCard({ 
  emoji, 
  title, 
  description, 
  href, 
  icon: Icon,
  gradient = "from-violet-500 to-purple-600",
  badge
}: QuickActionCardProps) {
  return (
    <Card className="group relative overflow-hidden border transition-all hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 card-hover">
      <CardContent className="p-5">
        {badge && (
          <Badge className="absolute top-3 right-3 bg-gradient-to-r from-violet-500 to-purple-500 text-white border-0 text-[10px]">
            {badge}
          </Badge>
        )}
        <div className="mb-4 flex items-center gap-3">
          <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${gradient} shadow-lg`}>
            <Icon className="h-6 w-6 text-white" />
          </div>
          <div>
            <h3 className="font-semibold">{title}</h3>
          </div>
        </div>
        <p className="mb-4 text-sm text-muted-foreground leading-relaxed">{description}</p>
        <Button asChild variant="outline" size="sm" className="w-full rounded-xl group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary transition-all">
          <Link href={href}>
            Get Started
            <ArrowRight className="ml-2 h-3 w-3 transition-transform group-hover:translate-x-1" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
