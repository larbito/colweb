"use client";

import { AppTopbar } from "@/components/app/app-topbar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { mockUser, getStats } from "@/lib/mock-data";
import { User, Mail, CreditCard, Shield, Save } from "lucide-react";
import { toast } from "sonner";

export default function ProfilePage() {
  const stats = getStats();

  const handleSave = () => {
    toast.success("Profile updated successfully");
  };

  return (
    <>
      <AppTopbar title="Profile" subtitle="Manage your account" />

      <main className="p-4 lg:p-6">
        <div className="mx-auto max-w-3xl space-y-6">
          {/* Profile Header */}
          <Card className="border-border/50 bg-card/60 backdrop-blur">
            <CardContent className="flex items-center gap-6 p-6">
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10 text-2xl font-bold text-primary">
                {mockUser.avatarInitials}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-semibold">{mockUser.name}</h2>
                  <Badge variant="secondary" className="capitalize">
                    {mockUser.plan} Plan
                  </Badge>
                </div>
                <p className="text-muted-foreground">{mockUser.email}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Member since {new Date(mockUser.createdAt).toLocaleDateString()}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Account Info */}
          <Card className="border-border/50 bg-card/60">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <User className="h-5 w-5" />
                Account Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium">Full Name</label>
                  <Input defaultValue={mockUser.name} className="rounded-xl" />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium">Email</label>
                  <Input defaultValue={mockUser.email} type="email" className="rounded-xl" />
                </div>
              </div>
              <Button onClick={handleSave} className="rounded-xl">
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </Button>
            </CardContent>
          </Card>

          {/* Usage Stats */}
          <Card className="border-border/50 bg-card/60">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Mail className="h-5 w-5" />
                Usage
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 sm:grid-cols-3">
                <div className="text-center">
                  <p className="text-3xl font-bold">{stats.totalProjects}</p>
                  <p className="text-sm text-muted-foreground">Projects</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold">{stats.totalPages}</p>
                  <p className="text-sm text-muted-foreground">Pages Generated</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold">{stats.exports}</p>
                  <p className="text-sm text-muted-foreground">Exports</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Billing */}
          <Card className="border-border/50 bg-card/60">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <CreditCard className="h-5 w-5" />
                Billing
              </CardTitle>
              <CardDescription>Manage your subscription and payment methods</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between rounded-xl border border-border bg-muted/30 p-4">
                <div>
                  <p className="font-medium">Current Plan: {mockUser.plan}</p>
                  <p className="text-sm text-muted-foreground">Upgrade for more features</p>
                </div>
                <Button variant="outline" className="rounded-xl">
                  Upgrade Plan
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Security */}
          <Card className="border-border/50 bg-card/60">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Shield className="h-5 w-5" />
                Security
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button variant="outline" className="rounded-xl">
                Change Password
              </Button>
              <Button variant="outline" className="rounded-xl text-destructive hover:text-destructive">
                Sign Out Everywhere
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    </>
  );
}

