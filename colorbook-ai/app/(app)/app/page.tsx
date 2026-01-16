import Link from "next/link";
import { AppTopbar } from "@/components/app-topbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Sparkles } from "lucide-react";

const mockProjects = [
  { title: "Forest Friends Adventure", size: "8.5×11", pages: 32, status: "Draft" },
  { title: "Tiny Robots at Play", size: "8×10", pages: 24, status: "Ready" },
  { title: "Ocean Calm Patterns", size: "A4", pages: 40, status: "Generating" },
];

export default function DashboardPage() {
  return (
    <div className="min-h-screen">
      <AppTopbar title="My Books" description="Manage your projects and export ready-to-print PDFs." />
      <div className="container py-10 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Recent projects</h2>
          <Button asChild className="rounded-2xl">
            <Link href="/app/new">Create New</Link>
          </Button>
        </div>

        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {mockProjects.map((project) => (
            <Card key={project.title} className="rounded-2xl">
              <CardHeader className="space-y-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{project.title}</CardTitle>
                  <Badge variant="secondary">{project.status}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {project.size} · {project.pages} pages
                </p>
              </CardHeader>
              <CardContent className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Sparkles className="h-4 w-4" />
                  KDP ready
                </div>
                  <Button variant="outline" className="rounded-2xl" asChild>
                    <Link href="/app/projects/preview">Open</Link>
                  </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>

        <Card className="rounded-2xl border-dashed">
          <CardHeader>
            <CardTitle className="text-base">Create your first book</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Start with a trim size and theme, then we’ll guide you through prompts and generation.
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

