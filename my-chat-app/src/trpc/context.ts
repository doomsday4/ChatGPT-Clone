// src/trpc/context.ts
import { type FetchCreateContextFnOptions } from '@trpc/server/adapters/fetch';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/server/db/client';

export async function createContext({ req }: FetchCreateContextFnOptions) {
  const session = await getServerSession(authOptions);
  return { session, db };
}

export type Context = Awaited<ReturnType<typeof createContext>>;