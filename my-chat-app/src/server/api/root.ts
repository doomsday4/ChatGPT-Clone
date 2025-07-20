// src/server/api/root.ts (or wherever your main router is defined)
import { router } from "./trpc";
import { helloRouter } from "./routers/hello"; // If you keep it
import { userRouter } from "./routers/user"; // Import your new user router
import { chatRouter } from "./routers/chat";

/**
 * This is the primary router for the server.
 * All routers added in /src/server/api/routers should be manually added here.
 */
export const appRouter = router({
  hello: helloRouter,
  user: userRouter,
  chat: chatRouter,
  // ...other routers
});

export type AppRouter = typeof appRouter;