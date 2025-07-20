// src/app/api/auth/[...nextauth]/route.ts
import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { createClient } from "@supabase/supabase-js";
import type { AuthOptions } from "next-auth";

//imports for Drizzle
import { db } from "@/server/db/client";
import { users } from "@/server/db/schema";

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
                        options: {
                            data: {
                                full_name: credentials.name,
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

                    // After creating auth user, insert data into public `users` table.
                    try {
                        await db.insert(users).values({
                            id: data.user.id,
                            email: data.user.email,
                            name: credentials.name,
                            isAnonymous: false,
                        });
                    } catch (dbError) {
                        console.error("Database error creating user profile:", dbError);
                        // If this fails, auth user created but public profile was not.
                        throw new Error("Failed to create user profile after sign up.");
                    }

                    // Return user data for the session
                    return {
                        id: data.user.id,
                        email: data.user.email,
                        name: credentials.name,
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

                    const user_name = data.user.user_metadata?.full_name || data.user.email;
                    return {
                        id: data.user.id,
                        email: data.user.email,
                        name: user_name,
                    };
                }
            },
        }),
    ],
    session: {
        strategy: "jwt" as const,
    },
    jwt: {
        secret: process.env.NEXTAUTH_SECRET,
    },
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id;
                token.name = user.name as string;
            }
            return token;
        },
        async session({ session, token }) {
            if (session.user) {
                session.user.id = token.id as string;
                session.user.name = token.name as string;
            }
            return session;
        },
    },
    pages: {
        signIn: "/auth/signin",
    },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };