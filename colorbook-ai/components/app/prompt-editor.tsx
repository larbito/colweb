"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { RefreshCw, Save } from "lucide-react";
import { toast } from "sonner";
import type { ProjectPage } from "@/lib/mock-data";

interface PromptEditorProps {
  pages: ProjectPage[];
}

export function PromptEditor({ pages }: PromptEditorProps) {
  const [prompts, setPrompts] = useState(pages.map((p) => ({ ...p })));
  const [selected, setSelected] = useState<string[]>([]);

  const toggleSelect = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  const toggleAll = () => {
    if (selected.length === prompts.length) {
      setSelected([]);
    } else {
      setSelected(prompts.map((p) => p.id));
    }
  };

  const updatePrompt = (id: string, newPrompt: string) => {
    setPrompts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, prompt: newPrompt } : p))
    );
  };

  const handleSave = () => {
    toast.success("Prompts saved successfully");
  };

  const handleRegenerate = () => {
    if (selected.length === 0) {
      toast.error("Select at least one page to regenerate");
      return;
    }
    toast.success(`Regenerating ${selected.length} page(s)...`);
  };

  if (prompts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-12 text-center">
        <p className="text-sm text-muted-foreground">No prompts generated yet</p>
        <p className="text-xs text-muted-foreground">Use the wizard to generate story prompts first</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Checkbox
            checked={selected.length === prompts.length && prompts.length > 0}
            onCheckedChange={toggleAll}
          />
          <span className="text-sm text-muted-foreground">
            {selected.length > 0 ? `${selected.length} selected` : "Select all"}
          </span>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="rounded-xl"
            onClick={handleRegenerate}
            disabled={selected.length === 0}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Regenerate Selected
          </Button>
          <Button size="sm" className="rounded-xl" onClick={handleSave}>
            <Save className="mr-2 h-4 w-4" />
            Save Changes
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        {prompts.map((page) => (
          <Card key={page.id} className="border-border/50 bg-card/60">
            <CardContent className="p-4">
              <div className="flex gap-4">
                <div className="flex items-start gap-3">
                  <Checkbox
                    checked={selected.includes(page.id)}
                    onCheckedChange={() => toggleSelect(page.id)}
                  />
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-medium">
                    {page.pageNumber}
                  </span>
                </div>
                <Textarea
                  value={page.prompt}
                  onChange={(e) => updatePrompt(page.id, e.target.value)}
                  className="min-h-[80px] resize-none rounded-xl"
                  placeholder="Enter prompt for this page..."
                />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

