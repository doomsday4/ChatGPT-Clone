// src/server/api/routers/user.ts [integrate this into the auth callback]
import { z } from "zod";
import { publicProcedure, router } from "../trpc";
import { users } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { db } from '@/server/db/client';
import { TRPCError } from "@trpc/server"; // Import TRPCError

export const userRouter = router({
  ensureUserProfile: publicProcedure
    .input(z.object({
      userId: z.string().uuid(),
      email: z.string().email().optional().nullable(), // Allow email to be explicitly null
      name: z.string().optional().nullable(), // Allow name to be explicitly null
      isAnonymous: z.boolean().default(false),
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        // Try to find the user first
        const existingUser = await db.query.users.findFirst({
          where: eq(users.id, input.userId),
        });

        if (existingUser) {
          console.log(`User profile for ${input.userId} already exists.`);
          // If the user exists, consider updating fields that might have changed (e.g., name, email if anonymous converted)
          // Only update if there's an actual change to avoid unnecessary DB writes.
          if (
            (input.name !== undefined && existingUser.name !== input.name) ||
            (input.email !== undefined && existingUser.email !== input.email) ||
            existingUser.isAnonymous !== input.isAnonymous // Update anonymous status if conversion happens
          ) {
            const [updatedUser] = await db.update(users)
              .set({
                name: input.name, // Use input.name directly (can be null/undefined)
                email: input.email, // Use input.email directly (can be null/undefined)
                isAnonymous: input.isAnonymous,
                updatedAt: new Date(),
              })
              .where(eq(users.id, input.userId))
              .returning();
            if (updatedUser) {
              console.log(`User profile for ${input.userId} updated.`);
              return updatedUser;
            }
          }
          return existingUser; // Return existing profile if no update needed
        }

        // If user doesn't exist, attempt to insert
        console.log(`Creating user profile for ${input.userId} (anonymous: ${input.isAnonymous}).`);
        const [newUser] = await db.insert(users).values({
          id: input.userId,
          // Explicitly pass null if the field is undefined for a nullable column
          email: input.email === undefined ? null : input.email,
          name: input.name === undefined ? null : input.name,
          isAnonymous: input.isAnonymous,
        }).returning();

        if (!newUser) {
          throw new Error("Failed to create user profile (no data returned).");
        }
        return newUser;
      } catch (error: any) {
        console.error(`Backend ensureUserProfile error for user ${input.userId}:`, error);

        // This is crucial for handling race conditions where another request created the user just before this one tried to insert.
        if (error.code === '23505') { // PostgreSQL unique violation error code
          console.warn(`Race condition detected: User ${input.userId} already exists but was not found initially.`);
          const userAfterRace = await db.query.users.findFirst({
            where: eq(users.id, input.userId),
          });
          if (userAfterRace) {
            return userAfterRace; // Successfully resolved race condition
          }
        }

        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to ensure user profile: ${error.message || 'Unknown error'}`,
          cause: error,
        });
      }
    }),
});