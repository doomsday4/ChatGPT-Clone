// src/types/next-auth.d.ts
import NextAuth, { DefaultSession, DefaultUser } from "next-auth";
import { JWT } from "next-auth/jwt";

declare module "next-auth" {
  interface User extends DefaultUser {
    id: string;
    name: string | null;
    isAnonymous?: boolean;
  }

  interface Session extends DefaultSession {
    user: User & {
        id: string;
        isAnonymous?: boolean;
    };
    accessToken?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    name: string | null;
    email: string | null;
    isAnonymous?: boolean;
    accessToken?: string;
  }
}

declare module '@supabase/supabase-js' {
  interface User extends SupabaseAuthUser {
    name?: string;
  }
}