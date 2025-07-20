// src/server/api/context.ts
import { type FetchCreateContextFnOptions } from '@trpc/server/adapters/fetch';
import { getServerSession, type Session } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { db } from '@/server/db/client';
import { type CookieOptions, createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createContext({ req }: FetchCreateContextFnOptions) {
  const session = await getServerSession(authOptions);
  if (session) {
    return { session, db };
  }

  const authHeader = req.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];

    const cookieStore = cookies();

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          async get(name: string) { 
            return (await cookieStore).get(name)?.value; // Await `cookieStore.get`
          },
          set(name: string, value: string, options: CookieOptions) {
            // No-op for read-only context
          },
          remove(name: string, options: CookieOptions) {
            // No-op for read-only context
          },
        },
      }
    );

    const { data: { user } } = await supabase.auth.getUser(token);

    if (user) {
      const userWithClaims = user as any; 
      const mockSession: Session = {
        user: {
          id: user.id,
          email: user.email || null,
          name: user.user_metadata.full_name || null,
        },
        expires: new Date(userWithClaims.exp * 1000).toISOString(),
      };
      return { session: mockSession, db };
    }
  }

  return { session: null, db };
}

export type Context = Awaited<ReturnType<typeof createContext>>;