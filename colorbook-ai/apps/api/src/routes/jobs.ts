import type { FastifyPluginAsync } from 'fastify';

// Phase 4+
export const jobsRoutes: FastifyPluginAsync = async (app) => {
  app.get('/jobs', async (_req, reply) => reply.code(501).send({ error: 'not_implemented' }));
  app.get('/jobs/:id', async (_req, reply) => reply.code(501).send({ error: 'not_implemented' }));
};


