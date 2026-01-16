export interface BlogPost {
  slug: string;
  title: string;
  excerpt: string;
  date: string;
  readingTime: string;
  tag: string;
  content: string;
}

export const blogPosts: BlogPost[] = [
  {
    slug: "kdp-trim-sizes-guide",
    title: "KDP Trim Sizes for Coloring Books (Quick Guide)",
    excerpt: "Choosing the right trim size can make or break your coloring book. Here's what works best for different audiences and why.",
    date: "2024-01-10",
    readingTime: "4 min read",
    tag: "Guide",
    content: `
## Why Trim Size Matters

The trim size of your coloring book affects everything from user experience to printing costs. Pick the wrong size and your beautiful illustrations might get cropped, or worse, have awkward margins.

## Most Popular Sizes

### 8.5 × 11 inches
The most common size for coloring books. It's large enough for detailed illustrations and comfortable to hold. Perfect for adult coloring books and detailed kids' books.

### 8 × 10 inches
Slightly smaller, but still spacious. Great for a premium feel without the bulk.

### 6 × 9 inches
Compact and portable. Ideal for travel coloring books or activity books for kids.

## ColorBook AI Presets

We've built KDP-compliant presets for all common sizes with proper bleed and margins. Just select your size and start creating.
    `,
  },
  {
    slug: "story-mode-prompts",
    title: "How Story Mode Prompts Improve Book Quality",
    excerpt: "Random prompts create random books. Story mode creates cohesive narratives that readers actually want to complete.",
    date: "2024-01-08",
    readingTime: "5 min read",
    tag: "Tips",
    content: `
## The Problem with Random Prompts

Most AI coloring book tools let you generate pages one by one. The result? A disconnected collection of images that don't feel like a real book.

## What is Story Mode?

Story mode generates prompts that follow a narrative arc. Your character has a journey, encounters friends, solves problems, and reaches a satisfying conclusion.

## How to Use It

1. Define your main character (e.g., "curious panda cub")
2. Set the theme (e.g., "forest adventure")
3. Choose the number of pages
4. Let the AI create connected prompts

The result is a book that kids (and adults) actually want to finish.
    `,
  },
  {
    slug: "thin-vs-bold-lines",
    title: "Thin vs Bold Lines: What Sells Better?",
    excerpt: "Line thickness isn't just aesthetic — it affects who buys your book and how they experience it.",
    date: "2024-01-05",
    readingTime: "3 min read",
    tag: "Research",
    content: `
## The Great Line Debate

Thin lines look elegant but can frustrate younger colorers. Bold lines are forgiving but might feel childish to adults.

## Our Findings

After analyzing hundreds of KDP coloring books:

- **Thin lines**: Best for detailed adult books and older kids (8+)
- **Medium lines**: The sweet spot for most books
- **Bold lines**: Perfect for toddlers and preschoolers

## ColorBook AI Settings

We offer three presets: Thin, Medium, and Bold. Each is calibrated for print quality and coloring ease.
    `,
  },
  {
    slug: "kdp-interior-mistakes",
    title: "Avoiding Common KDP Interior Mistakes",
    excerpt: "These rookie errors get books rejected or result in poor print quality. Here's how to avoid them.",
    date: "2024-01-03",
    readingTime: "6 min read",
    tag: "Guide",
    content: `
## Mistake #1: Wrong Margins

KDP has specific margin requirements based on page count. Too small and your content gets cut. Too large and you waste space.

## Mistake #2: Low Resolution

Print requires 300 DPI minimum. Screen resolution (72 DPI) will result in blurry prints.

## Mistake #3: No Bleed

If your illustrations extend to the edge, you need bleed. Otherwise you'll get white borders.

## Mistake #4: RGB Color Mode

Print uses CMYK. RGB colors will shift. For coloring books with line art, stick to true black.

## How ColorBook AI Helps

Our export handles all of this automatically. Correct margins, 300 DPI, proper bleed, and print-safe black.
    `,
  },
  {
    slug: "bulk-generation-workflow",
    title: "Bulk Generation Workflow: From Idea to PDF",
    excerpt: "Stop generating pages one at a time. Here's the efficient workflow for creating complete books.",
    date: "2024-01-01",
    readingTime: "5 min read",
    tag: "Workflow",
    content: `
## The Old Way

Generate one image, download it, open Canva, place it, adjust margins, repeat 24 times. Hours of tedious work.

## The ColorBook AI Way

1. **Set up your project** (2 minutes): Size, style, complexity
2. **Generate prompts** (5 minutes): Story mode creates 24 connected prompts
3. **Bulk generate** (10-15 minutes): All pages queue automatically
4. **Review and refine** (5-10 minutes): Regenerate any pages you don't like
5. **Export PDF** (1 minute): Print-ready with all options

Total time: Under 30 minutes for a complete book.
    `,
  },
  {
    slug: "consistent-characters",
    title: "Prompt Editing: Getting Consistent Characters",
    excerpt: "Your panda shouldn't look different on every page. Here's how to maintain character consistency.",
    date: "2023-12-28",
    readingTime: "4 min read",
    tag: "Tips",
    content: `
## The Consistency Challenge

AI image generation doesn't have memory. Each generation is independent, which can result in characters that look different on every page.

## The Solution: Prompt Engineering

Include character details in every prompt:
- Physical traits ("fluffy white cat with blue eyes")
- Outfit or accessories ("wearing a red bow")
- Style descriptors ("simple line art, children's book style")

## Using ColorBook AI

Our story mode automatically carries character descriptions across all prompts. You define the character once, and every page maintains consistency.

## Manual Editing

You can also edit prompts directly. If a character drifts, adjust the prompt and regenerate just that page.
    `,
  },
];

export function getPostBySlug(slug: string): BlogPost | undefined {
  return blogPosts.find((post) => post.slug === slug);
}

export function getRelatedPosts(currentSlug: string, count: number = 3): BlogPost[] {
  return blogPosts.filter((post) => post.slug !== currentSlug).slice(0, count);
}

