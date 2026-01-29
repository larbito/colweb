"use client";

import Link from "next/link";
import { mockUser } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/app/user-avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { User, Settings, LogOut, ChevronsUpDown, Crown } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function UserMenu() {
  const planColors = {
    free: "bg-muted text-muted-foreground",
    creator: "bg-gradient-to-r from-violet-500 to-purple-500 text-white border-0",
    pro: "bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0",
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="h-auto w-full justify-start gap-3 px-3 py-3 hover:bg-muted/80 rounded-xl transition-colors"
        >
          <UserAvatar
            name={mockUser.name}
            initials={mockUser.avatarInitials}
            avatarUrl={mockUser.avatarUrl}
            size="md"
          />
          <div className="flex-1 text-left min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold truncate">{mockUser.name}</p>
              {mockUser.plan !== "free" && (
                <Crown className="h-3.5 w-3.5 text-amber-500 shrink-0" />
              )}
            </div>
            <p className="text-xs text-muted-foreground truncate">{mockUser.email}</p>
          </div>
          <ChevronsUpDown className="h-4 w-4 text-muted-foreground shrink-0" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64 p-2">
        {/* User info header */}
        <div className="flex items-center gap-3 px-2 py-3 mb-2 bg-muted/50 rounded-lg">
          <UserAvatar
            name={mockUser.name}
            initials={mockUser.avatarInitials}
            avatarUrl={mockUser.avatarUrl}
            size="lg"
          />
          <div className="flex-1 min-w-0">
            <p className="font-semibold truncate">{mockUser.name}</p>
            <p className="text-xs text-muted-foreground truncate">{mockUser.email}</p>
            <Badge className={`mt-1.5 text-[10px] capitalize ${planColors[mockUser.plan]}`}>
              {mockUser.plan} Plan
            </Badge>
          </div>
        </div>
        
        <DropdownMenuItem asChild className="rounded-lg cursor-pointer">
          <Link href="/app/profile" className="flex items-center gap-2 py-2">
            <User className="h-4 w-4" /> Profile
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild className="rounded-lg cursor-pointer">
          <Link href="/app/settings" className="flex items-center gap-2 py-2">
            <Settings className="h-4 w-4" /> Settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator className="my-2" />
        <DropdownMenuItem asChild className="rounded-lg cursor-pointer">
          <Link href="/auth" className="flex items-center gap-2 py-2 text-destructive focus:text-destructive">
            <LogOut className="h-4 w-4" /> Sign Out
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
