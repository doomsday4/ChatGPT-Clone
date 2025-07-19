// src/server/api/trpc.ts
import { initTRPC } from '@trpc/server';
import { FetchCreateContextFnOptions, fetchRequestHandler } from '@trpc/server/adapters/fetch';

const t = initTRPC.create();

export const router = t.router;
export const publicProcedure = t.procedure;

export type Context = Record<string, never>;
