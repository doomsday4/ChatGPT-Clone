// src/server/api/routers/hello.ts
import { router, publicProcedure } from '../trpc';
import { z } from 'zod';
import { db } from '@/server/db/client';
import { users } from "@/server/db/schema";

export const helloRouter = router({
  greet: publicProcedure
    .input(z.object({ name: z.string() }))
    .query(async ({ input }) => {
      await db.insert(users).values({ name: input.name });
      const allUsers = await db.select().from(users);
      return { message: `Inserted! Total users: ${allUsers.length}` };
    }),
});
