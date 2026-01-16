"use client";

import { Button } from "@/components/ui/button";
import { StatusPill } from "./status-pill";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Eye, RefreshCw, Edit, Check, MoreHorizontal, ImageOff } from "lucide-react";
import { formatDate } from "@/lib/mock-data";
import type { ProjectPage } from "@/lib/mock-data";
import { toast } from "sonner";

interface PageTableProps {
  pages: ProjectPage[];
}

export function PageTable({ pages }: PageTableProps) {
  const handleAction = (action: string, pageNum: number) => {
    toast.success(`${action} page ${pageNum}`);
  };

  if (pages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-12 text-center">
        <ImageOff className="mb-3 h-8 w-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">No pages generated yet</p>
        <p className="text-xs text-muted-foreground">Generate prompts first, then generate pages</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-16">#</TableHead>
            <TableHead className="w-20">Preview</TableHead>
            <TableHead>Prompt</TableHead>
            <TableHead className="w-24">Status</TableHead>
            <TableHead className="w-28">Updated</TableHead>
            <TableHead className="w-16"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {pages.map((page) => (
            <TableRow key={page.id}>
              <TableCell className="font-medium">{page.pageNumber}</TableCell>
              <TableCell>
                {page.imageUrl ? (
                  <div className="h-12 w-10 overflow-hidden rounded border border-border bg-white">
                    <img
                      src={page.imageUrl}
                      alt={`Page ${page.pageNumber}`}
                      className="h-full w-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="flex h-12 w-10 items-center justify-center rounded border border-dashed border-border bg-muted/50">
                    <ImageOff className="h-4 w-4 text-muted-foreground" />
                  </div>
                )}
              </TableCell>
              <TableCell>
                <p className="line-clamp-2 text-sm">{page.prompt}</p>
              </TableCell>
              <TableCell>
                <StatusPill status={page.status} />
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {formatDate(page.updatedAt)}
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleAction("View", page.pageNumber)}>
                      <Eye className="mr-2 h-4 w-4" /> View
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleAction("Regenerate", page.pageNumber)}>
                      <RefreshCw className="mr-2 h-4 w-4" /> Regenerate
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleAction("Edit prompt for", page.pageNumber)}>
                      <Edit className="mr-2 h-4 w-4" /> Edit Prompt
                    </DropdownMenuItem>
                    {page.status === "ready" && (
                      <DropdownMenuItem onClick={() => handleAction("Approved", page.pageNumber)}>
                        <Check className="mr-2 h-4 w-4" /> Approve
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

