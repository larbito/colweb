"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusPill } from "./status-pill";
import { ProgressBar } from "./progress-bar";
import { MoreHorizontal, Play, Download, Eye } from "lucide-react";
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

  return (
    <Card className="group border-border/50 bg-card/60 backdrop-blur transition-all hover:border-border hover:bg-card hover:shadow-lg">
      <CardContent className="p-5">
        <div className="mb-3 flex items-start justify-between">
          <div className="flex-1">
            <Link
              href={`/app/projects/${project.id}`}
              className="font-semibold hover:text-primary"
            >
              {project.title}
            </Link>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="text-xs">
                {project.trimSize}
              </Badge>
              <StatusPill status={project.status} />
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={`/app/projects/${project.id}`}>
                  <Eye className="mr-2 h-4 w-4" /> View Project
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Play className="mr-2 h-4 w-4" /> Continue Generating
              </DropdownMenuItem>
              <DropdownMenuItem>
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

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{totalPages} pages</span>
          <span>Updated {formatDate(project.updatedAt)}</span>
        </div>
      </CardContent>
    </Card>
  );
}

