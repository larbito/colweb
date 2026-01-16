"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TrendingUp, Globe, Clock, RefreshCw, ChevronDown, Flame, Sparkles, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface TrendItem {
  keyword: string;
  score: number;
  source: string;
}

interface TrendingPanelProps {
  onSelectKeyword: (keyword: string) => void;
  onSuggestTrending: (region: string, periodDays: number, keyword?: string) => void;
  isSuggesting: boolean;
}

export function TrendingPanel({ onSelectKeyword, onSuggestTrending, isSuggesting }: TrendingPanelProps) {
  const [region, setRegion] = useState("US");
  const [periodDays, setPeriodDays] = useState(30);
  const [trends, setTrends] = useState<TrendItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [selectedKeyword, setSelectedKeyword] = useState<string | null>(null);

  const fetchTrends = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/trends?region=${region}&periodDays=${periodDays}`);
      const data = await response.json();
      setTrends(data.items || []);
      setUpdatedAt(data.updatedAt);
    } catch (error) {
      console.error("Failed to fetch trends:", error);
      setTrends([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrends();
  }, [region, periodDays]);

  const handleKeywordClick = (keyword: string) => {
    setSelectedKeyword(keyword);
    onSelectKeyword(keyword);
  };

  const handleSuggestClick = () => {
    onSuggestTrending(region, periodDays, selectedKeyword || undefined);
  };

  const formatUpdatedAt = (dateStr: string | null) => {
    if (!dateStr) return "Unknown";
    const date = new Date(dateStr);
    const now = new Date();
    const diffHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffHours < 1) return "Just now";
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${Math.floor(diffHours / 24)}d ago`;
  };

  const getScoreColor = (score: number) => {
    if (score >= 150) return "text-red-500";
    if (score >= 100) return "text-orange-500";
    if (score >= 75) return "text-yellow-500";
    return "text-muted-foreground";
  };

  return (
    <Card className="border-orange-500/20 bg-gradient-to-br from-orange-500/5 to-transparent">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Flame className="h-5 w-5 text-orange-500" />
            Trending Ideas
          </CardTitle>
          <div className="flex items-center gap-2">
            {/* Region Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 gap-1 rounded-lg text-xs">
                  <Globe className="h-3 w-3" />
                  {region}
                  <ChevronDown className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuRadioGroup value={region} onValueChange={setRegion}>
                  <DropdownMenuRadioItem value="US">🇺🇸 United States</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="UK">🇬🇧 United Kingdom</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="DE">🇩🇪 Germany</DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Period Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 gap-1 rounded-lg text-xs">
                  <Clock className="h-3 w-3" />
                  {periodDays}d
                  <ChevronDown className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuRadioGroup 
                  value={periodDays.toString()} 
                  onValueChange={(v) => setPeriodDays(parseInt(v))}
                >
                  <DropdownMenuRadioItem value="7">Last 7 days</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="30">Last 30 days</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="90">Last 90 days</DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Refresh */}
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8"
              onClick={fetchTrends}
              disabled={loading}
            >
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            </Button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Updated {formatUpdatedAt(updatedAt)} • Click a trend to use it
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Trend Chips */}
        {loading ? (
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-7 w-24 rounded-full" />
            ))}
          </div>
        ) : trends.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {trends.slice(0, 12).map((trend, i) => (
              <Badge
                key={i}
                variant={selectedKeyword === trend.keyword ? "default" : "secondary"}
                className={cn(
                  "cursor-pointer gap-1 px-3 py-1 transition-all hover:scale-105",
                  selectedKeyword === trend.keyword && "ring-2 ring-primary ring-offset-2"
                )}
                onClick={() => handleKeywordClick(trend.keyword)}
              >
                <TrendingUp className={cn("h-3 w-3", getScoreColor(trend.score))} />
                <span className="max-w-[120px] truncate">{trend.keyword}</span>
                <span className={cn("text-[10px] font-normal", getScoreColor(trend.score))}>
                  {trend.score}
                </span>
              </Badge>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No trends available</p>
        )}

        {/* AI Suggest Button */}
        <Button
          onClick={handleSuggestClick}
          disabled={isSuggesting}
          className="w-full gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600"
        >
          {isSuggesting ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> Generating...</>
          ) : (
            <><Sparkles className="h-4 w-4" /> ✨ AI Suggest (Trending)</>
          )}
        </Button>

        {selectedKeyword && (
          <p className="text-center text-xs text-muted-foreground">
            Using trend: <span className="font-medium text-foreground">{selectedKeyword}</span>
          </p>
        )}
      </CardContent>
    </Card>
  );
}

