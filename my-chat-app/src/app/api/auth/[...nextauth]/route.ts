// src/app/api/auth/[...nextauth]/route.ts
import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { createClient } from "@supabase/supabase-js";
import type { AuthOptions } from "next-auth";
import { db } from "@/server/db/client";
import { users } from "@/server/db/schema";
import { eq } from "drizzle-orm";

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
            async authorize(credentials) {
                if (!credentials) throw new Error("No credentials provided.");
                const supabase = createClient(supabaseUrl, supabaseAnonKey);

                if (credentials.mode === 'anonymous') {
                    const { data, error } = await supabase.auth.signInAnonymously();
                    if (error) throw new Error(error.message);
                    if (!data.user) throw new Error("Could not create anonymous user.");
                    
                    //return "guest" user object for NextAuth to create session with
                    return {
                        id: data.user.id,
                        name: 'Guest',
                        email: null,
                        isAnonymous: true, // Set the flag
                    };
                }
                
                if (credentials.mode === "signup") {
                    if (credentials.password !== credentials.confirmPassword) throw new Error("Passwords do not match.");
                    const { data, error } = await supabase.auth.signUp({
                        email: credentials.email,
                        password: credentials.password,
                        options: { data: { full_name: credentials.name } },
                    });
                    if (error) throw new Error(error.message);
                    if (data.user && !data.session) throw new Error("SIGNUP_SUCCESS_VERIFY_EMAIL");
                    return { id: data.user!.id, email: data.user!.email, name: credentials.name };
                } else { // Sign-in logic
                    const { data, error } = await supabase.auth.signInWithPassword({
                        email: credentials.email,
                        password: credentials.password,
                    });
                    if (error) {
                        if (error.message.includes("Email not confirmed")) throw new Error("Please verify your email before signing in.");
                        throw new Error(error.message);
                    }
                    if (!data.user) throw new Error("User data not returned after sign in.");

                    //profile creation now happens on the first successful sign-in only
                    const existingProfile = await db.query.users.findFirst({ where: eq(users.id, data.user.id) });
                    
                    if (!existingProfile) {
                        await db.insert(users).values({
                            id: data.user.id,
                            email: data.user.email,
                            name: data.user.user_metadata.full_name,
                            isAnonymous: false,
                        });
                    }
                    const userName = data.user.user_metadata?.full_name || data.user.email;
                    return { id: data.user.id, email: data.user.email, name: userName };
                }
            },
        }),
    ],
    session: { strategy: "jwt" },
    jwt: { secret: process.env.NEXTAUTH_SECRET },
    callbacks: {
        jwt({ token, user }) {
            if (user) {
                token.id = user.id;
                token.name = user.name;
                token.isAnonymous = user.isAnonymous;
            }
            return token;
        },
        session({ session, token }) {
            if (session.user) {
                session.user.id = token.id as string;
                session.user.name = token.name as string;
                session.user.email = token.email as string;
                session.user.isAnonymous = token.isAnonymous as boolean;
            }
            return session;
        },
    },
    pages: { signIn: "/auth/signin" },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };