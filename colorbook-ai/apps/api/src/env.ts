import { z } from 'zod';

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),

  DATABASE_URL: z.string().min(1),

  // Phase 4+ (worker/queue) — validated now so deploy-time misconfig is caught early.
  REDIS_URL: z.string().min(1).optional(),
  OPENAI_API_KEY: z.string().min(1).optional(),
  REPLICATE_API_TOKEN: z.string().min(1).optional(),

  // Auth
  CLERK_JWT_VERIFICATION_KEY: z.string().min(1),

  // CORS / Web integration
  WEB_ORIGIN: z.string().url().optional()
});

export type Env = z.infer<typeof EnvSchema>;

export const env: Env = EnvSchema.parse({
  NODE_ENV: process.env.NODE_ENV,
  PORT: process.env.PORT,
  DATABASE_URL: process.env.DATABASE_URL,
  REDIS_URL: process.env.REDIS_URL,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  REPLICATE_API_TOKEN: process.env.REPLICATE_API_TOKEN,
  CLERK_JWT_VERIFICATION_KEY: process.env.CLERK_JWT_VERIFICATION_KEY,
  WEB_ORIGIN: process.env.WEB_ORIGIN
});


