// src/app/layout.tsx
import './globals.css';
import { TRPCProvider } from '@/trpc/provider';
import { ReactNode } from 'react';
import { NextAuthProvider } from "@/components/providers/NextAuthProvider";
import { UserStatusBanner } from "@/components/UserStatusBanner";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <TRPCProvider>
          <NextAuthProvider>
            {children}
          </NextAuthProvider>
          <UserStatusBanner />
        </TRPCProvider>
      </body>
    </html>
  );
}
