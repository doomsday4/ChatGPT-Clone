// src/server/api/routers/user.ts
import { z } from "zod";
// Use protectedProcedure to ensure only authenticated users can access this
import { router, protectedProcedure } from "@/server/api/trpc";
import { users } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { db } from '@/server/db/client';

export const userRouter = router({
  /**
   * This mutation ensures a user profile exists in our public.users table.
   * It's a "protectedProcedure" meaning it can only be called by an authenticated user (either via NextAuth or anonymous Supabase session).
   */
  ensureUserProfile: protectedProcedure
    .input(z.object({
      isAnonymous: z.boolean(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.session || !ctx.session.user) {
        throw new TRPCError({ code: 'UNAUTHORIZED' });
      }
      const { id, email, name } = ctx.session.user;

      try {
        const existingUser = await db.query.users.findFirst({
          where: eq(users.id, id),
        });

        if (existingUser) {
          console.log(`User profile for ${id} already exists.`);
          return existingUser;
        }

        console.log(`Creating user profile for ${id} (anonymous: ${input.isAnonymous}).`);

        const [newUser] = await db
          .insert(users)
          .values({
            id: id,
            email: email,
            name: name,
            isAnonymous: input.isAnonymous,
          })
          .returning(); 

        if (!newUser) {
          throw new Error("Failed to create user profile (INSERT operation returned no data).");
        }

        console.log(`Successfully created profile for ${id}.`);
        return newUser;

      } catch (error: any) {
        console.error(`Backend ensureUserProfile error for user ${id}:`, error);


        if (error.code === '23505') {
          console.warn(`Race condition detected for user ${id}. Refetching profile.`);
          const userAfterRace = await db.query.users.findFirst({
            where: eq(users.id, id),
          });
          if (userAfterRace) {
            return userAfterRace; 
          }
        }

        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to ensure user profile.',
          cause: error,
        });
      }
    }),
});
