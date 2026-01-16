"use client";

import Link from "next/link";
import { AppTopbar } from "@/components/app/app-topbar";
import { QuickActionCard } from "@/components/app/quick-action-card";
import { StatCard } from "@/components/app/stat-card";
import { ProjectCard } from "@/components/app/project-card";
import { ActivityFeed } from "@/components/app/activity-feed";
import { EmptyState } from "@/components/app/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { mockUser, getRecentProjects, getStats } from "@/lib/mock-data";
import { Sparkles, Pencil, FileText, FolderOpen, Image, Download, ArrowRight } from "lucide-react";

export default function DashboardPage() {
  const recentProjects = getRecentProjects(4);
  const stats = getStats();

  return (
    <>
      <AppTopbar title="Dashboard" />

      <main className="p-4 lg:p-6">
        <div className="mx-auto max-w-6xl space-y-8">
          {/* Welcome Header */}
          <section>
            <h2 className="text-2xl font-semibold tracking-tight">
              Welcome back, {mockUser.name.split(" ")[0]} 👋
            </h2>
            <p className="text-muted-foreground">
              Create a new book or continue where you left off.
            </p>
          </section>

          {/* Quick Actions */}
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <QuickActionCard
              emoji="✨"
              title="New Book (Story Mode)"
              description="Generate a full coloring book with AI-powered story prompts."
              href="/app/new"
              icon={Sparkles}
            />
            <QuickActionCard
              emoji="🖍️"
              title="Single Page Generator"
              description="Generate individual coloring pages without a full book."
              href="/app/new?mode=single"
              icon={Pencil}
            />
            <QuickActionCard
              emoji="📄"
              title="Export PDF"
              description="Export your ready projects as print-ready PDFs."
              href="/app/projects"
              icon={FileText}
            />
          </section>

          {/* Stats */}
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard icon={FolderOpen} label="Total Projects" value={stats.totalProjects} />
            <StatCard icon={Image} label="Pages Generated" value={stats.totalPages} />
            <StatCard
              icon={Image}
              label="Pages Ready"
              value={stats.readyPages}
              sublabel={`of ${stats.totalPages}`}
            />
            <StatCard icon={Download} label="Exports Created" value={stats.exports} />
          </section>

          {/* Main Grid */}
          <section className="grid gap-6 lg:grid-cols-3">
            {/* Recent Projects */}
            <div className="lg:col-span-2">
              <Card className="border-border/50 bg-card/60 backdrop-blur">
                <CardHeader className="flex-row items-center justify-between pb-3">
                  <CardTitle className="text-base font-semibold">Recent Projects</CardTitle>
                  <Button asChild variant="ghost" size="sm">
                    <Link href="/app/projects">
                      View all <ArrowRight className="ml-1 h-3 w-3" />
                    </Link>
                  </Button>
                </CardHeader>
                <CardContent>
                  {recentProjects.length === 0 ? (
                    <EmptyState
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

            {/* Activity Feed */}
            <div>
              <ActivityFeed limit={6} />
            </div>
          </section>
        </div>
      </main>
    </>
  );
}
