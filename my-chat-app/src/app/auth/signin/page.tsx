// src/app/auth/signin/page.tsx
"use client";

import { useState, useEffect } from "react";
import { signIn, useSession } from "next-auth/react"; // Import useSession
import { useRouter } from "next/navigation";
import { supabase } from "@/utils/supabase"; // Ensure this path is correct

export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState(""); // New state for signup
  const [name, setName] = useState(""); // New state for signup
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [error, setError] = useState<string | null>(null); // Allow null for no error
  const [loading, setLoading] = useState(false); // New state for loading indicator
  const router = useRouter();
  const { status: sessionStatus } = useSession(); // Get session status

  // Redirect if already authenticated or if an anonymous session is active
  // We check sessionStatus to avoid redirect loops if useAuthStatus hasn't fully loaded
  useEffect(() => {
    // Only redirect if session is authenticated and not currently in a loading state
    if (sessionStatus === 'authenticated') {
      router.push("/");
    }
  }, [sessionStatus, router]); // Depend on sessionStatus and router

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null); // Clear previous errors
    setLoading(true); // Start loading

    if (mode === 'signup') {
      if (!name.trim()) {
        setError("Name is required for sign up.");
        setLoading(false);
        return;
      }
      if (password !== confirmPassword) {
        setError("Passwords do not match.");
        setLoading(false);
        return;
      }
    }

    try {
      const result = await signIn("credentials", {
        redirect: false, // Prevent NextAuth from redirecting automatically
        email,
        password,
        // Only pass these for signup mode
        confirmPassword: mode === 'signup' ? confirmPassword : undefined,
        name: mode === 'signup' ? name : undefined,
        mode, // Pass the mode to your NextAuth API route
      });

      if (result?.error) {
        setError(result.error);
      } else if (result?.ok) {
        // On successful sign-in/sign-up, NextAuth session will update
        // and useAuthStatus will handle ensuring the profile.
        // We can directly redirect to home page.
        router.push("/");
      }
    } catch (err: any) {
      console.error("Authentication error:", err);
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false); // End loading
    }
  };

  const handleGuestSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      // useAuthStatus already handles anonymous sign-in on load if no session.
      // Or, if you want to explicitly trigger it here:
      const { data, error: anonError } = await supabase.auth.signInAnonymously();
      if (anonError) {
        throw new Error(anonError.message);
      }
      router.push("/");
    } catch (err: any) {
      console.error("Guest sign-in error:", err);
      setError(err.message || "Failed to sign in as guest.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gray-100">
      <div className="w-full max-w-md bg-white p-8 rounded-lg shadow-md">
        <h2 className="text-3xl font-bold text-center mb-6 text-gray-800">
          {mode === "signin" ? "Sign In" : "Sign Up"}
        </h2>
        {error && (
          <p className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4">
            {error}
          </p>
        )}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              id="email"
              placeholder="your@example.com"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          {mode === "signup" && (
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input
                type="text"
                id="name"
                placeholder="John Doe"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
          )}

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              id="password"
              placeholder="********"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {mode === "signup" && (
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
              <input
                type="password"
                id="confirmPassword"
                placeholder="********"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
          )}

          <div className="flex flex-col gap-3">
            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-md shadow-sm transition-colors duration-200"
              disabled={loading}
            >
              {loading ? 'Processing...' : (mode === "signin" ? "Sign In" : "Sign Up")}
            </button>
            <button
              type="button"
              onClick={() => {
                setMode(mode === "signin" ? "signup" : "signin");
                setError(null); // Clear errors when switching mode
                setEmail(''); // Clear form fields
                setPassword('');
                setConfirmPassword('');
                setName('');
              }}
              className="w-full text-blue-600 hover:text-blue-800 font-medium py-2 text-sm transition-colors duration-200"
            >
              {mode === "signin"
                ? "Don't have an account? Sign Up"
                : "Already have an account? Sign In"}
            </button>
          </div>
        </form>

        <div className="mt-6 text-center">
          <span className="text-gray-600 text-sm">or</span>
          <button
            onClick={handleGuestSignIn}
            className="mt-3 w-full bg-gray-700 hover:bg-gray-800 text-white font-semibold py-2 px-4 rounded-md shadow-sm transition-colors duration-200"
            disabled={loading}
          >
            Continue as Guest
          </button>
        </div>
      </div>
    </div>
  );
}