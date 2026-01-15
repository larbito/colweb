import { z } from 'zod';

export const TrimPresetSchema = z.enum(['US_LETTER', 'EIGHT_BY_TEN', 'A4', 'SQUARE_8_25']);
export const ComplexitySchema = z.enum(['kids', 'medium', 'detailed']);
export const LineThicknessSchema = z.enum(['thin', 'medium', 'bold']);

export const PageStatusSchema = z.enum([
  'draft',
  'queued',
  'generating',
  'ready',
  'failed',
  'approved',
  'rejected',
]);

export const ProjectCreateInputSchema = z.object({
  title: z.string().min(1).max(120),
  trimPreset: TrimPresetSchema,
  theme: z.string().min(1).max(120),
  character: z.string().min(1).max(120),
  pageCount: z.number().int().min(1).max(120),
  complexity: ComplexitySchema,
  lineThickness: LineThicknessSchema,
});

export const ProjectSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  trimPreset: TrimPresetSchema,
  theme: z.string(),
  character: z.string(),
  pageCount: z.number().int(),
  complexity: ComplexitySchema,
  lineThickness: LineThicknessSchema,
  status: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const PageSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  index: z.number().int(),
  prompt: z.string(),
  status: PageStatusSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
  latestGeneration: z
    .object({
      id: z.string().uuid(),
      outputUrl: z.string().url().nullable(),
      replicatePredictionId: z.string().nullable(),
      createdAt: z.string(),
    })
    .nullable(),
});

export const ProjectWithPagesSchema = ProjectSchema.extend({
  pages: z.array(PageSchema),
});

export const PageUpdateInputSchema = z.object({
  prompt: z.string().min(1).max(800).optional(),
  complexity: ComplexitySchema.optional(),
  lineThickness: LineThicknessSchema.optional(),
});


