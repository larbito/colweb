"use client";

import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { UserAvatar } from "@/components/app/user-avatar";
import { mockUser, getStats } from "@/lib/mock-data";
import { User, Mail, CreditCard, Shield, Save, Camera, Sparkles, Upload, Crown } from "lucide-react";
import { toast } from "sonner";

export default function ProfilePage() {
  const stats = getStats();
  const [avatarPreview, setAvatarPreview] = useState<string | undefined>(mockUser.avatarUrl);

  const handleSave = () => {
    toast.success("Profile updated successfully");
  };

  const handleAvatarUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setAvatarPreview(reader.result as string);
      toast.success("Avatar updated! Click Save to confirm.");
    };
    reader.readAsDataURL(file);
  }, []);

  const planColors = {
    free: "bg-muted text-muted-foreground",
    creator: "bg-gradient-to-r from-violet-500 to-purple-500 text-white border-0",
    pro: "bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0",
  };

  return (
    <>
      {/* Page Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="mx-auto max-w-3xl px-6 py-6">
          <h1 className="text-2xl font-semibold tracking-tight">Profile</h1>
          <p className="text-sm text-muted-foreground">Manage your account settings and preferences</p>
        </div>
      </header>

      <main className="py-8 px-6">
        <div className="mx-auto max-w-3xl space-y-6">
          {/* Profile Header Card */}
          <Card className="overflow-hidden">
            {/* Gradient banner */}
            <div className="h-24 bg-gradient-to-r from-violet-500 via-purple-500 to-pink-500" />
            
            <CardContent className="relative px-6 pb-6">
              {/* Avatar */}
              <div className="absolute -top-12 left-6">
                <div className="relative group">
                  <UserAvatar
                    name={mockUser.name}
                    initials={mockUser.avatarInitials}
                    avatarUrl={avatarPreview}
                    size="xl"
                    className="ring-4 ring-background"
                  />
                  <label className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                    <Camera className="h-6 w-6 text-white" />
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {/* User info */}
              <div className="pt-12 flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <h2 className="text-xl font-bold">{mockUser.name}</h2>
                    {mockUser.plan !== "free" && (
                      <Crown className="h-5 w-5 text-amber-500" />
                    )}
                  </div>
                  <p className="text-muted-foreground">{mockUser.email}</p>
                  <div className="flex items-center gap-3 mt-3">
                    <Badge className={`capitalize ${planColors[mockUser.plan]}`}>
                      {mockUser.plan} Plan
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      Member since {new Date(mockUser.createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                    </span>
                  </div>
                </div>
                {mockUser.plan === "free" && (
                  <Button className="gradient-primary border-0 text-white rounded-xl">
                    <Sparkles className="mr-2 h-4 w-4" />
                    Upgrade
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Usage Stats */}
          <div className="grid gap-4 sm:grid-cols-3">
            <Card className="text-center hover-lift">
              <CardContent className="pt-6">
                <p className="text-4xl font-bold bg-gradient-to-br from-violet-500 to-purple-600 bg-clip-text text-transparent">
                  {stats.totalProjects}
                </p>
                <p className="text-sm text-muted-foreground mt-1">Projects</p>
              </CardContent>
            </Card>
            <Card className="text-center hover-lift">
              <CardContent className="pt-6">
                <p className="text-4xl font-bold bg-gradient-to-br from-blue-500 to-cyan-500 bg-clip-text text-transparent">
                  {stats.totalPages}
                </p>
                <p className="text-sm text-muted-foreground mt-1">Pages Generated</p>
              </CardContent>
            </Card>
            <Card className="text-center hover-lift">
              <CardContent className="pt-6">
                <p className="text-4xl font-bold bg-gradient-to-br from-green-500 to-emerald-500 bg-clip-text text-transparent">
                  {stats.exports}
                </p>
                <p className="text-sm text-muted-foreground mt-1">Exports</p>
              </CardContent>
            </Card>
          </div>

          {/* Account Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <User className="h-5 w-5 text-primary" />
                Account Information
              </CardTitle>
              <CardDescription>Update your personal details</CardDescription>
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
              <Button onClick={handleSave} className="rounded-xl gradient-primary border-0 text-white">
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </Button>
            </CardContent>
          </Card>

          {/* Billing */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <CreditCard className="h-5 w-5 text-primary" />
                Subscription & Billing
              </CardTitle>
              <CardDescription>Manage your subscription and payment methods</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between rounded-xl border bg-muted/30 p-5">
                <div className="flex items-center gap-4">
                  <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${
                    mockUser.plan === "free" ? "bg-muted" : "gradient-primary"
                  }`}>
                    <Crown className={`h-6 w-6 ${mockUser.plan === "free" ? "text-muted-foreground" : "text-white"}`} />
                  </div>
                  <div>
                    <p className="font-semibold capitalize">{mockUser.plan} Plan</p>
                    <p className="text-sm text-muted-foreground">
                      {mockUser.plan === "free" 
                        ? "Limited features available" 
                        : "Full access to all features"}
                    </p>
                  </div>
                </div>
                <Button variant={mockUser.plan === "free" ? "default" : "outline"} className="rounded-xl">
                  {mockUser.plan === "free" ? "Upgrade Now" : "Manage Plan"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Security */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Shield className="h-5 w-5 text-primary" />
                Security
              </CardTitle>
              <CardDescription>Manage your account security settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button variant="outline" className="rounded-xl w-full sm:w-auto justify-start">
                Change Password
              </Button>
              <Button variant="outline" className="rounded-xl w-full sm:w-auto justify-start text-destructive hover:text-destructive">
                Sign Out Everywhere
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    </>
  );
}
