import Fastify from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import { env } from './env';
import { authPlugin } from './plugins/auth';
import { projectsRoutes } from './routes/projects';
import { pagesRoutes } from './routes/pages';
import { jobsRoutes } from './routes/jobs';

const app = Fastify({
  logger: {
    level: env.NODE_ENV === 'development' ? 'info' : 'warn',
  },
});

await app.register(cors, {
  origin: env.WEB_ORIGIN ?? true,
  credentials: true,
});

// Lightweight abuse protection.
await app.register(rateLimit, {
  max: 120,
  timeWindow: '1 minute',
});

app.get('/health', async () => ({ ok: true }));

await app.register(authPlugin);
await app.register(projectsRoutes);
await app.register(pagesRoutes);
await app.register(jobsRoutes);

await app.listen({ port: env.PORT, host: '0.0.0.0' });


