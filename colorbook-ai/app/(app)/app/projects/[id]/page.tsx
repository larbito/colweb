import { AppTopbar } from "@/components/app-topbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const pages = Array.from({ length: 6 }).map((_, idx) => ({
  id: idx + 1,
  status: idx % 3 === 0 ? "Ready" : "Queued",
}));

export default function ProjectDetailPage() {
  return (
    <div className="min-h-screen">
      <AppTopbar title="Panda Daily Life" description="Project overview and export options." />
      <div className="container py-10 space-y-6">
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="text-base">Project summary</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 text-sm text-muted-foreground md:grid-cols-4">
            <div>
              <p className="text-xs uppercase">Trim size</p>
              <p className="text-foreground">8.5×11</p>
            </div>
            <div>
              <p className="text-xs uppercase">Complexity</p>
              <p className="text-foreground">Kids</p>
            </div>
            <div>
              <p className="text-xs uppercase">Line thickness</p>
              <p className="text-foreground">Medium</p>
            </div>
            <div>
              <p className="text-xs uppercase">Created</p>
              <p className="text-foreground">Jan 16, 2026</p>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="pages">
          <TabsList>
            <TabsTrigger value="pages">Pages</TabsTrigger>
            <TabsTrigger value="export">Export</TabsTrigger>
          </TabsList>

          <TabsContent value="pages">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {pages.map((page) => (
                <Card key={page.id} className="rounded-2xl">
                  <CardHeader className="space-y-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">Page {page.id}</CardTitle>
                      <Badge variant="secondary">{page.status}</Badge>
                    </div>
                    <div className="h-32 rounded-xl border border-dashed border-border bg-muted/40" />
                  </CardHeader>
                  <CardContent className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Button variant="outline" className="rounded-2xl">
                        Edit prompt
                      </Button>
                      <Button variant="secondary" className="rounded-2xl">
                        Regenerate
                      </Button>
                    </div>
                    <Button className="rounded-2xl">Approve</Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="export">
            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle className="text-base">Export options</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-muted-foreground">
                <div className="flex items-center justify-between rounded-2xl border px-4 py-3">
                  <span>Insert blank pages</span>
                  <Badge variant="secondary">Off</Badge>
                </div>
                <div className="flex items-center justify-between rounded-2xl border px-4 py-3">
                  <span>Page numbers</span>
                  <Badge variant="secondary">On</Badge>
                </div>
                <div className="flex items-center justify-between rounded-2xl border px-4 py-3">
                  <span>Copyright page</span>
                  <Badge variant="secondary">On</Badge>
                </div>
                <Separator />
                <Button className="w-full rounded-2xl">Export PDF</Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

