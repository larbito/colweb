import { AppTopbar } from "@/components/app-topbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const steps = ["Size", "Theme", "Style", "Prompts", "Generate"];

export default function NewBookPage() {
  return (
    <div className="min-h-screen">
      <AppTopbar title="Create New Book" description="Set up trim size, style, and prompts before generation." />
      <div className="container py-10 space-y-8">
        <Tabs defaultValue="size">
          <TabsList className="flex flex-wrap gap-2">
            {steps.map((step) => (
              <TabsTrigger key={step} value={step.toLowerCase()}>
                {step}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="size">
            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle className="text-base">Choose trim size</CardTitle>
                <p className="text-sm text-muted-foreground">Pick a KDP-friendly preset to match your target format.</p>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-3">
                {["8.5×11", "8×10", "A4", "8.25×8.25"].map((size) => (
                  <Badge key={size} variant="secondary" className="px-4 py-2 text-sm">
                    {size}
                  </Badge>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="theme">
            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle className="text-base">Theme & character</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Define the story world and main character for the prompt generator.
                </p>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <div className="rounded-2xl border border-border px-4 py-3">
                  Theme: “Panda daily life”
                </div>
                <div className="rounded-2xl border border-border px-4 py-3">
                  Character: “Curious panda cub”
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="style">
            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle className="text-base">Style presets</CardTitle>
                <p className="text-sm text-muted-foreground">Adjust complexity and line thickness for your audience.</p>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-3 text-sm">
                <Badge variant="secondary">Kids · Simple</Badge>
                <Badge variant="secondary">Medium detail</Badge>
                <Badge variant="secondary">Detailed</Badge>
                <Badge variant="secondary">Thin lines</Badge>
                <Badge variant="secondary">Medium lines</Badge>
                <Badge variant="secondary">Bold lines</Badge>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="prompts">
            <Card className="rounded-2xl">
              <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <CardTitle className="text-base">Story prompts</CardTitle>
                  <p className="text-sm text-muted-foreground">Edit prompts before generating line art pages.</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="secondary" className="rounded-2xl">
                    Regenerate prompts
                  </Button>
                  <Button className="rounded-2xl">Continue</Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="hidden md:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[120px]">Page</TableHead>
                        <TableHead>Prompt</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {[1, 2, 3].map((page) => (
                        <TableRow key={page}>
                          <TableCell className="font-medium">{page}</TableCell>
                          <TableCell>
                            Panda exploring a bamboo forest with playful squirrels.
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <div className="space-y-3 md:hidden">
                  {[1, 2, 3].map((page) => (
                    <div key={page} className="rounded-2xl border px-4 py-3 text-sm">
                      <p className="font-medium">Page {page}</p>
                      <p className="text-muted-foreground">
                        Panda exploring a bamboo forest with playful squirrels.
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="generate">
            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle className="text-base">Generation status</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Monitor page generation and resolve any failed jobs.
                </p>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                {[
                  { label: "Queued", value: 6 },
                  { label: "Generating", value: 4 },
                  { label: "Ready", value: 12 },
                  { label: "Failed", value: 1 },
                ].map((status) => (
                  <div key={status.label} className="flex items-center justify-between rounded-2xl border px-4 py-3">
                    <span>{status.label}</span>
                    <Badge variant={status.label === "Failed" ? "destructive" : "secondary"}>{status.value}</Badge>
                  </div>
                ))}
                <Button className="w-full rounded-2xl">Start generation</Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

