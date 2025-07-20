// src/app/api/trpc/[trpc]/route.ts
import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { type NextRequest } from 'next/server';

import { appRouter } from '@/trpc/root';
import { createContext } from '@/trpc/context';

/**
 * This is the tRPC API handler for the Next.js App Router.
 * It handles all incoming tRPC requests and routes them to the correct procedure.
 */
const handler = (req: NextRequest) =>
  fetchRequestHandler({
    endpoint: '/api/trpc',
    req,
    router: appRouter,
    createContext: createContext,
  });

// This exports the handler for both GET and POST requests.
export { handler as GET, handler as POST };