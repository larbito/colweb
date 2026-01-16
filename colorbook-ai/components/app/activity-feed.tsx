"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Image, Edit, Download, FolderPlus, Activity } from "lucide-react";
import { mockActivity, formatRelativeTime } from "@/lib/mock-data";
import type { ActivityItem } from "@/lib/mock-data";

const activityIcons = {
  page_generated: Image,
  prompt_edited: Edit,
  exported: Download,
  project_created: FolderPlus,
};

const activityColors = {
  page_generated: "text-green-500",
  prompt_edited: "text-blue-500",
  exported: "text-purple-500",
  project_created: "text-yellow-500",
};

interface ActivityFeedProps {
  items?: ActivityItem[];
  limit?: number;
}

export function ActivityFeed({ items = mockActivity, limit = 5 }: ActivityFeedProps) {
  const displayItems = items.slice(0, limit);

  return (
    <Card className="border-border/50 bg-card/60 backdrop-blur">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <Activity className="h-4 w-4 text-muted-foreground" />
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {displayItems.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">No activity yet</p>
        ) : (
          displayItems.map((item) => {
            const Icon = activityIcons[item.type];
            const color = activityColors[item.type];
            return (
              <div key={item.id} className="flex items-start gap-3">
                <div className={`mt-0.5 ${color}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 space-y-0.5">
                  <p className="text-sm">{item.description}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Link
                      href={`/app/projects/${item.projectId}`}
                      className="hover:text-foreground hover:underline"
                    >
                      {item.projectTitle}
                    </Link>
                    <span>•</span>
                    <span>{formatRelativeTime(item.timestamp)}</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}

