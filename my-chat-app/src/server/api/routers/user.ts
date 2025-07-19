// src/server/api/routers/user.ts [integrate this into the auth callback]
import { z } from "zod";
import { publicProcedure, router } from "../trpc";
import { users } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { db } from '@/server/db/client';

export const userRouter = router({
  // This procedure will be called after a successful Supabase authentication (sign-up/sign-in)
  // It ensures the public.users table has entry for the user.
  ensureUserProfile: publicProcedure
    .input(z.object({
      userId: z.string().uuid(), // ID from Supabase auth.users
      email: z.string().email().optional(), // Email for authenticated users
      isAnonymous: z.boolean().default(false),
    }))
    .mutation(async ({ ctx, input }) => {
      // Check if user already exists in public.users
      const existingUser = await db.query.users.findFirst({
        where: eq(users.id, input.userId),
      });

      if (existingUser) {
        console.log(`User profile for ${input.userId} already exists.`);
        return existingUser; // Return existing profile
      }

      // If user doesn't exist, insert new profile
      console.log(`Creating user profile for ${input.userId} (anonymous: ${input.isAnonymous}).`);
      const [newUser] = await db.insert(users).values({
        id: input.userId,
        email: input.email,
        isAnonymous: input.isAnonymous,
        // createdAt and updatedAt will use defaultNow()
      }).returning(); // .returning() is important to get inserted data back

      if (!newUser) {
        throw new Error("Failed to create user profile.");
      }

      return newUser;
    }),
});