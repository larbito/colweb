"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusPill } from "./status-pill";
import { ProgressBar } from "./progress-bar";
import { MoreHorizontal, Play, Download, Eye, FolderOpen } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatDate } from "@/lib/mock-data";
import type { Project } from "@/lib/mock-data";

interface ProjectCardProps {
  project: Project;
}

export function ProjectCard({ project }: ProjectCardProps) {
  const readyPages = project.pages.filter((p) => p.status === "ready").length;
  const totalPages = project.pages.length;

  // Get first ready page image as thumbnail
  const thumbnailPage = project.pages.find(p => p.imageUrl);

  return (
    <Card className="group overflow-hidden transition-all hover:border-primary/20 hover:shadow-lg hover:shadow-primary/5">
      {/* Thumbnail area */}
      <div className="aspect-[4/3] bg-muted/50 relative overflow-hidden">
        {thumbnailPage?.imageUrl ? (
          <img 
            src={thumbnailPage.imageUrl} 
            alt={project.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <FolderOpen className="h-12 w-12 text-muted-foreground/30" />
          </div>
        )}
        {/* Status overlay */}
        <div className="absolute top-2 right-2">
          <StatusPill status={project.status} />
        </div>
      </div>
      
      <CardContent className="p-4">
        <div className="mb-3 flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <Link
              href={`/app/projects/${project.id}`}
              className="font-semibold hover:text-primary transition-colors line-clamp-1"
            >
              {project.title}
            </Link>
            <div className="mt-1.5 flex items-center gap-2">
              <Badge variant="secondary" className="text-[10px] font-medium">
                {project.trimSize}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {totalPages} pages
              </span>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem asChild className="cursor-pointer">
                <Link href={`/app/projects/${project.id}`}>
                  <Eye className="mr-2 h-4 w-4" /> View Project
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer">
                <Play className="mr-2 h-4 w-4" /> Continue Generating
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer">
                <Download className="mr-2 h-4 w-4" /> Export PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {totalPages > 0 && (
          <div className="mb-3">
            <ProgressBar value={readyPages} max={totalPages} showLabel />
          </div>
        )}

        <div className="text-[11px] text-muted-foreground">
          Updated {formatDate(project.updatedAt)}
        </div>
      </CardContent>
    </Card>
  );
}
