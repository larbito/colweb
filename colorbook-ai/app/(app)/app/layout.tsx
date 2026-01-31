import { AppSidebar } from "@/components/app/app-sidebar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar */}
      <AppSidebar />
      
      {/* Main content area - offset by sidebar width */}
      <div className="lg:pl-64 min-h-screen flex flex-col">
        {children}
      </div>
    </div>
  );
}
