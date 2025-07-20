// src/app/auth/signin/page.tsx
"use client";

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function SignInPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [name, setName] = useState('');
    const [isSignUp, setIsSignUp] = useState(false);
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const result = await signIn('credentials', {
            redirect: false,
            email,
            password,
            confirmPassword,
            name,
            mode: isSignUp ? 'signup' : 'signin',
        });

        if (result?.ok) {
            router.push('/');
        } else {
            // Handle error
            console.error(result?.error);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center h-screen">
            <div className="p-8 border rounded-lg shadow-md w-full max-w-sm">
                <h1 className="text-2xl mb-4 text-center">{isSignUp ? 'Sign Up' : 'Sign In'}</h1>
                <form onSubmit={handleSubmit} className="space-y-4">
                    {isSignUp && (
                        <Input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Name"
                            required
                        />
                    )}
                    <Input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Email"
                        required
                    />
                    <Input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Password"
                        required
                    />
                    {isSignUp && (
                        <Input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="Confirm Password"
                            required
                        />
                    )}
                    <Button type="submit" className="w-full">
                        {isSignUp ? 'Sign Up' : 'Sign In'}
                    </Button>
                </form>
                <button
                    onClick={() => setIsSignUp(!isSignUp)}
                    className="mt-4 text-sm text-blue-500 hover:underline"
                >
                    {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
                </button>
            </div>
        </div>
    );
}