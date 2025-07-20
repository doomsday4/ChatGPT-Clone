// src/app/layout.tsx
import './globals.css';
import { TRPCProvider } from '@/trpc/provider';
import { ReactNode } from 'react';
import { NextAuthProvider } from "@/components/providers/NextAuthProvider";
import { UserStatusBanner } from "@/components/UserStatusBanner"; // Ensure path is correct

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <TRPCProvider>
          <NextAuthProvider>
            {children}
            {/* UserStatusBanner should be inside NextAuthProvider to access session context */}
            <UserStatusBanner />
          </NextAuthProvider>
        </TRPCProvider>
      </body>
    </html>
  );
}