import { auth } from '@clerk/nextjs/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type ProjectDetail = {
  id: string;
  title: string;
  theme: string;
  character: string;
  status: string;
  pages: Array<{
    id: string;
    index: number;
    prompt: string;
    status: string;
    latestGeneration: { outputUrl: string | null } | null;
  }>;
};

async function fetchProject(id: string): Promise<ProjectDetail | null> {
  const { getToken } = auth();
  const token = await getToken();
  const api = process.env.NEXT_PUBLIC_API_URL;
  if (!api || !token) return null;

  const res = await fetch(`${api}/projects/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (!res.ok) return null;
  return (await res.json()) as ProjectDetail;
}

export default async function ProjectDetailPage({ params }: { params: { id: string } }) {
  const project = await fetchProject(params.id);

  if (!project) {
    return (
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="text-base">Project not available</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          If your API isn’t connected yet, this will load once it is. Otherwise the project may not exist.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{project.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {project.theme} • {project.character} • <span className="capitalize">{project.status}</span>
        </p>
      </div>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="text-base">Pages</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          {project.pages.length} pages. Generation/review UI comes next.
        </CardContent>
      </Card>
    </div>
  );
}


