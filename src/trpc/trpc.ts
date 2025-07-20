// src/server/api/trpc.ts
import { initTRPC, TRPCError } from '@trpc/server';
import { type Context } from './context';
import superjson from 'superjson';

const t = initTRPC.context<Context>().create({
  transformer: superjson, // <-- Add this line
  errorFormatter: ({ shape }) => shape,
});

/**
 * Main router factory.
 */
export const router = t.router;

/**
 * A "public" procedure that can be called by any client, authenticated or not.
 */
export const publicProcedure = t.procedure;

/**
 * A "protected" procedure that can only be called by an authenticated client.
 */
export const protectedProcedure = t.procedure.use(
  t.middleware(({ ctx, next }) => {
    if (!ctx.session || !ctx.session.user) {
      throw new TRPCError({ code: 'UNAUTHORIZED' });
    }
    return next({
      ctx: {
        ...ctx,
        session: { ...ctx.session, user: ctx.session.user },
      },
    });
  })
);