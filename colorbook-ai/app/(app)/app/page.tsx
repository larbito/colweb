"use client";

import Link from "next/link";
import { AppTopbar } from "@/components/app/app-topbar";
import { PageHeader } from "@/components/app/page-header";
import { ProjectCard } from "@/components/app/project-card";
import { EmptyState } from "@/components/app/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { mockUser, getRecentProjects, getStats } from "@/lib/mock-data";
import { 
  Sparkles, 
  Quote, 
  Boxes, 
  Copy, 
  FolderOpen, 
  Image, 
  Download, 
  ArrowRight,
  TrendingUp,
  Lightbulb,
  BookOpen,
  Zap,
  LayoutDashboard,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Quick action card component
interface QuickActionProps {
  icon: React.ElementType;
  title: string;
  description: string;
  href: string;
  badge?: string;
  gradient?: string;
}

function QuickAction({ icon: Icon, title, description, href, badge, gradient }: QuickActionProps) {
  return (
    <Link href={href} className="group">
      <Card className="h-full border-border/50 bg-card/60 backdrop-blur transition-all duration-200 hover:border-primary/20 hover:shadow-lg hover:shadow-primary/5">
        <CardContent className="p-5">
          <div className="flex items-start gap-4">
            <div className={cn(
              "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-110",
              gradient || "bg-primary/10 text-primary"
            )}>
              <Icon className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                  {title}
                </h3>
                {badge && (
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                    {badge}
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">
                {description}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

// Stat card component
interface StatCardProps {
  icon: React.ElementType;
  label: string;
  value: number | string;
  trend?: string;
  trendUp?: boolean;
}

function StatCard({ icon: Icon, label, value, trend, trendUp }: StatCardProps) {
  return (
    <Card className="border-border/50 bg-card/60 backdrop-blur">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
            <Icon className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground truncate">{label}</p>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold tracking-tight">{value}</span>
              {trend && (
                <span className={cn(
                  "text-xs font-medium",
                  trendUp ? "text-emerald-500" : "text-muted-foreground"
                )}>
                  {trend}
                </span>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const recentProjects = getRecentProjects(4);
  const stats = getStats();

  return (
    <>
      <AppTopbar showSearch />

      <main className="p-4 lg:p-6">
        <div className="mx-auto max-w-6xl space-y-8">
          {/* Welcome Section */}
          <section className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5">
                <LayoutDashboard className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-semibold tracking-tight">
                  Welcome back, {mockUser.name.split(" ")[0]}
                </h1>
                <p className="text-muted-foreground">
                  Create beautiful coloring books with AI assistance
                </p>
              </div>
            </div>
          </section>

          {/* Quick Actions */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Quick Actions</h2>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/app/new" className="text-primary">
                  View all tools
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 stagger-children">
              <QuickAction
                icon={Sparkles}
                title="Coloring Book"
                description="Create a full coloring book with AI"
                href="/app/create"
                gradient="bg-violet-500/10 text-violet-500"
              />
              <QuickAction
                icon={Quote}
                title="Quote Book"
                description="Typography-based coloring pages"
                href="/app/quote-book"
                gradient="bg-blue-500/10 text-blue-500"
              />
              <QuickAction
                icon={Boxes}
                title="Bulk Create"
                description="Generate multiple books at once"
                href="/app/bulk"
                badge="New"
                gradient="bg-emerald-500/10 text-emerald-500"
              />
              <QuickAction
                icon={Copy}
                title="Style Clone"
                description="Match your reference art style"
                href="/app/style-clone"
                badge="Beta"
                gradient="bg-orange-500/10 text-orange-500"
              />
            </div>
          </section>

          {/* Stats */}
          <section>
            <h2 className="text-lg font-semibold mb-4">Your Stats</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard 
                icon={FolderOpen} 
                label="Total Projects" 
                value={stats.totalProjects}
                trend="+2 this week"
                trendUp
              />
              <StatCard 
                icon={Image} 
                label="Pages Generated" 
                value={stats.totalPages}
                trend="+12 this week"
                trendUp
              />
              <StatCard 
                icon={Zap} 
                label="Pages Enhanced" 
                value={stats.readyPages}
              />
              <StatCard 
                icon={Download} 
                label="PDFs Exported" 
                value={stats.exports}
              />
            </div>
          </section>

          {/* Main Content Grid */}
          <section className="grid gap-6 lg:grid-cols-3">
            {/* Recent Projects */}
            <div className="lg:col-span-2">
              <Card className="border-border/50 bg-card/60 backdrop-blur">
                <div className="flex items-center justify-between p-5 pb-0">
                  <h2 className="text-lg font-semibold">Recent Projects</h2>
                  <Button asChild variant="ghost" size="sm">
                    <Link href="/app/projects">
                      View all <ArrowRight className="ml-1 h-4 w-4" />
                    </Link>
                  </Button>
                </div>
                <CardContent className="p-5">
                  {recentProjects.length === 0 ? (
                    <EmptyState
                      icon={FolderOpen}
                      title="No projects yet"
                      description="Create your first coloring book to get started."
                      actionLabel="Create Book"
                      actionHref="/app/new"
                    />
                  ) : (
                    <div className="grid gap-4 sm:grid-cols-2">
                      {recentProjects.map((project) => (
                        <ProjectCard key={project.id} project={project} />
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Tips & Help */}
            <div className="space-y-4">
              {/* Tips Card */}
              <Card className="border-border/50 bg-gradient-to-br from-primary/5 to-transparent">
                <CardContent className="p-5">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                      <Lightbulb className="h-4 w-4 text-primary" />
                    </div>
                    <h3 className="font-semibold">Pro Tips</h3>
                  </div>
                  <ul className="space-y-3 text-sm">
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-0.5">•</span>
                      <span className="text-muted-foreground">
                        Use specific character descriptions for consistent storybooks
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-0.5">•</span>
                      <span className="text-muted-foreground">
                        Enhance images before export for print-ready quality
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-0.5">•</span>
                      <span className="text-muted-foreground">
                        Try Bulk Create for faster multi-book production
                      </span>
                    </li>
                  </ul>
                </CardContent>
              </Card>

              {/* Getting Started */}
              <Card className="border-border/50 bg-card/60 backdrop-blur">
                <CardContent className="p-5">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                      <BookOpen className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <h3 className="font-semibold">Getting Started</h3>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">
                    New to ColorBook AI? Learn how to create your first book.
                  </p>
                  <Button variant="outline" size="sm" className="w-full">
                    View Tutorial
                  </Button>
                </CardContent>
              </Card>

              {/* What's New */}
              <Card className="border-border/50 bg-card/60 backdrop-blur">
                <CardContent className="p-5">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10">
                      <TrendingUp className="h-4 w-4 text-emerald-500" />
                    </div>
                    <div>
                      <h3 className="font-semibold">What's New</h3>
                      <Badge variant="secondary" className="text-[10px] mt-0.5">
                        v2.0
                      </Badge>
                    </div>
                  </div>
                  <ul className="space-y-2 text-sm">
                    <li className="text-muted-foreground">• Bulk book creation (10 books at once)</li>
                    <li className="text-muted-foreground">• Style cloning from reference images</li>
                    <li className="text-muted-foreground">• Improved quote book text-only mode</li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </section>
        </div>
      </main>
    </>
  );
}
