"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface QuickActionCardProps {
  emoji: string;
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
}

export function QuickActionCard({ emoji, title, description, href, icon: Icon }: QuickActionCardProps) {
  return (
    <Card className="group border-border/50 bg-card/60 backdrop-blur transition-all hover:border-border hover:bg-card hover:shadow-lg">
      <CardContent className="p-5">
        <div className="mb-3 flex items-center gap-2">
          <span className="text-2xl">{emoji}</span>
          <h3 className="font-semibold">{title}</h3>
        </div>
        <p className="mb-4 text-sm text-muted-foreground">{description}</p>
        <Button asChild variant="outline" size="sm" className="w-full rounded-xl group-hover:bg-primary group-hover:text-primary-foreground">
          <Link href={href}>
            Get Started
            <ArrowRight className="ml-2 h-3 w-3 transition-transform group-hover:translate-x-1" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

