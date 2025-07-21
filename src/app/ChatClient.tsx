// src/app/ChatClient.tsx
"use client";

import { useState, useEffect, useRef } from 'react';
import { useSession, signIn, signOut } from 'next-auth/react';
import { api } from '@/utils/trpc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { UserStatusBanner } from '@/components/UserStatusBanner';
import { v4 as uuidv4 } from 'uuid';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { format, isToday, isYesterday } from 'date-fns';
import { SendHorizontal, Menu, X, Bot, User, Plus, Check, Copy } from 'lucide-react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/cjs/styles/prism';

const CodeBlock = ({ node, inline, className, children, ...props }: any) => {
    const [isCopied, setIsCopied] = useState(false);
    const match = /language-(\w+)/.exec(className || '');
    const codeString = String(children).replace(/\n$/, '');

    const handleCopy = () => {
        navigator.clipboard.writeText(codeString);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000); // Revert after 2 seconds
    };

    return !inline && match ? (
        <div className="relative my-4 rounded-lg bg-[#1E1E1E]">
            <div className="flex items-center justify-between px-4 py-2 bg-gray-700/50 rounded-t-lg">
                <span className="text-xs font-sans text-gray-400">{match[1]}</span>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-white" onClick={handleCopy}>
                    {isCopied ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
                </Button>
            </div>
            <SyntaxHighlighter
                style={vscDarkPlus}
                language={match[1]}
                PreTag="div"
                {...props}
            >
                {codeString}
            </SyntaxHighlighter>
        </div>
    ) : (
        <code className="bg-gray-700 text-red-400 rounded px-1.5 py-1 font-mono text-sm" {...props}>
            {children}
        </code>
    );
};

export default function ChatClient() {
    const { data: session } = useSession();
    const [message, setMessage] = useState('');
    const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
    const utils = api.useUtils();
    const chatContainerRef = useRef<HTMLDivElement>(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
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
                const newConversation = await createConversationMutation.mutateAsync({ title: contentToSend.substring(0, 30) });
                if (!isAnonymous) utils.chat.getConversations.invalidate();
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
        setIsSidebarOpen(false);
    };

    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [messagesQuery.data]);

    const formatHistoryTimestamp = (date: Date) => {
        if (isToday(date)) return format(date, 'p');
        if (isYesterday(date)) return 'Yesterday';
        return format(date, 'MMM d');
    };

    return (
        <div className="flex h-screen w-full bg-gray-100 dark:bg-black overflow-hidden font-sans">
            <aside className={`absolute top-0 left-0 h-full z-20 w-72 flex-shrink-0 bg-black p-4 flex flex-col transition-transform duration-300 ease-in-out 
                ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} 
                md:relative md:translate-x-0`}>
                <div className="flex items-center justify-between mb-4">
                    <h1 className="text-xl font-semibold text-white">Chat History</h1>
                    <Button variant="ghost" size="icon" className="md:hidden text-gray-400 hover:text-white" onClick={() => setIsSidebarOpen(false)}>
                        <X className="h-6 w-6" />
                    </Button>
                </div>
                <Button onClick={handleNewChat} className="mb-4 w-full bg-blue-700 text-white hover:bg-blue-600 flex items-center gap-2 font-semibold">
                    <Plus className="h-4 w-4" /> New Chat
                </Button>
                <div className="flex-grow overflow-y-auto -mr-2 pr-2">
                    <ul className="space-y-1">
                        {conversationsQuery.data?.map((conv) => (
                            <li key={conv.id}>
                                <button onClick={() => { setActiveConversationId(conv.id); setIsSidebarOpen(false); }} className={`w-full text-left p-2.5 rounded-lg transition-colors duration-200 ${activeConversationId === conv.id ? 'bg-blue-600/20 text-white' : 'text-gray-300 hover:bg-white/10'}`}>
                                    <div className="flex justify-between items-center w-full">
                                        <span className="truncate pr-2 text-sm font-medium">{conv.title}</span>
                                        <span className="text-xs text-gray-500 flex-shrink-0">{formatHistoryTimestamp(new Date(conv.updatedAt))}</span>
                                    </div>
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>
                <div className="mt-auto pt-4 border-t border-white/10">
                    <UserStatusBanner />
                    <Button onClick={() => signOut()} className="w-full mt-2 bg-red-600/30 text-red-300 hover:bg-red-600/40 hover:text-red-200 font-semibold">
                        Sign Out
                    </Button>
                </div>
            </aside>

            {isSidebarOpen && <div className="fixed inset-0 bg-black/60 z-10 md:hidden" onClick={() => setIsSidebarOpen(false)}></div>}

            <main className="flex-1 flex flex-col bg-white dark:bg-gray-900/50">
                <header className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-white/10">
                    <Button variant="ghost" size="icon" className="md:hidden text-gray-800 dark:text-white" onClick={() => setIsSidebarOpen(true)}>
                        <Menu className="h-6 w-6" />
                    </Button>
                    <h2 className="text-lg font-semibold text-gray-800 dark:text-white truncate">
                        {activeConversationId ? conversationsQuery.data?.find(c => c.id === activeConversationId)?.title : "New Conversation"}
                    </h2>
                    <div className="w-8 h-8"></div>
                </header>

                <div ref={chatContainerRef} className="flex-grow overflow-y-auto p-6 space-y-6">
                    {activeConversationId ? (
                        messagesQuery.data?.map((msg) => (
                            <div key={msg.id} className={`flex items-start gap-4 max-w-2xl ${msg.role === 'user' ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}>
                                <div className={`flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center ${msg.role === 'user' ? 'bg-blue-600' : 'bg-gray-700'}`}>
                                    {msg.role === 'user' ? <User className="h-5 w-5 text-white" /> : <Bot className="h-5 w-5 text-white" />}
                                </div>
                                <div className={`px-4 py-3 rounded-2xl text-base ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-br-lg' : 'bg-gray-200 dark:bg-gray-800 text-gray-900 dark:text-white rounded-bl-lg'}`}>
                                    <ReactMarkdown
                                        remarkPlugins={[remarkGfm]}
                                        components={{ code: CodeBlock }}
                                    >
                                        {msg.content}</ReactMarkdown>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="flex h-full items-center justify-center text-center">
                            <div>
                                <div className="inline-block p-4 bg-gray-200 dark:bg-gray-800 rounded-full">
                                    <Bot className="w-12 h-12 text-gray-500 dark:text-gray-400" />
                                </div>
                                <h1 className="mt-6 text-4xl font-bold text-gray-800 dark:text-white">AI Chatbot</h1>
                                <p className="text-gray-500 dark:text-gray-400 mt-2">Your intelligent assistant is ready. Start a new chat to begin.</p>
                            </div>
                        </div>
                    )}
                    {isLoading && (
                        <div className="flex items-start gap-4 max-w-2xl mr-auto">
                            <div className="flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center bg-gray-700">
                                <Bot className="h-5 w-5 text-white" />
                            </div>
                            <div className="px-4 py-3 rounded-2xl bg-gray-200 dark:bg-gray-800">
                                <div className="flex items-center gap-2">
                                    <div className="h-2 w-2 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                                    <div className="h-2 w-2 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                                    <div className="h-2 w-2 bg-blue-500 rounded-full animate-bounce"></div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="px-6 py-4 bg-white dark:bg-gray-900/50 border-t border-gray-200 dark:border-white/10">
                    <form onSubmit={handleSendMessage} className="flex items-center gap-2 bg-gray-100 dark:bg-black rounded-xl p-2 border-2 border-transparent transition-colors">
                        <Input
                            type="text"
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder="Ask me anything..."
                            className="flex-grow bg-transparent border-none focus:ring-0 text-gray-900 dark:text-white text-base"
                            disabled={isLoading}
                        />
                        <Button type="submit" size="icon" className="bg-blue-700 hover:bg-blue-600 rounded-lg w-10 h-10 flex-shrink-0" disabled={isLoading || !message.trim()}>
                            <SendHorizontal className="h-5 w-5 text-white" />
                        </Button>
                    </form>
                </div>
            </main>
        </div>
    );
}
