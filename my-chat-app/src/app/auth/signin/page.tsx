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
    const [notification, setNotification] = useState({ type: '', message: '' });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setNotification({ type: '', message: '' });

        try {
            const result = await signIn('credentials', {
                redirect: false,
                email,
                password,
                confirmPassword,
                name,
                mode: isSignUp ? 'signup' : 'signin',
            });

            if (result?.ok) {
                router.push('/'); // Successful sign-in => go to main chat page
            } else if (result?.error) {
                if (result.error.includes("SIGNUP_SUCCESS_VERIFY_EMAIL")) {
                    setNotification({ type: 'success', message: 'Sign-up successful! Please check your email to verify your account.' });
                    setIsSignUp(false); // Switch back to the sign-in form
                } else {
                    setNotification({ type: 'error', message: result.error });
                }
            }
        } catch (error) {
            console.error("An unexpected error occurred:", error);
            setNotification({ type: 'error', message: 'An unexpected error occurred. Please try again.' });
        }
    };

    return (
        <div className="flex flex-col items-center justify-center h-screen bg-gray-900 text-white">
            <div className="p-8 border rounded-lg shadow-md w-full max-w-sm bg-gray-800 border-gray-700">
                <h1 className="text-2xl mb-4 text-center">{isSignUp ? 'Create Account' : 'Sign In'}</h1>
                
                {notification.message && (
                    <div className={`p-3 mb-4 rounded-md text-center text-sm ${
                        notification.type === 'success' ? 'bg-green-800 text-green-200' : 'bg-red-800 text-red-200'
                    }`}>
                        {notification.message}
                    </div>
                )}
                
                <form onSubmit={handleSubmit} className="space-y-4">
                    {isSignUp && (
                        <Input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" required />
                    )}
                    <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" required />
                    <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" required />
                    {isSignUp && (
                        <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirm Password" required />
                    )}
                    <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700">
                        {isSignUp ? 'Sign Up' : 'Sign In'}
                    </Button>
                </form>
                <div className="text-center mt-4">
                    <button
                        onClick={() => {
                            setIsSignUp(!isSignUp);
                            setNotification({ type: '', message: '' }); // Clear notification on switch
                        }}
                        className="text-sm text-blue-400 hover:underline"
                    >
                        {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
                    </button>
                </div>
            </div>
        </div>
    );
}