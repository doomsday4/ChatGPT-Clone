// src/types/next-auth.d.ts
import NextAuth, { DefaultSession, DefaultUser } from "next-auth";
import { JWT } from "next-auth/jwt";

// Extend the NextAuth User type
declare module "next-auth" {
  interface User extends DefaultUser {
    id: string;
    name: string | null;
  }

  interface Session extends DefaultSession {
    user: User;
    accessToken?: string;
  }
}

// Extend the JWT type
declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    name: string;
    accessToken?: string;
  }
}

declare module '@supabase/supabase-js' {
  interface User extends SupabaseAuthUser {
    // Add custom properties expected on Supabase User object
    // Supabase stores custom data in user_metadata, so we access it there.
    // NOTE: it comes from user_metadata.full_name.
    name?: string;
  }
}