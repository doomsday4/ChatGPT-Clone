import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { createClient } from "@supabase/supabase-js"; // Import Supabase client
import type { AuthOptions } from "next-auth";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;


export const authOptions: AuthOptions = {
    providers: [
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                email: { label: "Email", type: "text" },
                password: { label: "Password", type: "password" },
                //a 'mode' to differentiate between sign-up and sign-in
                mode: { label: "Mode", type: "hidden" },
            },
            authorize: async (
                credentials: Record<"email" | "password" | "mode", string> | undefined,
                req
            ) => {
                if (!credentials) throw new Error("Missing credentials");

                const { email, password, mode } = credentials;
                const supabase = createClient(supabaseUrl, supabaseAnonKey);

                let data, error;

                if (mode === "signup") {
                    ({ data, error } = await supabase.auth.signUp({ email, password }));
                } else {
                    ({ data, error } = await supabase.auth.signInWithPassword({ email, password }));
                }

                if (error) throw new Error(error.message);

                const user = data.user;
                if (!user?.id || !user.email) return null;

                return { id: user.id, email: user.email };
            },
        }),
    ],
    session: {
        strategy: "jwt" as const, // JWT for session management
    },
    jwt: {
        secret: process.env.NEXTAUTH_SECRET,
    },
    callbacks: {
        async jwt({
            token,
            user,
            account,
        }: {
            token: any;
            user?: any;
            account?: any;
        }) {
            if (user) {
                token.id = user.id;
            }
            if (account?.access_token) {
                token.accessToken = account.access_token;
            }
            return token;
        },
        async session({
            session,
            token,
        }: {
            session: any;
            token: any;
        }) {
            session.user.id = token.id;
            session.accessToken = token.accessToken;
            return session;
        },
    },
    pages: {
        signIn: "/auth/signin",
    },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };