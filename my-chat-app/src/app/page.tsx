// src/app/page.tsx
"use client";

import { useState, useRef, useEffect } from 'react';
import { useSession, signIn, signOut } from 'next-auth/react';
import { api } from '@/utils/trpc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { UserStatusBanner } from '@/components/UserStatusBanner';
import { NextAuthProvider } from '@/components/providers/NextAuthProvider';
import { TRPCProvider } from '@/components/providers/TRPCProvider';

function ChatPage() {
    const { data: session, status } = useSession();
    const [message, setMessage] = useState('');
    const [conversationId, setConversationId] = useState<string | null>(null);

    // tRPC hooks
    // const conversations = api.chat.getConversations.useQuery(
    //     undefined, 
    //     {
    //         enabled: !!session,
    //     }
    // );
    const messages = api.chat.getMessages.useQuery(
        { conversationId: conversationId! }, // Assert that conversationId is not null here
        {
            // This `enabled` flag ensures the query only runs when conversationId is a valid string.
            enabled: !!conversationId,
        }
    );
    const sendMessageMutation = api.chat.sendMessage.useMutation({
        onSuccess: () => {
            messages.refetch();
        },
    });
    const createConversationMutation = api.chat.createConversation.useMutation({
        onSuccess: (data) => {
            setConversationId(data.id);
        },
    });

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!message.trim() || !session) return;

        let currentConversationId = conversationId;

        if (!currentConversationId) {
            const newConversation = await createConversationMutation.mutateAsync({
                userId: ''
            });
            currentConversationId = newConversation.id;
        }

        if (currentConversationId) {
            sendMessageMutation.mutate({
              conversationId: currentConversationId,
              content: message,
            });
            setMessage('');
        }
    };

    if (status === 'loading') {
        return <p>Loading...</p>;
    }

    if (!session) {
        return (
            <div className="flex flex-col items-center justify-center h-screen">
                <h1 className="text-2xl mb-4">Welcome to the Chatbot</h1>
                <Button onClick={() => signIn()}>Sign In</Button>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-screen max-w-2xl mx-auto p-4">
            <UserStatusBanner />
            <div className="flex justify-between items-center mb-4">
                <h1 className="text-xl">Your Conversations</h1>
                <Button onClick={() => signOut()}>Sign Out</Button>
            </div>
            <div className="flex-grow overflow-y-auto border p-4 rounded-lg mb-4">
                {messages.data?.map((msg) => (
                    <div
                        key={msg.id}
                        className={`mb-2 p-2 rounded-md ${
                            msg.role === 'user' ? 'bg-blue-100 text-right' : 'bg-gray-100'
                        }`}
                    >
                        <p className="text-sm text-gray-600">{msg.role}</p>
                        <p>{msg.content}</p>
                    </div>
                ))}
            </div>
            <form onSubmit={handleSendMessage} className="flex gap-2">
                <Input
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Type your message..."
                    className="flex-grow"
                />
                <Button type="submit">Send</Button>
            </form>
        </div>
    );
}

export default function Home() {
    return (
        <NextAuthProvider>
            <TRPCProvider>
                <ChatPage />
            </TRPCProvider>
        </NextAuthProvider>
    );
}