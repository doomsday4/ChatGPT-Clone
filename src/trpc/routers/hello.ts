// src/server/api/routers/hello.ts
import { router, publicProcedure } from '../trpc';
import { z } from 'zod';

// a simple endpoint testing file

export const helloRouter = router({
  greet: publicProcedure
    .input(z.object({ name: z.string() }))
    .query(async ({ input }) => {

      // This router is now just a simple greeting without DB interaction
      return { message: `Hello, ${input.name}! This is a test endpoint.` };
    }),
});