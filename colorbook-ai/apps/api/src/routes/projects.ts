import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { ProjectCreateInputSchema } from '@colorbook/shared';
import { prisma } from '../lib/prisma';
import { detectCopyrightedContent } from '../lib/prompt-guard';

const ParamsWithId = z.object({ id: z.string().uuid() });

function iso(d: Date) {
  return d.toISOString();
}

async function ensureDemoProject(userId: string) {
  const count = await prisma.project.count({ where: { userId } });
  if (count > 0) return;

  const demo = await prisma.project.create({
    data: {
      userId,
      title: 'Panda Daily Life (Demo)',
      trimPreset: 'US_LETTER',
      theme: 'Panda daily life',
      character: 'A curious panda',
      pageCount: 6,
      complexity: 'kids',
      lineThickness: 'medium',
      status: 'draft',
      pages: {
        create: [
          'Panda waking up in a cozy bamboo bedroom',
          'Panda brushing teeth at the sink',
          'Panda making breakfast with bamboo pancakes',
          'Panda reading a book under a tree',
          'Panda gardening with little tools',
          'Panda going to sleep under a starry sky',
        ].map((prompt, idx) => ({
          index: idx,
          prompt,
          complexity: 'kids',
          lineThickness: 'medium',
          status: 'draft',
        })),
      },
    },
  });

  return demo;
}

export const projectsRoutes: FastifyPluginAsync = async (app) => {
  app.post('/projects', async (req, reply) => {
    const parsed = ProjectCreateInputSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: 'bad_request', issues: parsed.error.issues });

    const { title, trimPreset, theme, character, pageCount, complexity, lineThickness } = parsed.data;

    const guard = detectCopyrightedContent(`${title} ${theme} ${character}`);
    if (guard.blocked) return reply.code(400).send({ error: 'blocked', message: guard.reason });

    const project = await prisma.project.create({
      data: {
        userId: req.auth.userId,
        title,
        trimPreset,
        theme,
        character,
        pageCount,
        complexity,
        lineThickness,
        status: 'draft',
        pages: {
          create: Array.from({ length: pageCount }).map((_, idx) => ({
            index: idx,
            prompt: `${theme} — Page ${idx + 1}`,
            complexity,
            lineThickness,
            status: 'draft',
          })),
        },
      },
      select: {
        id: true,
        title: true,
        trimPreset: true,
        theme: true,
        character: true,
        pageCount: true,
        complexity: true,
        lineThickness: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return reply.code(201).send({
      ...project,
      createdAt: iso(project.createdAt),
      updatedAt: iso(project.updatedAt),
    });
  });

  app.get('/projects', async (req) => {
    await ensureDemoProject(req.auth.userId);

    const projects = await prisma.project.findMany({
      where: { userId: req.auth.userId },
      orderBy: { createdAt: 'desc' },
      include: {
        pages: { select: { status: true } },
      },
    });

    return projects.map((p) => {
      const total = p.pages.length;
      const ready = p.pages.filter((x) => x.status === 'ready' || x.status === 'approved').length;
      return {
        id: p.id,
        title: p.title,
        trimPreset: p.trimPreset,
        theme: p.theme,
        character: p.character,
        pageCount: p.pageCount,
        complexity: p.complexity,
        lineThickness: p.lineThickness,
        status: p.status,
        progress: { ready, total },
        createdAt: iso(p.createdAt),
        updatedAt: iso(p.updatedAt),
      };
    });
  });

  app.get('/projects/:id', async (req, reply) => {
    const params = ParamsWithId.safeParse(req.params);
    if (!params.success) return reply.code(400).send({ error: 'bad_request', issues: params.error.issues });

    const project = await prisma.project.findFirst({
      where: { id: params.data.id, userId: req.auth.userId },
      include: {
        pages: {
          orderBy: { index: 'asc' },
          include: {
            generations: { orderBy: { createdAt: 'desc' }, take: 1 },
          },
        },
      },
    });

    if (!project) return reply.code(404).send({ error: 'not_found' });

    return {
      id: project.id,
      title: project.title,
      trimPreset: project.trimPreset,
      theme: project.theme,
      character: project.character,
      pageCount: project.pageCount,
      complexity: project.complexity,
      lineThickness: project.lineThickness,
      status: project.status,
      createdAt: iso(project.createdAt),
      updatedAt: iso(project.updatedAt),
      pages: project.pages.map((pg) => {
        const latest = pg.generations[0];
        return {
          id: pg.id,
          projectId: pg.projectId,
          index: pg.index,
          prompt: pg.prompt,
          status: pg.status,
          createdAt: iso(pg.createdAt),
          updatedAt: iso(pg.updatedAt),
          latestGeneration: latest
            ? {
                id: latest.id,
                outputUrl: latest.outputUrl ?? null,
                replicatePredictionId: latest.replicatePredictionId ?? null,
                createdAt: iso(latest.createdAt),
              }
            : null,
        };
      }),
    };
  });

  // Phase 3+
  app.post('/projects/:id/story-prompts', async (_req, reply) => reply.code(501).send({ error: 'not_implemented' }));
  app.post('/projects/:id/generate', async (_req, reply) => reply.code(501).send({ error: 'not_implemented' }));
  app.post('/projects/:id/export', async (_req, reply) => reply.code(501).send({ error: 'not_implemented' }));
};


