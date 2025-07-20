// src/app/layout.tsx
import './globals.css';
import { TRPCProvider } from '@/components/providers/TRPCProvider';
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
          </NextAuthProvider>
        </TRPCProvider>
      </body>
    </html>
  );
}