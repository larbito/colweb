import type { FastifyPluginAsync } from 'fastify';
import { importSPKI, jwtVerify } from 'jose';
import { env } from '../env';
import { prisma } from '../lib/prisma';

declare module 'fastify' {
  interface FastifyRequest {
    auth: {
      clerkUserId: string;
      userId: string; // internal DB user id
    };
  }
}

function getBearerToken(header?: string): string | null {
  if (!header) return null;
  const [type, token] = header.split(' ');
  if (!type || !token) return null;
  if (type.toLowerCase() !== 'bearer') return null;
  return token.trim();
}

async function verifyClerkJwt(token: string): Promise<{ clerkUserId: string; email?: string; name?: string }> {
  // Clerk issues RS256 JWTs. For MVP, we verify signature with a configured public key from Clerk JWT templates.
  const key = await importSPKI(env.CLERK_JWT_VERIFICATION_KEY, 'RS256');
  const { payload } = await jwtVerify(token, key, {
    algorithms: ['RS256'],
  });

  const sub = payload.sub;
  if (!sub) throw new Error('Missing sub in JWT');

  // Depending on Clerk template/claims, these may not exist.
  const email = typeof payload.email === 'string' ? payload.email : undefined;
  const name = typeof payload.name === 'string' ? payload.name : undefined;
  return { clerkUserId: sub, email, name };
}

export const authPlugin: FastifyPluginAsync = async (app) => {
  app.decorateRequest('auth', null);

  app.addHook('preHandler', async (req, reply) => {
    if (req.url.startsWith('/health')) return;

    const token = getBearerToken(req.headers.authorization);
    if (!token) {
      return reply.code(401).send({ error: 'unauthorized', message: 'Missing Bearer token' });
    }

    try {
      const decoded = await verifyClerkJwt(token);

      const user =
        (await prisma.user.findUnique({ where: { clerkUserId: decoded.clerkUserId } })) ??
        (await prisma.user.create({
          data: {
            clerkUserId: decoded.clerkUserId,
            email: decoded.email,
            name: decoded.name,
          },
        }));

      req.auth = { clerkUserId: decoded.clerkUserId, userId: user.id };
    } catch (err) {
      req.log.warn({ err }, 'auth failed');
      return reply.code(401).send({ error: 'unauthorized', message: 'Invalid token' });
    }
  });
};


