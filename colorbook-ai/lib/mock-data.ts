// Mock data for the app dashboard - replace with API calls later

export type ProjectStatus = "draft" | "generating" | "ready" | "exported";
export type PageStatus = "pending" | "generating" | "ready" | "failed";

export interface ProjectPage {
  id: string;
  pageNumber: number;
  prompt: string;
  status: PageStatus;
  imageUrl?: string;
  updatedAt: string;
}

export interface Project {
  id: string;
  title: string;
  trimSize: string;
  complexity: "simple" | "medium" | "detailed";
  lineThickness: "thin" | "medium" | "bold";
  theme: string;
  character: string;
  status: ProjectStatus;
  pages: ProjectPage[];
  createdAt: string;
  updatedAt: string;
}

export interface ActivityItem {
  id: string;
  type: "page_generated" | "prompt_edited" | "exported" | "project_created";
  projectId: string;
  projectTitle: string;
  description: string;
  timestamp: string;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatarInitials: string;
  avatarUrl?: string;
  plan: "free" | "creator" | "pro";
  createdAt: string;
}

// Mock user
export const mockUser: UserProfile = {
  id: "user_1",
  name: "Alex Johnson",
  email: "alex@example.com",
  avatarInitials: "AJ",
  avatarUrl: undefined, // Set to a URL string if user has uploaded an avatar
  plan: "creator",
  createdAt: "2024-01-01",
};

// Mock projects
export const mockProjects: Project[] = [
  {
    id: "proj_1",
    title: "Panda's Forest Adventure",
    trimSize: "8.5×11",
    complexity: "medium",
    lineThickness: "medium",
    theme: "forest adventure",
    character: "curious panda cub named Bamboo",
    status: "ready",
    pages: [
      { id: "p1", pageNumber: 1, prompt: "Bamboo the panda waking up in a cozy bamboo grove", status: "ready", imageUrl: "/preview-coloring-page.png", updatedAt: "2024-01-15" },
      { id: "p2", pageNumber: 2, prompt: "Bamboo meeting a friendly butterfly", status: "ready", imageUrl: "/preview-coloring-page.png", updatedAt: "2024-01-15" },
      { id: "p3", pageNumber: 3, prompt: "Bamboo exploring a sparkling stream", status: "ready", updatedAt: "2024-01-15" },
      { id: "p4", pageNumber: 4, prompt: "Bamboo finding a hidden waterfall", status: "generating", updatedAt: "2024-01-15" },
      { id: "p5", pageNumber: 5, prompt: "Bamboo making friends with forest animals", status: "pending", updatedAt: "2024-01-15" },
      { id: "p6", pageNumber: 6, prompt: "Bamboo returning home at sunset", status: "pending", updatedAt: "2024-01-15" },
    ],
    createdAt: "2024-01-10",
    updatedAt: "2024-01-15",
  },
  {
    id: "proj_2",
    title: "Ocean Wonders",
    trimSize: "8×10",
    complexity: "detailed",
    lineThickness: "thin",
    theme: "underwater exploration",
    character: "friendly dolphin named Splash",
    status: "generating",
    pages: [
      { id: "p7", pageNumber: 1, prompt: "Splash swimming through coral reef", status: "ready", updatedAt: "2024-01-14" },
      { id: "p8", pageNumber: 2, prompt: "Splash meeting a sea turtle", status: "generating", updatedAt: "2024-01-14" },
      { id: "p9", pageNumber: 3, prompt: "Exploring a sunken treasure chest", status: "pending", updatedAt: "2024-01-14" },
    ],
    createdAt: "2024-01-12",
    updatedAt: "2024-01-14",
  },
  {
    id: "proj_3",
    title: "Dino Discovery",
    trimSize: "6×9",
    complexity: "simple",
    lineThickness: "bold",
    theme: "prehistoric fun",
    character: "baby T-Rex named Rex",
    status: "draft",
    pages: [],
    createdAt: "2024-01-14",
    updatedAt: "2024-01-14",
  },
  {
    id: "proj_4",
    title: "Space Explorers",
    trimSize: "8.5×11",
    complexity: "medium",
    lineThickness: "medium",
    theme: "space adventure",
    character: "astronaut cat named Cosmo",
    status: "exported",
    pages: [
      { id: "p10", pageNumber: 1, prompt: "Cosmo launching into space", status: "ready", imageUrl: "/preview-coloring-page.png", updatedAt: "2024-01-08" },
      { id: "p11", pageNumber: 2, prompt: "Cosmo floating past planets", status: "ready", imageUrl: "/preview-coloring-page.png", updatedAt: "2024-01-08" },
      { id: "p12", pageNumber: 3, prompt: "Cosmo meeting friendly aliens", status: "ready", imageUrl: "/preview-coloring-page.png", updatedAt: "2024-01-08" },
      { id: "p13", pageNumber: 4, prompt: "Cosmo on the moon", status: "ready", imageUrl: "/preview-coloring-page.png", updatedAt: "2024-01-08" },
    ],
    createdAt: "2024-01-05",
    updatedAt: "2024-01-08",
  },
];

// Mock activity
export const mockActivity: ActivityItem[] = [
  { id: "a1", type: "page_generated", projectId: "proj_1", projectTitle: "Panda's Forest Adventure", description: "Generated page 3 of 6", timestamp: "2024-01-15T14:30:00" },
  { id: "a2", type: "prompt_edited", projectId: "proj_2", projectTitle: "Ocean Wonders", description: "Edited prompt for page 2", timestamp: "2024-01-15T12:15:00" },
  { id: "a3", type: "exported", projectId: "proj_4", projectTitle: "Space Explorers", description: "Exported print-ready PDF", timestamp: "2024-01-08T16:45:00" },
  { id: "a4", type: "project_created", projectId: "proj_3", projectTitle: "Dino Discovery", description: "Created new project", timestamp: "2024-01-14T09:00:00" },
  { id: "a5", type: "page_generated", projectId: "proj_4", projectTitle: "Space Explorers", description: "Generated all 4 pages", timestamp: "2024-01-08T15:30:00" },
];

// Helper functions
export function getProjectById(id: string): Project | undefined {
  return mockProjects.find((p) => p.id === id);
}

export function getRecentProjects(count: number = 5): Project[] {
  return [...mockProjects]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, count);
}

export function getStats() {
  const totalProjects = mockProjects.length;
  const totalPages = mockProjects.reduce((sum, p) => sum + p.pages.length, 0);
  const readyPages = mockProjects.reduce(
    (sum, p) => sum + p.pages.filter((page) => page.status === "ready").length,
    0
  );
  const exports = mockProjects.filter((p) => p.status === "exported").length;

  return { totalProjects, totalPages, readyPages, exports };
}

export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(dateString);
}

// Avatar helper - generates gradient based on initials
export function getAvatarGradient(initials: string): string {
  const colors = [
    "from-violet-500 to-purple-600",
    "from-blue-500 to-cyan-500",
    "from-pink-500 to-rose-500",
    "from-amber-500 to-orange-500",
    "from-emerald-500 to-teal-500",
    "from-indigo-500 to-violet-500",
  ];
  const index = initials.charCodeAt(0) % colors.length;
  return colors[index];
}
