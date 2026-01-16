"use client";

import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import type { LucideIcon } from "lucide-react";

interface PageHeaderProps {
  badge?: string;
  badgeIcon?: LucideIcon;
  title: string;
  subtitle?: string;
}

export function PageHeader({ badge, badgeIcon: BadgeIcon, title, subtitle }: PageHeaderProps) {
  return (
    <section className="mx-auto max-w-4xl px-6 pb-12 pt-28 text-center">
      {badge && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Badge variant="secondary" className="mb-6 gap-1.5 rounded-full px-3 py-1">
            {BadgeIcon && <BadgeIcon className="h-3.5 w-3.5" />}
            {badge}
          </Badge>
        </motion.div>
      )}

      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="mb-4 text-4xl font-semibold tracking-tight sm:text-5xl"
      >
        {title}
      </motion.h1>

      {subtitle && (
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mx-auto max-w-2xl text-lg text-muted-foreground"
        >
          {subtitle}
        </motion.p>
      )}
    </section>
  );
}

