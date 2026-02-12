"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusPill } from "./status-pill";
import { ProgressBar } from "./progress-bar";
import { MoreHorizontal, Play, Download, Eye, RefreshCw } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatDate } from "@/lib/mock-data";
import type { Project } from "@/lib/mock-data";

interface DBProject {
  id: string;
  name: string;
  type: "coloring" | "quote";
  status: "draft" | "in_progress" | "complete";
  pageCount: number;
  createdAt: string;
  updatedAt: string;
  progress?: number;
  canResume?: boolean;
  promptsCount?: number;
  imagesCount?: number;
}

interface ProjectCardProps {
  project: Project | DBProject;
}

function formatRelativeDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

function normalizeStatus(status: string): "draft" | "in_progress" | "complete" {
  switch (status) {
    case "ready":
    case "exported":
    case "complete":
      return "complete";
    case "generating":
    case "in_progress":
    case "partial":
      return "in_progress";
    default:
      return "draft";
  }
}

export function ProjectCard({ project }: ProjectCardProps) {
  const isDbProject = !('pages' in project);

  let readyPages: number;
  let totalPages: number;
  let title: string;
  let status: "draft" | "in_progress" | "complete";
  let canResume: boolean;

  if (isDbProject) {
    const dbProject = project as DBProject;
    readyPages = dbProject.imagesCount || 0;
    totalPages = dbProject.pageCount || 0;
    title = dbProject.name;
    status = normalizeStatus(dbProject.status);
    canResume = dbProject.canResume || false;
  } else {
    const mockProject = project as Project;
    readyPages = mockProject.pages.filter((p) => p.status === "ready").length;
    totalPages = mockProject.pages.length;
    title = mockProject.title;
    status = normalizeStatus(mockProject.status);
    canResume = false;
  }

  const updatedAt = project.updatedAt;

  return (
    <Card className="group hover:shadow-lg dark:hover:bg-card/80 transition-all duration-300">
      <CardContent className="p-6">
        <div className="mb-4 flex items-start justify-between">
          <div className="flex-1">
            <Link
              href={isDbProject ? `/app/create?projectId=${project.id}` : `/app/projects/${project.id}`}
              className="font-semibold text-[15px] hover:text-foreground/80 transition-colors"
            >
              {title}
            </Link>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="text-xs">
                {isDbProject ? "US Letter" : (project as Project).trimSize}
              </Badge>
              <StatusPill status={status} />
              {canResume && (
                <Badge variant="outline" className="text-xs text-orange-600 border-orange-200 bg-orange-50 dark:bg-orange-900/20 dark:border-orange-800">
                  <RefreshCw className="h-3 w-3 mr-1" /> Resume
                </Badge>
              )}
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-xs" className="opacity-0 group-hover:opacity-100 transition-opacity">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={isDbProject ? `/app/create?projectId=${project.id}` : `/app/projects/${project.id}`}>
                  <Eye className="mr-2 h-4 w-4" /> View Project
                </Link>
              </DropdownMenuItem>
              {canResume && (
                <DropdownMenuItem asChild>
                  <Link href={`/app/create?projectId=${project.id}&resume=true`}>
                    <Play className="mr-2 h-4 w-4" /> Resume Generation
                  </Link>
                </DropdownMenuItem>
              )}
              {status === "complete" && (
                <DropdownMenuItem>
                  <Download className="mr-2 h-4 w-4" /> Export PDF
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {totalPages > 0 && (
          <div className="mb-3">
            <ProgressBar value={readyPages} max={totalPages} showLabel />
            {isDbProject && (
              <div className="mt-1.5 text-xs text-muted-foreground">
                {(project as DBProject).promptsCount || 0} prompts &middot; {readyPages} images
              </div>
            )}
          </div>
        )}

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{totalPages} pages</span>
          <span>Updated {formatRelativeDate(updatedAt)}</span>
        </div>
      </CardContent>
    </Card>
  );
}
