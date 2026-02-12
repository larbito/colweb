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
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Types for projects from DB
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

/**
 * Premium Dashboard - Professional SaaS design
 * Gradient mesh background, elevated cards, clear hierarchy
 */
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
    <main className="flex-1 bg-gradient-mesh min-h-screen">
      <PageContainer maxWidth="2xl">
        <div className="py-10 space-y-12">
          
          {/* Hero Header */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <span className="text-sm font-medium text-primary">Welcome back</span>
            </div>
            <h1 className="text-4xl font-bold tracking-tight">
              Dashboard
            </h1>
            <p className="text-lg text-muted-foreground max-w-xl">
              Create and manage your AI-powered coloring books. Start a new project or continue where you left off.
            </p>
          </div>

          {/* Quick Create - Premium Cards */}
          <section>
            <h2 className="text-sm font-semibold text-muted-foreground mb-5 uppercase tracking-widest">
              Create New
            </h2>
            <div className="grid gap-6 md:grid-cols-2">
              <Link href="/app/create" className="group block">
                <Card className="h-full overflow-hidden border-0 bg-card/80 backdrop-blur-xl shadow-card-hover hover:shadow-card-elevated hover:shadow-glow-primary transition-all duration-300 group-hover:-translate-y-1">
                  <CardContent className="p-8">
                    <div className="flex items-start gap-6">
                      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 group-hover:from-primary/30 group-hover:to-primary/10 transition-colors">
                        <PenTool className="h-8 w-8 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-xl font-bold text-foreground mb-1">Coloring Book</h3>
                        <p className="text-muted-foreground mb-6">
                          Full coloring books with AI-generated illustrations, storybook mode, and KDP-ready export.
                        </p>
                        <Button className="group-hover:bg-primary/90">
                          Get Started <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>

              <Link href="/app/quote-book" className="group block">
                <Card className="h-full overflow-hidden border-0 bg-card/80 backdrop-blur-xl shadow-card-hover hover:shadow-card-elevated hover:shadow-glow-primary transition-all duration-300 group-hover:-translate-y-1">
                  <CardContent className="p-8">
                    <div className="flex items-start gap-6">
                      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 group-hover:from-primary/30 group-hover:to-primary/10 transition-colors">
                        <Quote className="h-8 w-8 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-xl font-bold text-foreground mb-1">Quote Book</h3>
                        <p className="text-muted-foreground mb-6">
                          Typography-based pages with decorative frames, perfect for motivation or gift books.
                        </p>
                        <Button className="group-hover:bg-primary/90">
                          Get Started <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </div>
          </section>

          {/* Stats - Elevated Row */}
          <section>
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
              <Card className="border-0 bg-card/60 backdrop-blur-sm shadow-soft overflow-hidden">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-4xl font-bold tabular-nums text-foreground">{stats.totalProjects}</p>
                      <p className="text-sm font-medium text-muted-foreground mt-1">Projects</p>
                    </div>
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
                      <FolderOpen className="h-7 w-7 text-primary" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 bg-card/60 backdrop-blur-sm shadow-soft overflow-hidden">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-4xl font-bold tabular-nums text-foreground">{stats.totalPages}</p>
                      <p className="text-sm font-medium text-muted-foreground mt-1">Pages Generated</p>
                    </div>
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
                      <Image className="h-7 w-7 text-primary" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 bg-card/60 backdrop-blur-sm shadow-soft overflow-hidden">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-4xl font-bold tabular-nums text-foreground">{stats.exports}</p>
                      <p className="text-sm font-medium text-muted-foreground mt-1">PDFs Exported</p>
                    </div>
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
                      <FileText className="h-7 w-7 text-primary" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </section>

          {/* Recent Projects */}
          <section>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-foreground">
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
                  <Skeleton key={i} className="h-32 w-full rounded-2xl" />
                ))}
              </div>
            ) : recentProjects.length === 0 ? (
              <Card className="border-2 border-dashed border-primary/20 bg-card/40 overflow-hidden">
                <CardContent className="p-20 text-center">
                  <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10 mx-auto mb-6">
                    <FolderOpen className="h-10 w-10 text-primary" />
                  </div>
                  <h3 className="font-semibold text-foreground text-xl mb-2">No projects yet</h3>
                  <p className="text-muted-foreground mb-8 max-w-sm mx-auto text-base">
                    Create your first coloring book and start selling on Amazon KDP.
                  </p>
                  <Button asChild size="lg" className="px-8">
                    <Link href="/app/create">Create Your First Book</Link>
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
    draft: "bg-muted text-muted-foreground",
    generating: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
    partial: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
    ready: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
    failed: "bg-red-500/15 text-red-600 dark:text-red-400",
    expired: "bg-muted text-muted-foreground",
  }[project.status] || "bg-muted text-muted-foreground";

  const href = project.status === "ready" 
    ? `/app/projects/${project.id}`
    : `/app/create?projectId=${project.id}`;

  return (
    <Link href={href} className="group block">
      <Card className="border-0 bg-card/60 backdrop-blur-sm shadow-soft hover:bg-card/80 hover:shadow-card-hover transition-all duration-300 overflow-hidden">
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                {project.name || "Untitled Project"}
              </h3>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <span className={cn("text-xs font-medium px-2.5 py-1 rounded-full", statusColor)}>
                  {statusLabel}
                </span>
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatTime(project.updated_at)}
                </span>
              </div>
            </div>
            {project.status === "ready" ? (
              <Button size="sm" variant="ghost" className="h-9 w-9 p-0 rounded-xl">
                <Download className="h-4 w-4" />
              </Button>
            ) : project.canResume ? (
              <Button size="sm" variant="ghost" className="h-9 w-9 p-0 rounded-xl">
                <Play className="h-4 w-4" />
              </Button>
            ) : null}
          </div>

          <div className="space-y-2">
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div 
                className={cn(
                  "h-full rounded-full transition-all duration-500",
                  project.status === "ready" ? "bg-emerald-500" : "bg-primary"
                )}
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{project.images_generated_count}/{project.pages_requested} pages</span>
              <span className="font-medium">{progress}%</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
