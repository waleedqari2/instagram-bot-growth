import { z } from "zod";
import { eq } from "drizzle-orm";
import { instagramAccounts, botConfig, dailyLimits, actionLogs, scrapedUsers, targetAccounts } from "../drizzle/schema";
import { getDb } from "./db";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import {
  getTargetAccountsByUserId,
  createTargetAccount,
  deleteTargetAccount,
  updateTargetAccount,
  getBotConfig,
  upsertBotConfig,
  getTodayLimits,
  getRecentActionLogs,
  getAnalyticsHistory,
  getTodayAnalytics,
  getInstagramAccountByUserId,
} from "./db";
import {
  startBot,
  stopBot,
  getBotStatus,
  isBotRunning,
} from "./instagram-bot";

export const appRouter = router({
  system: systemRouter,
  
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // Bot control
  bot: router({
    // Get bot status
    status: protectedProcedure.query(async ({ ctx }) => {
      return await getBotStatus(ctx.user.id);
    }),

    // Start bot
    start: protectedProcedure
      .input(z.object({
        username: z.string().min(1),
        password: z.string().optional(),
        sessionData: z.any().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        return await startBot(ctx.user.id, input.username, input.password, input.sessionData);
      }),

    // Stop bot
    stop: protectedProcedure.mutation(async ({ ctx }) => {
      return await stopBot(ctx.user.id);
    }),

    // Disconnect Instagram account
    disconnect: protectedProcedure.mutation(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      // Stop bot first if running
      await stopBot(ctx.user.id);

      // Delete all user data
      await db.delete(instagramAccounts).where(eq(instagramAccounts.userId, ctx.user.id));
      await db.delete(botConfig).where(eq(botConfig.userId, ctx.user.id));
      await db.delete(dailyLimits).where(eq(dailyLimits.userId, ctx.user.id));
      await db.delete(actionLogs).where(eq(actionLogs.userId, ctx.user.id));
      await db.delete(scrapedUsers).where(eq(scrapedUsers.userId, ctx.user.id));
      await db.delete(targetAccounts).where(eq(targetAccounts.userId, ctx.user.id));

      return { success: true, message: 'Instagram account disconnected successfully' };
    }),

    // Get bot config
    getConfig: protectedProcedure.query(async ({ ctx }) => {
      const config = await getBotConfig(ctx.user.id);
      // Return default config if none exists
      if (!config) {
        return {
          id: 0,
          userId: ctx.user.id,
          likesPerHour: 62,
          followsPerDay: 100,
          minDelaySeconds: 30,
          maxDelaySeconds: 90,
          enableFollows: true,
          enableLikes: true,
          isRunning: false,
          lastStartedAt: null,
          lastStoppedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
      }
      return config;
    }),

    // Update bot config
    updateConfig: protectedProcedure
      .input(z.object({
        likesPerHour: z.number().min(1).max(200).optional(),
        followsPerDay: z.number().min(1).max(200).optional(),
        minDelaySeconds: z.number().min(10).max(300).optional(),
        maxDelaySeconds: z.number().min(10).max(300).optional(),
        enableFollows: z.boolean().optional(),
        enableLikes: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const existing = await getBotConfig(ctx.user.id);
        
        await upsertBotConfig({
          userId: ctx.user.id,
          likesPerHour: input.likesPerHour ?? existing?.likesPerHour ?? 62,
          followsPerDay: input.followsPerDay ?? existing?.followsPerDay ?? 100,
          minDelaySeconds: input.minDelaySeconds ?? existing?.minDelaySeconds ?? 30,
          maxDelaySeconds: input.maxDelaySeconds ?? existing?.maxDelaySeconds ?? 90,
          enableFollows: input.enableFollows ?? existing?.enableFollows ?? true,
          enableLikes: input.enableLikes ?? existing?.enableLikes ?? true,
          isRunning: existing?.isRunning ?? false,
        });

        return { success: true };
      }),
  }),

  // Target accounts management
  targets: router({
    // List all target accounts
    list: protectedProcedure.query(async ({ ctx }) => {
      return await getTargetAccountsByUserId(ctx.user.id);
    }),

    // Add target account
    add: protectedProcedure
      .input(z.object({
        username: z.string().min(1),
        category: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const account = await createTargetAccount({
          userId: ctx.user.id,
          username: input.username,
          category: input.category || null,
          isActive: true,
        });
        return account;
      }),

    // Delete target account
    delete: protectedProcedure
      .input(z.object({
        id: z.number(),
      }))
      .mutation(async ({ ctx, input }) => {
        await deleteTargetAccount(input.id);
        return { success: true };
      }),

    // Toggle target account active status
    toggle: protectedProcedure
      .input(z.object({
        id: z.number(),
        isActive: z.boolean(),
      }))
      .mutation(async ({ ctx, input }) => {
        await updateTargetAccount(input.id, {
          isActive: input.isActive,
        });
        return { success: true };
      }),
  }),

  // Activity logs
  logs: router({
    // Get recent logs
    recent: protectedProcedure
      .input(z.object({
        limit: z.number().min(1).max(200).optional(),
      }))
      .query(async ({ ctx, input }) => {
        return await getRecentActionLogs(ctx.user.id, input.limit || 50);
      }),
  }),

  // Analytics and statistics
  analytics: router({
    // Get today's stats
    today: protectedProcedure.query(async ({ ctx }) => {
      const limits = await getTodayLimits(ctx.user.id);
      const analytics = await getTodayAnalytics(ctx.user.id);
      
      return {
        followsToday: limits?.followsCount || 0,
        likesToday: limits?.likesCount || 0,
        storiesViewedToday: limits?.storiesViewedCount || 0,
        accountFollowerCount: analytics?.accountFollowerCount || 0,
        accountFollowingCount: analytics?.accountFollowingCount || 0,
      };
    }),

    // Get history
    history: protectedProcedure
      .input(z.object({
        days: z.number().min(1).max(90).optional(),
      }))
      .query(async ({ ctx, input }) => {
        return await getAnalyticsHistory(ctx.user.id, input.days || 7);
      }),
  }),

  // Instagram account info
  account: router({
    // Get connected Instagram account
    info: protectedProcedure.query(async ({ ctx }) => {
      const account = await getInstagramAccountByUserId(ctx.user.id);
      if (!account) return null;
      
      return {
        username: account.username,
        lastLoginAt: account.lastLoginAt,
        isActive: account.isActive,
      };
    }),
  }),
});

export type AppRouter = typeof appRouter;
