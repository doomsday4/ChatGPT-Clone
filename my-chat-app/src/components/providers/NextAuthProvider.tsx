"use client"; // This component needs to be a client component

import { SessionProvider } from "next-auth/react";

export function NextAuthProvider({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}