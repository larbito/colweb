"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { AppTopbar } from "@/components/app/app-topbar";
import { PageHeader } from "@/components/app/page-header";
import { SectionCard } from "@/components/app/section-card";
import { ProjectCard } from "@/components/app/project-card";
import { EmptyState } from "@/components/app/empty-state";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { mockProjects } from "@/lib/mock-data";
import type { ProjectStatus } from "@/lib/mock-data";
import { Search, Filter, SortAsc, FolderOpen, Plus, LayoutGrid, List } from "lucide-react";
import { cn } from "@/lib/utils";

type SortOption = "newest" | "oldest" | "updated";
type ViewMode = "grid" | "list";

export default function ProjectsPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | "all">("all");
  const [sort, setSort] = useState<SortOption>("updated");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");

  const filteredProjects = useMemo(() => {
    let projects = [...mockProjects];

    // Search
    if (search) {
      projects = projects.filter(
        (p) =>
          p.title.toLowerCase().includes(search.toLowerCase()) ||
          p.theme.toLowerCase().includes(search.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== "all") {
      projects = projects.filter((p) => p.status === statusFilter);
    }

    // Sort
    projects.sort((a, b) => {
      switch (sort) {
        case "newest":
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case "oldest":
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case "updated":
        default:
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      }
    });

    return projects;
  }, [search, statusFilter, sort]);

  // Stats
  const stats = useMemo(() => ({
    total: mockProjects.length,
    draft: mockProjects.filter(p => p.status === "draft").length,
    generating: mockProjects.filter(p => p.status === "generating").length,
    ready: mockProjects.filter(p => p.status === "ready").length,
    exported: mockProjects.filter(p => p.status === "exported").length,
  }), []);

  return (
    <>
      <AppTopbar showSearch />

      <main className="p-4 lg:p-6">
        <div className="mx-auto max-w-6xl space-y-6">
          <PageHeader
            title="My Projects"
            subtitle={`${mockProjects.length} coloring books in your library`}
            icon={FolderOpen}
            actions={
              <Button asChild>
                <Link href="/app/create">
                  <Plus className="mr-2 h-4 w-4" />
                  New Project
                </Link>
              </Button>
            }
          />

          {/* Stats Bar */}
          <div className="flex items-center gap-3 flex-wrap">
            <Badge 
              variant={statusFilter === "all" ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => setStatusFilter("all")}
            >
              All ({stats.total})
            </Badge>
            <Badge 
              variant={statusFilter === "draft" ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => setStatusFilter("draft")}
            >
              Drafts ({stats.draft})
            </Badge>
            <Badge 
              variant={statusFilter === "generating" ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => setStatusFilter("generating")}
            >
              Generating ({stats.generating})
            </Badge>
            <Badge 
              variant={statusFilter === "ready" ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => setStatusFilter("ready")}
            >
              Ready ({stats.ready})
            </Badge>
            <Badge 
              variant={statusFilter === "exported" ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => setStatusFilter("exported")}
            >
              Exported ({stats.exported})
            </Badge>
          </div>

          {/* Filters */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1 sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search projects..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-10 pl-10"
              />
            </div>

            <div className="flex gap-2">
              {/* View mode toggle */}
              <div className="flex items-center border rounded-lg p-1">
                <button
                  onClick={() => setViewMode("grid")}
                  className={cn(
                    "p-1.5 rounded-md transition-colors",
                    viewMode === "grid" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <LayoutGrid className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={cn(
                    "p-1.5 rounded-md transition-colors",
                    viewMode === "list" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <List className="h-4 w-4" />
                </button>
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <SortAsc className="mr-2 h-4 w-4" />
                    {sort === "updated" ? "Last Updated" : sort === "newest" ? "Newest" : "Oldest"}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuRadioGroup value={sort} onValueChange={(v) => setSort(v as SortOption)}>
                    <DropdownMenuRadioItem value="updated">Last Updated</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="newest">Newest First</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="oldest">Oldest First</DropdownMenuRadioItem>
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Projects Grid/List */}
          {filteredProjects.length === 0 ? (
            <EmptyState
              icon={FolderOpen}
              title={search || statusFilter !== "all" ? "No projects found" : "No projects yet"}
              description={
                search || statusFilter !== "all"
                  ? "Try adjusting your filters or search term."
                  : "Create your first coloring book to get started."
              }
              actionLabel={search || statusFilter !== "all" ? "Clear Filters" : "Create Book"}
              onAction={search || statusFilter !== "all" ? () => { setSearch(""); setStatusFilter("all"); } : undefined}
              actionHref={search || statusFilter !== "all" ? undefined : "/app/create"}
            />
          ) : (
            <div className={cn(
              "grid gap-4",
              viewMode === "grid" ? "sm:grid-cols-2 lg:grid-cols-3" : "grid-cols-1"
            )}>
              {filteredProjects.map((project) => (
                <ProjectCard key={project.id} project={project} />
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
