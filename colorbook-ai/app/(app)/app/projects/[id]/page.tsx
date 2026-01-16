"use client";

import { use, useState } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AppTopbar } from "@/components/app/app-topbar";
import { StatusPill } from "@/components/app/status-pill";
import { ProgressBar } from "@/components/app/progress-bar";
import { PageTable } from "@/components/app/page-table";
import { PromptEditor } from "@/components/app/prompt-editor";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { getProjectById, formatDate } from "@/lib/mock-data";
import { ArrowLeft, Download, Play, Settings, Trash2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

interface Props {
  params: Promise<{ id: string }>;
}

export default function ProjectDetailPage({ params }: Props) {
  const { id } = use(params);
  const project = getProjectById(id);
  const [exportOptions, setExportOptions] = useState({
    blankPages: false,
    pageNumbers: true,
    copyrightPage: true,
  });

  if (!project) {
    notFound();
  }

  const readyPages = project.pages.filter((p) => p.status === "ready").length;
  const totalPages = project.pages.length;

  const handleExport = () => {
    toast.success("Export started! Your PDF will be ready soon.");
  };

  const handleDelete = () => {
    toast.error("Project deleted (demo)");
  };

  return (
    <>
      <AppTopbar title={project.title} subtitle={`${totalPages} pages • ${project.trimSize}`} />

      <main className="p-4 lg:p-6">
        <div className="mx-auto max-w-5xl space-y-6">
          {/* Back link */}
          <Button asChild variant="ghost" size="sm" className="gap-2">
            <Link href="/app/projects">
              <ArrowLeft className="h-4 w-4" />
              Back to Projects
            </Link>
          </Button>

          {/* Summary Strip */}
          <Card className="border-border/50 bg-card/60 backdrop-blur">
            <CardContent className="flex flex-wrap items-center gap-4 p-5 sm:gap-6">
              <div>
                <p className="text-xs text-muted-foreground">Status</p>
                <StatusPill status={project.status} size="md" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Size</p>
                <Badge variant="secondary">{project.trimSize}</Badge>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Complexity</p>
                <p className="text-sm font-medium capitalize">{project.complexity}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Line Style</p>
                <p className="text-sm font-medium capitalize">{project.lineThickness}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Created</p>
                <p className="text-sm font-medium">{formatDate(project.createdAt)}</p>
              </div>
              {totalPages > 0 && (
                <div className="flex-1">
                  <p className="mb-1 text-xs text-muted-foreground">Progress</p>
                  <ProgressBar value={readyPages} max={totalPages} showLabel />
                </div>
              )}
              <div className="flex gap-2">
                <Button size="sm" className="rounded-xl" onClick={() => toast.success("Generating...")}>
                  <Play className="mr-1.5 h-4 w-4" />
                  Generate
                </Button>
                <Button size="sm" variant="outline" className="rounded-xl" onClick={handleExport}>
                  <Download className="mr-1.5 h-4 w-4" />
                  Export
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Tabs */}
          <Tabs defaultValue="pages" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4 rounded-xl bg-muted p-1">
              <TabsTrigger value="pages" className="rounded-lg">Pages</TabsTrigger>
              <TabsTrigger value="prompts" className="rounded-lg">Prompts</TabsTrigger>
              <TabsTrigger value="export" className="rounded-lg">Export</TabsTrigger>
              <TabsTrigger value="settings" className="rounded-lg">Settings</TabsTrigger>
            </TabsList>

            {/* Pages Tab */}
            <TabsContent value="pages" className="space-y-4">
              <PageTable pages={project.pages} />
            </TabsContent>

            {/* Prompts Tab */}
            <TabsContent value="prompts" className="space-y-4">
              <PromptEditor pages={project.pages} />
            </TabsContent>

            {/* Export Tab */}
            <TabsContent value="export" className="space-y-4">
              <Card className="border-border/50 bg-card/60">
                <CardHeader>
                  <CardTitle className="text-lg">Export Options</CardTitle>
                  <CardDescription>Configure your PDF export settings</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Add blank page between designs</p>
                      <p className="text-sm text-muted-foreground">Insert blank pages for double-sided printing</p>
                    </div>
                    <Switch
                      checked={exportOptions.blankPages}
                      onCheckedChange={(v) => setExportOptions({ ...exportOptions, blankPages: v })}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Page numbering</p>
                      <p className="text-sm text-muted-foreground">Add page numbers to the footer</p>
                    </div>
                    <Switch
                      checked={exportOptions.pageNumbers}
                      onCheckedChange={(v) => setExportOptions({ ...exportOptions, pageNumbers: v })}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Include copyright page</p>
                      <p className="text-sm text-muted-foreground">Add a copyright notice at the beginning</p>
                    </div>
                    <Switch
                      checked={exportOptions.copyrightPage}
                      onCheckedChange={(v) => setExportOptions({ ...exportOptions, copyrightPage: v })}
                    />
                  </div>

                  <Button onClick={handleExport} className="w-full rounded-xl" size="lg">
                    <Download className="mr-2 h-4 w-4" />
                    Export Print-Ready PDF
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Settings Tab */}
            <TabsContent value="settings" className="space-y-4">
              <Card className="border-border/50 bg-card/60">
                <CardHeader>
                  <CardTitle className="text-lg">Project Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <label className="mb-2 block text-sm font-medium">Project Name</label>
                    <Input defaultValue={project.title} className="rounded-xl" />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium">Trim Size</label>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{project.trimSize}</Badge>
                      <span className="text-xs text-muted-foreground">
                        ⚠️ Changing size may require regenerating pages
                      </span>
                    </div>
                  </div>
                  <Button variant="outline" className="rounded-xl" onClick={() => toast.success("Settings saved")}>
                    <Settings className="mr-2 h-4 w-4" />
                    Save Changes
                  </Button>
                </CardContent>
              </Card>

              {/* Danger Zone */}
              <Card className="border-destructive/50 bg-destructive/5">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg text-destructive">
                    <AlertTriangle className="h-5 w-5" />
                    Danger Zone
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="mb-4 text-sm text-muted-foreground">
                    Once you delete a project, there is no going back. Please be certain.
                  </p>
                  <Button variant="destructive" className="rounded-xl" onClick={handleDelete}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Project
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </>
  );
}
