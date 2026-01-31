"use client";

import { AppTopbar } from "@/components/app/app-topbar";
import { PageHeader } from "@/components/app/page-header";
import { SectionCard, SubSection } from "@/components/app/section-card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Settings, 
  Palette, 
  Bell, 
  AlertTriangle, 
  Trash2, 
  User,
  CreditCard,
  Shield,
  Download,
  Key,
  Save,
} from "lucide-react";
import { toast } from "sonner";
import { ThemeToggle } from "@/components/theme-toggle";

export default function SettingsPage() {
  const handleDelete = () => {
    toast.error("This action is not available in the demo");
  };

  const handleSave = () => {
    toast.success("Settings saved");
  };

  return (
    <>
      <AppTopbar title="Settings" />

      <main className="p-4 lg:p-6">
        <div className="mx-auto max-w-3xl space-y-6">
          <PageHeader
            title="Settings"
            subtitle="Manage your account and preferences"
            icon={Settings}
          />

          {/* Profile */}
          <SectionCard
            title="Profile"
            description="Your personal information"
            icon={User}
            iconColor="text-blue-500"
            iconBg="bg-blue-500/10"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <SubSection title="Display Name">
                <Input placeholder="Your name" defaultValue="Demo User" />
              </SubSection>
              <SubSection title="Email">
                <Input type="email" placeholder="your@email.com" defaultValue="demo@colorbook.ai" disabled />
              </SubSection>
            </div>
            <div className="pt-4 border-t flex justify-end">
              <Button onClick={handleSave}>
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </Button>
            </div>
          </SectionCard>

          {/* Appearance */}
          <SectionCard
            title="Appearance"
            description="Customize how ColorBook AI looks"
            icon={Palette}
            iconColor="text-purple-500"
            iconBg="bg-purple-500/10"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">Theme</p>
                <p className="text-xs text-muted-foreground">
                  Switch between light and dark mode
                </p>
              </div>
              <ThemeToggle />
            </div>
          </SectionCard>

          {/* Notifications */}
          <SectionCard
            title="Notifications"
            description="Manage your notification preferences"
            icon={Bell}
            iconColor="text-amber-500"
            iconBg="bg-amber-500/10"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">Email notifications</p>
                  <p className="text-xs text-muted-foreground">
                    Receive updates about your projects
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">Marketing emails</p>
                  <p className="text-xs text-muted-foreground">
                    Tips, features, and product updates
                  </p>
                </div>
                <Switch />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">Generation complete alerts</p>
                  <p className="text-xs text-muted-foreground">
                    Browser notifications when jobs finish
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
            </div>
          </SectionCard>

          {/* Subscription */}
          <SectionCard
            title="Subscription"
            description="Manage your plan and billing"
            icon={CreditCard}
            iconColor="text-emerald-500"
            iconBg="bg-emerald-500/10"
            badge="Pro"
          >
            <div className="flex items-center justify-between p-4 rounded-xl border bg-muted/30">
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-medium">Pro Plan</p>
                  <Badge variant="secondary" className="text-xs">Active</Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Unlimited books • HD exports • Priority support
                </p>
              </div>
              <Button variant="outline" size="sm">
                Manage Plan
              </Button>
            </div>
          </SectionCard>

          {/* Data & Privacy */}
          <SectionCard
            title="Data & Privacy"
            description="Control your data and exports"
            icon={Shield}
            iconColor="text-slate-500"
            iconBg="bg-slate-500/10"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">Export all data</p>
                  <p className="text-xs text-muted-foreground">
                    Download all your projects and settings
                  </p>
                </div>
                <Button variant="outline" size="sm">
                  <Download className="mr-2 h-4 w-4" />
                  Export
                </Button>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">API keys</p>
                  <p className="text-xs text-muted-foreground">
                    Manage your API access tokens
                  </p>
                </div>
                <Button variant="outline" size="sm">
                  <Key className="mr-2 h-4 w-4" />
                  Manage
                </Button>
              </div>
            </div>
          </SectionCard>

          {/* Danger Zone */}
          <SectionCard
            title="Danger Zone"
            description="Irreversible and destructive actions"
            icon={AlertTriangle}
            iconColor="text-destructive"
            iconBg="bg-destructive/10"
            className="border-destructive/30"
          >
            <div className="flex items-center justify-between rounded-xl border border-destructive/30 bg-destructive/5 p-4">
              <div>
                <p className="font-medium text-sm">Delete Account</p>
                <p className="text-xs text-muted-foreground">
                  Permanently delete your account and all data
                </p>
              </div>
              <Button variant="destructive" size="sm" onClick={handleDelete}>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Account
              </Button>
            </div>
          </SectionCard>
        </div>
      </main>
    </>
  );
}
