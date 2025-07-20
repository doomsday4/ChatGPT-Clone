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

    //this function now uses NextAuth to handle the anonymous sign-in
    const handleAnonymousSignIn = async () => {
        setIsLoading(true);
        setNotification({ type: '', message: '' });

        //call signIn with special 'anonymous' mode.
        const result = await signIn('credentials', {
            redirect: false,
            mode: 'anonymous',
        });
        
        setIsLoading(false);
        if (result?.ok) {
            router.push('/');
        } else {
            setNotification({ type: 'error', message: result?.error || 'Guest login failed.' });
        }
    };

    return (
        <div className="flex flex-col items-center justify-center h-screen bg-gray-900 text-white">
            <div className="p-8 border rounded-lg shadow-md w-full max-w-sm bg-gray-800 border-gray-700">
                <h1 className="text-2xl mb-4 text-center">{isSignUp ? 'Create Account' : 'Sign In'}</h1>
                {notification.message && (
                    <div className={`p-3 mb-4 rounded-md text-center text-sm ${notification.type === 'success' ? 'bg-green-800 text-green-200' : 'bg-red-800 text-red-200'}`}>
                        {notification.message}
                    </div>
                )}
                <form onSubmit={handleSubmit} className="space-y-4">
                    {isSignUp && <Input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" required disabled={isLoading} />}
                    <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" required disabled={isLoading} />
                    <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" required disabled={isLoading} />
                    {isSignUp && <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirm Password" required disabled={isLoading} />}
                    <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" disabled={isLoading}>
                        {isLoading ? 'Loading...' : (isSignUp ? 'Sign Up' : 'Sign In')}
                    </Button>
                </form>
                <div className="relative flex py-5 items-center">
                    <div className="flex-grow border-t border-gray-600"></div>
                    <span className="flex-shrink mx-4 text-gray-400">OR</span>
                    <div className="flex-grow border-t border-gray-600"></div>
                </div>
                <Button onClick={handleAnonymousSignIn} variant="outline" className="w-full" disabled={isLoading}>
                    Continue as Guest
                </Button>
                <div className="text-center mt-4">
                    <button onClick={() => { setIsSignUp(!isSignUp); setNotification({ type: '', message: '' }); }} className="text-sm text-blue-400 hover:underline" disabled={isLoading}>
                        {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
                    </button>
                </div>
            </div>
        </div>
    );
}
