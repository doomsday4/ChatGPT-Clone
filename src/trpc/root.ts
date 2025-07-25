// src/server/api/root.ts (or wherever your main router is defined)
import { router } from "./trpc";
import { helloRouter } from "./routers/hello";
// import { userRouter } from "./routers/user";
import { chatRouter } from "./routers/chat";

/**
 * This is the primary router for the server.
 * All routers added in /src/server/api/routers are tobe manually added here.
 */
export const appRouter = router({
  hello: helloRouter,
  // user: userRouter,
  chat: chatRouter,
  // ...other routers
});

export type AppRouter = typeof appRouter;