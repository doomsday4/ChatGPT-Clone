// src/server/api/routers/hello.ts
import { router, publicProcedure } from '../trpc';
import { z } from 'zod';

export const helloRouter = router({
  greet: publicProcedure
    .input(z.object({ name: z.string() }))
    .query(({ input }) => {
      return {
        message: `Hello, ${input.name}!`,
      };
    }),
});
