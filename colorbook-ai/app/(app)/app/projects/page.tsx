"use client";

import { useState, useMemo } from "react";
import { AppTopbar } from "@/components/app/app-topbar";
import { ProjectCard } from "@/components/app/project-card";
import { EmptyState } from "@/components/app/empty-state";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { mockProjects } from "@/lib/mock-data";
import type { ProjectStatus } from "@/lib/mock-data";
import { Search, Filter, SortAsc, FolderOpen } from "lucide-react";

type SortOption = "newest" | "oldest" | "updated";

export default function ProjectsPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | "all">("all");
  const [sort, setSort] = useState<SortOption>("updated");

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

  return (
    <>
      <AppTopbar title="My Projects" subtitle={`${mockProjects.length} total projects`} />

      <main className="p-4 lg:p-6">
        <div className="mx-auto max-w-6xl space-y-6">
          {/* Filters */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1 sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search projects..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-10 rounded-xl pl-10"
              />
            </div>

            <div className="flex gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="rounded-xl">
                    <Filter className="mr-2 h-4 w-4" />
                    {statusFilter === "all" ? "All Status" : statusFilter}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuRadioGroup
                    value={statusFilter}
                    onValueChange={(v) => setStatusFilter(v as ProjectStatus | "all")}
                  >
                    <DropdownMenuRadioItem value="all">All Status</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="draft">Draft</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="generating">Generating</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="ready">Ready</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="exported">Exported</DropdownMenuRadioItem>
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="rounded-xl">
                    <SortAsc className="mr-2 h-4 w-4" />
                    Sort
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

          {/* Projects Grid */}
          {filteredProjects.length === 0 ? (
            <EmptyState
              icon={FolderOpen}
              title={search || statusFilter !== "all" ? "No projects found" : "No projects yet"}
              description={
                search || statusFilter !== "all"
                  ? "Try adjusting your filters or search term."
                  : "Create your first coloring book to get started."
              }
              actionLabel={search || statusFilter !== "all" ? undefined : "Create Book"}
              actionHref="/app/new"
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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

