import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, boolean, bigint } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Instagram accounts managed by the bot
 */
export const instagramAccounts = mysqlTable("instagram_accounts", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  username: varchar("username", { length: 255 }).notNull(),
  password: text("password"), // Optional - for username/password login
  sessionCookie: text("sessionCookie"), // Session cookie from browser
  sessionData: text("sessionData"), // Serialized session
  isActive: boolean("isActive").default(true).notNull(),
  lastLoginAt: timestamp("lastLoginAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type InstagramAccount = typeof instagramAccounts.$inferSelect;
export type InsertInstagramAccount = typeof instagramAccounts.$inferInsert;

/**
 * Target accounts to scrape followers/likers from
 */
export const targetAccounts = mysqlTable("target_accounts", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  username: varchar("username", { length: 255 }).notNull(),
  category: varchar("category", { length: 100 }), // e.g., "umrah", "hotels_mecca", "hotels_medina"
  isActive: boolean("isActive").default(true).notNull(),
  lastScrapedAt: timestamp("lastScrapedAt"),
  followerCount: int("followerCount").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type TargetAccount = typeof targetAccounts.$inferSelect;
export type InsertTargetAccount = typeof targetAccounts.$inferInsert;

/**
 * Bot configuration and limits
 */
export const botConfig = mysqlTable("bot_config", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  likesPerHour: int("likesPerHour").default(62).notNull(),
  followsPerDay: int("followsPerDay").default(100).notNull(),
  minDelaySeconds: int("minDelaySeconds").default(30).notNull(), // Min delay between actions
  maxDelaySeconds: int("maxDelaySeconds").default(90).notNull(), // Max delay between actions
  enableFollows: boolean("enableFollows").default(true).notNull(), // Enable/disable follow actions
  enableLikes: boolean("enableLikes").default(true).notNull(), // Enable/disable like actions
  isRunning: boolean("isRunning").default(false).notNull(),
  lastStartedAt: timestamp("lastStartedAt"),
  lastStoppedAt: timestamp("lastStoppedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type BotConfig = typeof botConfig.$inferSelect;
export type InsertBotConfig = typeof botConfig.$inferInsert;

/**
 * Daily action limits tracking
 */
export const dailyLimits = mysqlTable("daily_limits", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  date: varchar("date", { length: 10 }).notNull(), // YYYY-MM-DD format
  likesCount: int("likesCount").default(0).notNull(),
  followsCount: int("followsCount").default(0).notNull(),
  storiesViewedCount: int("storiesViewedCount").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type DailyLimit = typeof dailyLimits.$inferSelect;
export type InsertDailyLimit = typeof dailyLimits.$inferInsert;

/**
 * Bot action logs
 */
export const actionLogs = mysqlTable("action_logs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  actionType: mysqlEnum("actionType", ["follow", "like", "view_story", "scrape_followers", "scrape_likers"]).notNull(),
  targetUsername: varchar("targetUsername", { length: 255 }),
  targetUrl: text("targetUrl"),
  status: mysqlEnum("status", ["success", "failed", "skipped"]).notNull(),
  errorMessage: text("errorMessage"),
  metadata: text("metadata"), // JSON string for additional data
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ActionLog = typeof actionLogs.$inferSelect;
export type InsertActionLog = typeof actionLogs.$inferInsert;

/**
 * Scraped users queue (users to follow/like)
 */
export const scrapedUsers = mysqlTable("scraped_users", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  username: varchar("username", { length: 255 }).notNull(),
  instagramUserId: varchar("instagramUserId", { length: 255 }), // Instagram PK (user ID)
  sourceType: mysqlEnum("sourceType", ["follower", "liker"]).notNull(),
  sourceAccount: varchar("sourceAccount", { length: 255 }).notNull(), // Which target account they came from
  isProcessed: boolean("isProcessed").default(false).notNull(),
  isFollowed: boolean("isFollowed").default(false).notNull(),
  isLiked: boolean("isLiked").default(false).notNull(),
  processedAt: timestamp("processedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ScrapedUser = typeof scrapedUsers.$inferSelect;
export type InsertScrapedUser = typeof scrapedUsers.$inferInsert;

/**
 * Analytics and statistics
 */
export const analytics = mysqlTable("analytics", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  date: varchar("date", { length: 10 }).notNull(), // YYYY-MM-DD format
  totalFollows: int("totalFollows").default(0).notNull(),
  totalLikes: int("totalLikes").default(0).notNull(),
  totalStoriesViewed: int("totalStoriesViewed").default(0).notNull(),
  accountFollowerCount: int("accountFollowerCount").default(0), // User's Instagram follower count
  accountFollowingCount: int("accountFollowingCount").default(0), // User's Instagram following count
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Analytics = typeof analytics.$inferSelect;
export type InsertAnalytics = typeof analytics.$inferInsert;
