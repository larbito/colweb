"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PageContainer } from "@/components/app/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  PenTool,
  Quote,
  FolderOpen,
  Image,
  FileText,
  ArrowRight,
  Clock,
  Play,
  Download,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface DBProject {
  id: string;
  name: string;
  project_type: "coloring_book" | "quote_book";
  pages_requested: number;
  prompts_generated_count: number;
  images_generated_count: number;
  status: "draft" | "generating" | "ready" | "failed" | "expired" | "partial";
  created_at: string;
  updated_at: string;
  canResume?: boolean;
}

export default function DashboardPage() {
  const [userId, setUserId] = useState<string>("");
  const [projects, setProjects] = useState<DBProject[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let id = localStorage.getItem("colweb_user_id");
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem("colweb_user_id", id);
    }
    setUserId(id);

    const fetchProjects = async () => {
      try {
        const response = await fetch(`/api/projects?userId=${id}`);
        const data = await response.json();
        if (data.success && data.projects) {
          setProjects(data.projects);
        }
      } catch (error) {
        console.error("Failed to fetch projects:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, []);

  const recentProjects = projects.slice(0, 6);
  const stats = {
    totalProjects: projects.length,
    totalPages: projects.reduce((sum, p) => sum + (p.images_generated_count || 0), 0),
    exports: projects.filter(p => p.status === "ready").length,
  };

  const formatRelativeTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <main className="flex-1">
      <PageContainer maxWidth="2xl">
        <div className="py-4 space-y-14 animate-fade-in">

          {/* Page Header */}
          <div>
            <h1 className="text-4xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground mt-3 text-lg">Create and manage your coloring books</p>
          </div>

          {/* Quick Create */}
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/70 mb-6">
              Quick Create
            </h2>
            <div className="grid gap-6 md:grid-cols-2">
              <Link href="/app/create" className="group block">
                <Card className="h-full hover:shadow-xl dark:hover:bg-card/80 transition-all duration-300">
                  <CardContent className="p-8 flex items-center gap-6">
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-muted group-hover:scale-105 transition-transform duration-300">
                      <PenTool className="h-7 w-7 text-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-foreground text-xl tracking-tight">Coloring Book</h3>
                      <p className="text-[15px] text-muted-foreground mt-1.5">
                        Full coloring books with AI-generated illustrations
                      </p>
                    </div>
                    <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-foreground group-hover:translate-x-1 transition-all shrink-0" />
                  </CardContent>
                </Card>
              </Link>

              <Link href="/app/quote-book" className="group block">
                <Card className="h-full hover:shadow-xl dark:hover:bg-card/80 transition-all duration-300">
                  <CardContent className="p-8 flex items-center gap-6">
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-muted group-hover:scale-105 transition-transform duration-300">
                      <Quote className="h-7 w-7 text-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-foreground text-xl tracking-tight">Quote Book</h3>
                      <p className="text-[15px] text-muted-foreground mt-1.5">
                        Typography-based pages with decorative frames
                      </p>
                    </div>
                    <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-foreground group-hover:translate-x-1 transition-all shrink-0" />
                  </CardContent>
                </Card>
              </Link>
            </div>
          </section>

          {/* Stats */}
          <section>
            <div className="grid gap-6 grid-cols-1 sm:grid-cols-3">
              <Card>
                <CardContent className="p-8">
                  <div className="flex items-center gap-5">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
                      <FolderOpen className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-4xl font-bold tabular-nums tracking-tight">{stats.totalProjects}</p>
                      <p className="text-sm text-muted-foreground mt-1">Projects</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-8">
                  <div className="flex items-center gap-5">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
                      <Image className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-4xl font-bold tabular-nums tracking-tight">{stats.totalPages}</p>
                      <p className="text-sm text-muted-foreground mt-1">Pages Generated</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-8">
                  <div className="flex items-center gap-5">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
                      <FileText className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-4xl font-bold tabular-nums tracking-tight">{stats.exports}</p>
                      <p className="text-sm text-muted-foreground mt-1">PDFs Exported</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </section>

          {/* Recent Projects */}
          <section>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/70">
                Recent Projects
              </h2>
              {projects.length > 0 && (
                <Button asChild variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                  <Link href="/app/projects">
                    View all <ArrowRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
              )}
            </div>

            {loading ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <Skeleton key={i} className="h-32 w-full rounded-[20px]" />
                ))}
              </div>
            ) : recentProjects.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="p-20 text-center">
                  <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-muted mx-auto mb-6">
                    <FolderOpen className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="font-semibold text-foreground text-xl mb-2">No projects yet</h3>
                  <p className="text-muted-foreground mb-8 max-w-sm mx-auto">
                    Create your first coloring book to get started
                  </p>
                  <Button asChild size="lg" className="rounded-full px-8">
                    <Link href="/app/create">Create Book</Link>
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {recentProjects.map((project) => (
                  <ProjectRow key={project.id} project={project} formatTime={formatRelativeTime} />
                ))}
              </div>
            )}
          </section>

        </div>
      </PageContainer>
    </main>
  );
}

function ProjectRow({
  project,
  formatTime
}: {
  project: DBProject;
  formatTime: (s: string) => string;
}) {
  const progress = project.pages_requested > 0
    ? Math.round((project.images_generated_count / project.pages_requested) * 100)
    : 0;

  const statusLabel = {
    draft: "Draft",
    generating: "In Progress",
    partial: "Incomplete",
    ready: "Complete",
    failed: "Error",
    expired: "Expired",
  }[project.status] || "Draft";

  const statusColor = {
    draft: "text-muted-foreground",
    generating: "text-yellow-500",
    partial: "text-yellow-500",
    ready: "text-green-500",
    failed: "text-red-500",
    expired: "text-muted-foreground",
  }[project.status] || "text-muted-foreground";

  const href = project.status === "ready"
    ? `/app/projects/${project.id}`
    : `/app/create?projectId=${project.id}`;

  return (
    <Link href={href} className="group block">
      <Card className="hover:shadow-lg dark:hover:bg-card/80 transition-all duration-300">
        <CardContent className="p-6">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-foreground truncate group-hover:text-foreground/80 text-[15px]">
                {project.name || "Untitled Project"}
              </h3>
              <div className="flex items-center gap-2 mt-1.5">
                <span className={cn("text-xs font-medium", statusColor)}>
                  {statusLabel}
                </span>
                <span className="text-xs text-muted-foreground/50">&middot;</span>
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatTime(project.updated_at)}
                </span>
              </div>
            </div>

            {project.status === "ready" ? (
              <Button size="icon-xs" variant="ghost">
                <Download className="h-4 w-4" />
              </Button>
            ) : project.canResume ? (
              <Button size="icon-xs" variant="ghost">
                <Play className="h-4 w-4" />
              </Button>
            ) : null}
          </div>

          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-500",
                project.status === "ready" ? "bg-green-500" : "bg-foreground/40"
              )}
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between mt-2">
            <span className="text-xs text-muted-foreground">
              {project.images_generated_count}/{project.pages_requested} pages
            </span>
            <span className="text-xs text-muted-foreground tabular-nums">{progress}%</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
