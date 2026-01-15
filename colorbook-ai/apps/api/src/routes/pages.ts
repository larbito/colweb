import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { PageUpdateInputSchema } from '@colorbook/shared';
import { prisma } from '../lib/prisma';

const ParamsWithId = z.object({ id: z.string().uuid() });

function iso(d: Date) {
  return d.toISOString();
}

export const pagesRoutes: FastifyPluginAsync = async (app) => {
  app.patch('/pages/:id', async (req, reply) => {
    const params = ParamsWithId.safeParse(req.params);
    if (!params.success) return reply.code(400).send({ error: 'bad_request', issues: params.error.issues });

    const body = PageUpdateInputSchema.safeParse(req.body);
    if (!body.success) return reply.code(400).send({ error: 'bad_request', issues: body.error.issues });

    const page = await prisma.page.findFirst({
      where: { id: params.data.id, project: { userId: req.auth.userId } },
      include: { project: true },
    });
    if (!page) return reply.code(404).send({ error: 'not_found' });

    const updated = await prisma.page.update({
      where: { id: page.id },
      data: {
        prompt: body.data.prompt ?? undefined,
        complexity: body.data.complexity ?? undefined,
        lineThickness: body.data.lineThickness ?? undefined,
        // Any prompt edit takes the page back to draft in Phase 2.
        status: body.data.prompt ? 'draft' : undefined,
      },
      select: {
        id: true,
        projectId: true,
        index: true,
        prompt: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return {
      ...updated,
      createdAt: iso(updated.createdAt),
      updatedAt: iso(updated.updatedAt),
    };
  });

  app.post('/pages/:id/approve', async (req, reply) => {
    const params = ParamsWithId.safeParse(req.params);
    if (!params.success) return reply.code(400).send({ error: 'bad_request', issues: params.error.issues });

    const page = await prisma.page.findFirst({
      where: { id: params.data.id, project: { userId: req.auth.userId } },
      select: { id: true },
    });
    if (!page) return reply.code(404).send({ error: 'not_found' });

    const updated = await prisma.page.update({
      where: { id: page.id },
      data: { status: 'approved' },
      select: { id: true, status: true, updatedAt: true },
    });

    return { ...updated, updatedAt: iso(updated.updatedAt) };
  });

  app.post('/pages/:id/reject', async (req, reply) => {
    const params = ParamsWithId.safeParse(req.params);
    if (!params.success) return reply.code(400).send({ error: 'bad_request', issues: params.error.issues });

    const page = await prisma.page.findFirst({
      where: { id: params.data.id, project: { userId: req.auth.userId } },
      select: { id: true },
    });
    if (!page) return reply.code(404).send({ error: 'not_found' });

    const updated = await prisma.page.update({
      where: { id: page.id },
      data: { status: 'rejected' },
      select: { id: true, status: true, updatedAt: true },
    });

    return { ...updated, updatedAt: iso(updated.updatedAt) };
  });

  // Phase 4+
  app.post('/pages/:id/regenerate', async (_req, reply) => reply.code(501).send({ error: 'not_implemented' }));
};


