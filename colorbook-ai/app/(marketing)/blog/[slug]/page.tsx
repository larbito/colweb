import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { blogPosts, getPostBySlug, getRelatedPosts } from "@/lib/blog-posts";
import { ArrowLeft, Clock, ArrowRight, ChevronRight, Home } from "lucide-react";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return blogPosts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) return { title: "Post Not Found" };
  
  return {
    title: `${post.title} - ColorBook AI Blog`,
    description: post.excerpt,
  };
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = getPostBySlug(slug);

  if (!post) {
    notFound();
  }

  const relatedPosts = getRelatedPosts(slug, 3);

  return (
    <main className="relative">
      {/* Breadcrumb */}
      <section className="mx-auto max-w-3xl px-6 pt-28">
        <nav className="mb-8 flex items-center gap-2 text-sm text-muted-foreground">
          <Link href="/" className="flex items-center gap-1 hover:text-foreground">
            <Home className="h-3.5 w-3.5" />
            Home
          </Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <Link href="/blog" className="hover:text-foreground">Blog</Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="truncate text-foreground">{post.title}</span>
        </nav>

        {/* Header */}
        <div className="mb-8">
          <div className="mb-4 flex items-center gap-3">
            <Badge variant="secondary">{post.tag}</Badge>
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              {post.readingTime}
            </div>
            <span className="text-sm text-muted-foreground">{post.date}</span>
          </div>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{post.title}</h1>
          <p className="mt-4 text-lg text-muted-foreground">{post.excerpt}</p>
        </div>
      </section>

      {/* Content */}
      <section className="mx-auto max-w-3xl px-6 pb-16">
        <div className="prose prose-neutral dark:prose-invert max-w-none">
          {post.content.split('\n').map((paragraph, i) => {
            if (paragraph.startsWith('## ')) {
              return <h2 key={i} className="mt-8 text-xl font-semibold">{paragraph.replace('## ', '')}</h2>;
            }
            if (paragraph.startsWith('### ')) {
              return <h3 key={i} className="mt-6 text-lg font-semibold">{paragraph.replace('### ', '')}</h3>;
            }
            if (paragraph.startsWith('- ')) {
              return <li key={i} className="ml-4 text-muted-foreground">{paragraph.replace('- ', '')}</li>;
            }
            if (paragraph.trim() === '') return null;
            return <p key={i} className="mt-4 text-muted-foreground leading-relaxed">{paragraph}</p>;
          })}
        </div>

        <div className="mt-12 border-t border-border pt-8">
          <Button asChild variant="outline" className="rounded-full">
            <Link href="/blog">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Blog
            </Link>
          </Button>
        </div>
      </section>

      {/* Related Posts */}
      <section className="mx-auto max-w-5xl px-6 pb-24">
        <h2 className="mb-8 text-2xl font-semibold tracking-tight">Related articles</h2>
        <div className="grid gap-6 md:grid-cols-3">
          {relatedPosts.map((relatedPost) => (
            <Link key={relatedPost.slug} href={`/blog/${relatedPost.slug}`}>
              <Card className="group h-full border-border/50 bg-card/50 transition-all hover:border-border hover:bg-card hover:shadow-lg">
                <CardContent className="p-6">
                  <Badge variant="secondary" className="mb-3">{relatedPost.tag}</Badge>
                  <h3 className="mb-2 font-semibold leading-tight group-hover:text-primary">
                    {relatedPost.title}
                  </h3>
                  <p className="text-sm text-muted-foreground line-clamp-2">{relatedPost.excerpt}</p>
                  <span className="mt-3 flex items-center gap-1 text-sm text-primary opacity-0 transition-opacity group-hover:opacity-100">
                    Read more <ArrowRight className="h-3 w-3" />
                  </span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}

