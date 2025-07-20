// src/server/api/routers/chat.ts
import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { conversations, messages, users } from "@/server/db/schema";
import { eq, and } from "drizzle-orm";
import { db } from '@/server/db/client';
import { TRPCError } from "@trpc/server";
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";

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
    createConversation: protectedProcedure
        .input(z.object({ title: z.string().optional() }).default({}))
        .mutation(async ({ ctx, input }) => {
            const { id, email, name } = ctx.session.user;
            const existingUser = await db.query.users.findFirst({ where: eq(users.id, id) });
            if (!existingUser) {
                await db.insert(users).values({ id, email, name, isAnonymous: false }).catch((e) => {
                    if (e.code !== '23505') throw e;
                });
            }
            const [newConversation] = await db.insert(conversations).values({
                userId: id,
                title: input.title || 'New Chat',
            }).returning();

            if (!newConversation) {
                throw new Error("Database failed to create a new conversation.");
            }
            return newConversation;
        }),

    getMessages: protectedProcedure
        .input(z.object({ conversationId: z.string().uuid().nullable() }))
        .query(async ({ ctx, input }) => {
            if (!input.conversationId) return [];
            const userId = ctx.session.user.id;
            return await db.query.messages.findMany({
                where: and(eq(messages.conversationId, input.conversationId), eq(messages.userId, userId)),
                orderBy: (messages, { asc }) => [asc(messages.createdAt)],
            });
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

            const previousMessages = await db.query.messages.findMany({
                where: and(eq(messages.conversationId, input.conversationId), eq(messages.userId, userId)),
                orderBy: (messages, { asc }) => [asc(messages.createdAt)],
            });

            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });
            const chatHistory = previousMessages.map(msg => ({
                role: msg.role === 'assistant' ? 'model' : 'user',
                parts: [{ text: msg.content }],
            }));

            const latestMessage = chatHistory.pop();
            if (!latestMessage) {
                throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'No message to send.' });
            }

            try {
                const chat = model.startChat({ history: chatHistory });
                const result = await chat.sendMessage(latestMessage.parts);
                const response = result.response;
                const assistantResponseContent = response.text();

                // Save AI response to database
                const [assistantMessage] = await db.insert(messages).values({
                    conversationId: input.conversationId,
                    userId: userId,
                    role: 'assistant',
                    content: assistantResponseContent,
                }).returning();

                await db.update(conversations)
                    .set({ updatedAt: new Date() })
                    .where(eq(conversations.id, input.conversationId));

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
