// src/app/page.tsx
"use client";

import { useState, useEffect, useRef } from 'react';
import { useSession, signIn, signOut } from 'next-auth/react';
import { api } from '@/utils/trpc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { UserStatusBanner } from '@/components/UserStatusBanner';
import { NextAuthProvider } from '@/components/providers/NextAuthProvider';
import { TRPCProvider } from '@/components/providers/TRPCProvider';
import { v4 as uuidv4 } from 'uuid';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { format, isToday, isYesterday } from 'date-fns';

function ChatPage() {
    const { data: session, status } = useSession();
    const [message, setMessage] = useState('');
    const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
    const utils = api.useUtils();
    const chatContainerRef = useRef<HTMLDivElement>(null);
    const [isLoading] = useState(false);

    const isAnonymous = session?.user?.isAnonymous ?? false;

    const conversationsQuery = api.chat.getConversations.useQuery(undefined, {
        enabled: !!session && !isAnonymous,
    });

    const messagesQuery = api.chat.getMessages.useQuery(
        { conversationId: activeConversationId! }, 
        { enabled: !!activeConversationId }
    );
    
    const createConversationMutation = api.chat.createConversation.useMutation();

    const sendMessageMutation = api.chat.sendMessage.useMutation({
        onMutate: async (newMessage) => {
            await utils.chat.getMessages.cancel({ conversationId: activeConversationId });
            const previousMessages = utils.chat.getMessages.getData({ conversationId: activeConversationId });
            utils.chat.getMessages.setData({ conversationId: activeConversationId }, (oldData) => {
                const optimisticMessage = {
                    id: uuidv4(),
                    conversationId: newMessage.conversationId,
                    userId: session!.user.id,
                    role: 'user' as const,
                    content: newMessage.content,
                    createdAt: new Date(),
                };
                return oldData ? [...oldData, optimisticMessage] : [optimisticMessage];
            });
            return { previousMessages };
        },
        onError: (err, newMessage, context) => {
            if (context?.previousMessages) {
                utils.chat.getMessages.setData({ conversationId: activeConversationId }, context.previousMessages);
            }
        },
        onSettled: () => {
            utils.chat.getMessages.invalidate({ conversationId: activeConversationId });
            if (!isAnonymous) {
                utils.chat.getConversations.invalidate();
            }
        },
    });

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        const contentToSend = message;
        if (!contentToSend.trim() || !session) return;
        setMessage('');
        let targetConvId = activeConversationId;
        if (!targetConvId) {
            try {
                const newConversation = await createConversationMutation.mutateAsync({
                    title: contentToSend.substring(0, 30)
                });
                if (!isAnonymous) {
                    utils.chat.getConversations.invalidate();
                }
                setActiveConversationId(newConversation.id);
                targetConvId = newConversation.id;
            } catch (error) {
                console.error("Failed to create conversation:", error);
                setMessage(contentToSend);
                return;
            }
        }
        sendMessageMutation.mutate({
            conversationId: targetConvId,
            content: contentToSend,
        });
    };
    
    const handleNewChat = () => {
        setActiveConversationId(null);
        setMessage('');
    };

    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [messagesQuery.data]);

    const formatHistoryTimestamp = (date: Date) => {
        if (isToday(date)) {
            return format(date, 'p');
        }
        if (isYesterday(date)) {
            return 'Yesterday';
        }
        return format(date, 'MMM d');
    };

    if (status === 'loading') {
        return <p className="flex h-screen items-center justify-center">Loading session...</p>;
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
        <div className="flex h-screen bg-gray-900 text-white">
            {!isAnonymous && (
                <aside className="w-64 flex-shrink-0 bg-gray-800 p-4 flex flex-col">
                    <Button onClick={handleNewChat} className="mb-4 w-full bg-blue-600 hover:bg-blue-700">
                        + New Chat
                    </Button>
                    <div className="flex-grow overflow-y-auto">
                        <h2 className="text-lg font-semibold mb-2">History</h2>
                        <ul className="space-y-1">
                            {conversationsQuery.data?.map((conv) => (
                                <li key={conv.id}>
                                    <button onClick={() => setActiveConversationId(conv.id)} className={`w-full text-left p-2 rounded-md ${activeConversationId === conv.id ? 'bg-blue-600' : 'hover:bg-gray-700'}`}>
                                        <div className="flex justify-between items-center w-full">
                                            <span className="truncate pr-2">{conv.title}</span>
                                            <span className="text-xs text-gray-400 flex-shrink-0">{formatHistoryTimestamp(new Date(conv.updatedAt))}</span>
                                        </div>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </div>
                    <div className="mt-auto">
                        <UserStatusBanner />
                        <Button onClick={() => signOut()} className="w-full mt-2">
                            Sign Out
                        </Button>
                    </div>
                </aside>
            )}

            <main className="flex-1 flex flex-col p-6">
                {isAnonymous && (
                    <div className="text-center mb-4 p-2 bg-blue-900/50 rounded-md text-sm">
                        You are chatting as a guest. <Button variant="link" className="p-0 h-auto" onClick={() => signIn()}>Sign in</Button> to save your history.
                    </div>
                )}
                <div ref={chatContainerRef} className="flex-grow overflow-y-auto mb-4 p-4 bg-gray-800 rounded-lg">
                    {(activeConversationId || isAnonymous) ? (
                        messagesQuery.data?.map((msg) => (
                            <div key={msg.id} className={`mb-4 w-fit max-w-[90%] ${msg.role === 'user' ? 'ml-auto' : 'mr-auto'}`}>
                                <div className={`p-3 rounded-lg text-black ${msg.role === 'user' ? 'bg-blue-400' : 'bg-gray-300'}`}>
                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                                </div>
                                <div className={`text-xs text-gray-500 mt-1 ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>{format(new Date(msg.createdAt), 'p')}</div>
                            </div>
                        ))
                    ) : (
                        <div className="flex h-full items-center justify-center"><p className="text-gray-400">Select a conversation or start a new one.</p></div>
                    )}
                    {isLoading && <p className="text-sm text-gray-400 mt-2">AI is thinking...</p>}
                </div>
                <form onSubmit={handleSendMessage} className="flex gap-4">
                    <Input type="text" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Type your message..." className="flex-grow bg-gray-700 border-gray-600 text-white" disabled={isLoading} />
                    <Button type="submit" disabled={isLoading || !message.trim()}>Send</Button>
                </form>
            </main>
        </div>
    );
}

export default function Home() {
    return (<NextAuthProvider><TRPCProvider><ChatPage /></TRPCProvider></NextAuthProvider>);
}