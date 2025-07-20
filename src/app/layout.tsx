// src/app/layout.tsx
import "./globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { NextAuthProvider } from "@/components/providers/NextAuthProvider";
import { TRPCProvider } from "@/components/providers/TRPCProvider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
	title: "AI Chatbot",
	description: "A simple and powerful AI chatbot.",
};

export default function RootLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<html lang="en" className="dark">
			<body className={`${inter.className} bg-gray-900`}>
                <NextAuthProvider>
                    <TRPCProvider>
				        {children}
                    </TRPCProvider>
                </NextAuthProvider>
			</body>
		</html>
	);
}