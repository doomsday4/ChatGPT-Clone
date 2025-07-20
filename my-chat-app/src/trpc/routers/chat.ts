// src/server/api/routers/chat.ts
import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { conversations, messages, users } from "@/server/db/schema";
import { eq, and } from "drizzle-orm";
import OpenAI from "openai";
import { db } from '@/server/db/client';
import { TRPCError } from "@trpc/server";
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);

export const chatRouter = router({
    getConversations: protectedProcedure
        .input(z.void())
        .query(async ({ ctx }) => {
            const userId = ctx.session.user.id;
            return await db.query.conversations.findMany({
                where: eq(conversations.userId, userId),
                orderBy: (conversations, { desc }) => [desc(conversations.updatedAt)],
            });
        }),
    getMessages: protectedProcedure
        .input(z.object({ conversationId: z.string().uuid().nullable() }).default({ conversationId: null }))
        .query(async ({ ctx, input }) => {
            if (!input.conversationId) return [];
            const userId = ctx.session.user.id;
            return await db.query.messages.findMany({
                where: and(eq(messages.conversationId, input.conversationId), eq(messages.userId, userId)),
                orderBy: (messages, { asc }) => [asc(messages.createdAt)],
            });
        }),

    createConversation: protectedProcedure
        .input(z.object({ title: z.string().optional() }).default({}))
        .mutation(async ({ ctx, input }) => {
            const { id, email, name } = ctx.session.user;

            // Step 1: Check if user profile already exist
            const existingUser = await db.query.users.findFirst({
                where: eq(users.id, id),
            });

            // Step 2: If doesn't exist, create
            if (!existingUser) {
                try {
                    await db.insert(users).values({ id, email, name, isAnonymous: false });
                } catch (error: any) {
                    // handles the rare edge case where email is already taken by another ID
                    if (error.code === '23505') {
                        console.warn(`User profile for email ${email} likely exists under another ID. Proceeding...`);
                    } else {
                        // For other database error, stop
                        throw new TRPCError({
                            code: 'INTERNAL_SERVER_ERROR',
                            message: 'Failed to create user profile.',
                            cause: error,
                        });
                    }
                }
            }

            // Step 3: once sure the user exists, create the conversation.
            const [newConversation] = await db.insert(conversations).values({
                userId: id,
                title: input.title || 'New Chat',
            }).returning();

            if (!newConversation) {
                throw new Error("Database failed to create a new conversation.");
            }
            return newConversation;
        }),
    
    sendMessage: protectedProcedure
        .input(z.object({
            conversationId: z.string().uuid(),
            content: z.string().min(1),
        }))
        .mutation(async ({ ctx, input }) => {
            const userId = ctx.session.user.id;

            await db.insert(messages).values({
                conversationId: input.conversationId,
                userId: userId,
                role: 'user',
                content: input.content,
            });

            // Retrieve full conversation history
            const previousMessages = await db.query.messages.findMany({
                where: and(eq(messages.conversationId, input.conversationId), eq(messages.userId, userId)),
                orderBy: (messages, { asc }) => [asc(messages.createdAt)],
            });

            const model = genAI.getGenerativeModel({ model: "gemini-2.5-pro" });

            const chatHistory = previousMessages.map(msg => ({
                role: msg.role === 'assistant' ? 'model' : 'user',
                parts: [{ text: msg.content }],
            }));

            // Remove the last message from history, as it's the new prompt
            const latestMessage = chatHistory.pop();
            if (!latestMessage) {
                throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'No message to send.' });
            }

            try {
                const chat = model.startChat({
                    history: chatHistory,
                    safetySettings: [
                        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
                        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
                    ],
                });

                const result = await chat.sendMessage(latestMessage.parts);
                const response = result.response;
                const assistantResponseContent = response.text();

                // Saving AI's response as well to the database
                const [assistantMessage] = await db.insert(messages).values({
                    conversationId: input.conversationId,
                    userId: userId,
                    role: 'assistant',
                    content: assistantResponseContent,
                }).returning();

                return { assistantMessage };

            } catch (error: any) {
                console.error("Google AI API Error:", error);
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Failed to get a response from the AI service.',
                    cause: error,
                });
            }
        }),
});
