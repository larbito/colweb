"use client";

import { useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { blogPosts } from "@/lib/blog-posts";
import { BookOpen, Search, ArrowRight, Clock } from "lucide-react";

export default function BlogPage() {
  const [search, setSearch] = useState("");

  const filteredPosts = blogPosts.filter(
    (post) =>
      post.title.toLowerCase().includes(search.toLowerCase()) ||
      post.excerpt.toLowerCase().includes(search.toLowerCase()) ||
      post.tag.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <main className="relative">
      <PageHeader
        badge="Blog"
        badgeIcon={<BookOpen className="h-3.5 w-3.5" />}
        title="Tips & guides for KDP creators"
        subtitle="Learn how to create better coloring books, faster."
      />

      <section className="mx-auto max-w-5xl px-6 pb-24">
        {/* Search */}
        <div className="relative mb-12">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search articles..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-12 rounded-xl pl-11"
          />
        </div>

        {/* Posts Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredPosts.map((post) => (
            <Link key={post.slug} href={`/blog/${post.slug}`}>
              <Card className="group h-full border-border/50 bg-card/50 transition-all hover:border-border hover:bg-card hover:shadow-lg">
                <CardContent className="flex h-full flex-col p-6">
                  <div className="mb-4 flex items-center justify-between">
                    <Badge variant="secondary">{post.tag}</Badge>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {post.readingTime}
                    </div>
                  </div>

                  <h3 className="mb-2 font-semibold leading-tight group-hover:text-primary">
                    {post.title}
                  </h3>

                  <p className="mb-4 flex-1 text-sm text-muted-foreground line-clamp-3">
                    {post.excerpt}
                  </p>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{post.date}</span>
                    <span className="flex items-center gap-1 text-primary opacity-0 transition-opacity group-hover:opacity-100">
                      Read more <ArrowRight className="h-3 w-3" />
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        {filteredPosts.length === 0 && (
          <div className="py-12 text-center text-muted-foreground">
            No articles found matching "{search}"
          </div>
        )}
      </section>
    </main>
  );
}
