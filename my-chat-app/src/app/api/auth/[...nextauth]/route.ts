import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { createClient } from "@supabase/supabase-js"; // Import Supabase client
import type { AuthOptions } from "next-auth";
import { email } from "zod";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;


export const authOptions: AuthOptions = {
    providers: [
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                email: { label: "Email", type: "text" },
                password: { label: "Password", type: "password" },
                confirmPassword: { label: "Confirm Password", type: "password" },
                name: { label: "Name", type: "text" },
                //a 'mode' to differentiate between sign-up and sign-in
                mode: { label: "Mode", type: "hidden" },
            },
            async authorize(credentials, req) {
                if (!credentials) {
                    throw new Error("No credentials provided.");
                }
                const supabase = createClient(supabaseUrl, supabaseAnonKey);

                if (credentials?.mode === "signup") {
                    //Sign-up Logic
                    if (credentials.password !== credentials.confirmPassword) {
                        throw new Error("Passwords do not match.");
                    }

                    const { data, error } = await supabase.auth.signUp({
                        email: credentials.email,
                        password: credentials.password,
                        // Pass user_metadata for Supabase to store the name
                        options: {
                            data: {
                                full_name: credentials.name, // Supabase often expects snake_case for metadata
                            },
                        },
                    });

                    if (error) {
                        console.error("Sign up error:", error.message);
                        throw new Error(error.message);
                    }

                    if (!data.user) {
                        throw new Error("User data not returned after sign up.");
                    }

                    // Return user data for the session
                    return {
                        id: data.user.id,
                        email: data.user.email,
                        name: credentials.name,
                        // other relevant user data as needed
                    };

                } else {
                    //Sign-in Logic
                    const { data, error } = await supabase.auth.signInWithPassword({
                        email: credentials.email,
                        password: credentials.password,
                    });

                    if (error) {
                        console.error("Sign in error:", error.message);
                        throw new Error(error.message);
                    }

                    if (!data.user) {
                        throw new Error("User data not returned after sign in.");
                    }

                    // For sign-in, try to fetch name from user_metadata or your public.users table
                    const user_name = data.user.user_metadata?.full_name || data.user.email; // Fallback to email
                    return {
                        id: data.user.id,
                        email: data.user.email,
                        name: user_name, // Add name for signed-in user
                    };
                }
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