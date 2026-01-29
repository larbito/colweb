"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { QuickActionCard } from "@/components/app/quick-action-card";
import { StatCard } from "@/components/app/stat-card";
import { ProjectCard } from "@/components/app/project-card";
import { ActivityFeed } from "@/components/app/activity-feed";
import { EmptyState } from "@/components/app/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { mockUser, getRecentProjects, getStats } from "@/lib/mock-data";
import { Sparkles, Wand2, FileText, FolderOpen, Image, Download, ArrowRight, Plus } from "lucide-react";

export default function DashboardPage() {
  const recentProjects = getRecentProjects(4);
  const stats = getStats();
  const firstName = mockUser.name.split(" ")[0];

  return (
    <>
      {/* Hero Welcome Section */}
      <header className="relative overflow-hidden border-b bg-gradient-to-br from-primary/5 via-background to-accent/5">
        <div className="absolute inset-0 bg-grid opacity-30" />
        <div className="relative mx-auto max-w-6xl px-6 py-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
          >
            <div>
              <h1 className="text-3xl font-bold tracking-tight mb-2">
                Welcome back, {firstName} 👋
              </h1>
              <p className="text-muted-foreground">
                Create a new coloring book or continue where you left off.
              </p>
            </div>
            <Button asChild size="lg" className="rounded-xl gradient-primary border-0 text-white shadow-lg shadow-primary/25">
              <Link href="/app/new">
                <Plus className="mr-2 h-5 w-5" />
                New Project
              </Link>
            </Button>
          </motion.div>
        </div>
      </header>

      <main className="py-8 px-6">
        <div className="mx-auto max-w-6xl space-y-8">
          {/* Quick Actions */}
          <motion.section 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
          >
            <QuickActionCard
              emoji="✨"
              title="New Story Book"
              description="Generate a full coloring book with AI-powered story prompts."
              href="/app/new"
              icon={Sparkles}
              gradient="from-violet-500 to-purple-600"
            />
            <QuickActionCard
              emoji="🎨"
              title="Style Clone"
              description="Clone any coloring page style and generate multiple pages."
              href="/app/batch"
              icon={Wand2}
              gradient="from-pink-500 to-rose-500"
              badge="Popular"
            />
            <QuickActionCard
              emoji="📄"
              title="Export PDF"
              description="Export your ready projects as print-ready PDFs."
              href="/app/projects"
              icon={FileText}
              gradient="from-blue-500 to-cyan-500"
            />
          </motion.section>

          {/* Stats */}
          <motion.section 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
          >
            <StatCard icon={FolderOpen} label="Total Projects" value={stats.totalProjects} color="violet" />
            <StatCard icon={Image} label="Pages Generated" value={stats.totalPages} color="blue" />
            <StatCard
              icon={Image}
              label="Pages Ready"
              value={stats.readyPages}
              sublabel={`of ${stats.totalPages}`}
              color="green"
            />
            <StatCard icon={Download} label="Exports Created" value={stats.exports} color="orange" />
          </motion.section>

          {/* Main Grid */}
          <motion.section 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
            className="grid gap-6 lg:grid-cols-3"
          >
            {/* Recent Projects */}
            <div className="lg:col-span-2">
              <Card className="h-full">
                <CardHeader className="flex-row items-center justify-between pb-4">
                  <CardTitle className="text-lg font-semibold">Recent Projects</CardTitle>
                  <Button asChild variant="ghost" size="sm" className="rounded-lg">
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
                      {recentProjects.map((project, i) => (
                        <motion.div
                          key={project.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3, delay: 0.4 + i * 0.05 }}
                        >
                          <ProjectCard project={project} />
                        </motion.div>
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
          </motion.section>
        </div>
      </main>
    </>
  );
}
