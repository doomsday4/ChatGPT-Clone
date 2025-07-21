// src/app/auth/signin/page.tsx
"use client";

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Bot, Mail, KeyRound, User } from 'lucide-react';

export default function SignInPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [name, setName] = useState('');
    const [isSignUp, setIsSignUp] = useState(false);
    const [notification, setNotification] = useState({ type: '', message: '' });
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setNotification({ type: '', message: '' });

        const result = await signIn('credentials', {
            redirect: false,
            email,
            password,
            confirmPassword,
            name,
            mode: isSignUp ? 'signup' : 'signin',
        });

        setIsLoading(false);
        if (result?.ok) {
            router.push('/');
        } else if (result?.error) {
            if (result.error.includes("SIGNUP_SUCCESS_VERIFY_EMAIL")) {
                setNotification({ type: 'success', message: 'Sign-up successful! Please check your email to verify your account.' });
                setIsSignUp(false);
            } else {
                setNotification({ type: 'error', message: result.error });
            }
        }
    };

    const handleAnonymousSignIn = async () => {
        setIsLoading(true);
        const result = await signIn('credentials', { redirect: false, mode: 'anonymous' });
        if (result?.ok) {
            router.push('/');
        } else {
            setNotification({ type: 'error', message: result?.error || 'Guest login failed.' });
            setIsLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
            <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-2xl shadow-xl dark:bg-gray-800">
                <div className="text-center">
                    <div className="inline-block p-3 bg-blue-100 rounded-full dark:bg-blue-900/50">
                        <Bot className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                    </div>
                    <h1 className="mt-4 text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
                        {isSignUp ? 'Create Your Account' : 'Welcome!'}
                    </h1>
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                        {isSignUp ? 'Get started with your personal AI assistant.' : 'Sign in to access your conversations.'}
                    </p>
                </div>

                {notification.message && (
                    <div className={`p-3 rounded-md text-center text-sm font-medium ${notification.type === 'success' ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300' : 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300'}`}>
                        {notification.message}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    {isSignUp && (
                        <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                            <Input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" required disabled={isLoading} className="pl-10" />
                        </div>
                    )}
                    <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" required disabled={isLoading} className="pl-10" />
                    </div>
                    <div className="relative">
                        <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" required disabled={isLoading} className="pl-10" />
                    </div>
                    {isSignUp && (
                        <div className="relative">
                            <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                            <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirm Password" required disabled={isLoading} className="pl-10" />
                        </div>
                    )}
                    <div className='text-center'>
                        <Button type="submit" variant={"outline"} className="w-half font-semibold" disabled={isLoading}>
                            {isLoading ? 'Loading...' : (isSignUp ? 'Create Account' : 'Sign In')}
                        </Button>
                    </div>
                </form>

                <div className="text-center">
                    <button onClick={() => { setIsSignUp(!isSignUp); setNotification({ type: '', message: '' }); }} className="text-sm font-medium text-blue-600 hover:underline dark:text-blue-400" disabled={isLoading}>
                        {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
                    </button>
                </div>

                <div className="relative flex items-center">
                    <div className="flex-grow border-t border-gray-200 dark:border-gray-700"></div>
                    <span className="flex-shrink mx-4 text-xs text-gray-500 dark:text-gray-400">OR</span>
                    <div className="flex-grow border-t border-gray-200 dark:border-gray-700"></div>
                </div>

                <Button onClick={handleAnonymousSignIn} variant="outline" className="w-full font-semibold" disabled={isLoading}>
                    Continue as Guest
                </Button>
            </div>
        </div>
    );
}
