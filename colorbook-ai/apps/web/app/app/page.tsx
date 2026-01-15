import Link from 'next/link';
import { auth } from '@clerk/nextjs/server';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

type ProjectListItem = {
  id: string;
  title: string;
  theme: string;
  character: string;
  status: string;
  progress?: { ready: number; total: number };
};

async function fetchProjects(): Promise<ProjectListItem[]> {
  const clerkEnabled = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);
  if (!clerkEnabled) return [];
  const { getToken } = await auth();
  const token = await getToken();
  const api = process.env.NEXT_PUBLIC_API_URL;
  if (!api || !token) return [];

  const res = await fetch(`${api}/projects`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (!res.ok) return [];
  return (await res.json()) as ProjectListItem[];
}

export default async function DashboardPage() {
  const projects = await fetchProjects();
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">My Books</h1>
          <p className="mt-1 text-sm text-muted-foreground">Projects, pages, and export status.</p>
        </div>
        <Button asChild>
          <Link href="/app/new">Create New</Link>
        </Button>
      </div>

      {!apiUrl ? (
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="text-base">Connect your API</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Set <span className="font-mono">NEXT_PUBLIC_API_URL</span> in your environment to load projects.
          </CardContent>
        </Card>
      ) : projects.length === 0 ? (
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="text-base">No projects yet</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Create a new book to get started. If your API isn’t connected yet, this dashboard will populate once it is.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {projects.map((p) => (
            <Link key={p.id} href={`/app/projects/${p.id}`}>
              <Card className="rounded-2xl transition hover:shadow-soft">
                <CardHeader>
                  <CardTitle className="text-base">{p.title}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-muted-foreground">
                  <div>
                    {p.theme} • {p.character}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="capitalize">{p.status}</span>
                    {p.progress ? (
                      <span>
                        {p.progress.ready}/{p.progress.total} ready
                      </span>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {/* lightweight skeleton block to establish the pattern */}
      <div className="grid gap-4 md:grid-cols-3">
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
      </div>
    </div>
  );
}


