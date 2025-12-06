import { eq, and, desc, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { 
  InsertUser, 
  users,
  instagramAccounts,
  InsertInstagramAccount,
  InstagramAccount,
  targetAccounts,
  InsertTargetAccount,
  TargetAccount,
  botConfig,
  InsertBotConfig,
  BotConfig,
  dailyLimits,
  InsertDailyLimit,
  DailyLimit,
  actionLogs,
  InsertActionLog,
  ActionLog,
  scrapedUsers,
  InsertScrapedUser,
  ScrapedUser,
  analytics,
  InsertAnalytics,
  Analytics
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ============= USER MANAGEMENT =============

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ============= INSTAGRAM ACCOUNT MANAGEMENT =============

export async function createInstagramAccount(account: InsertInstagramAccount): Promise<InstagramAccount> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.insert(instagramAccounts).values(account);
  const [newAccount] = await db.select().from(instagramAccounts).where(eq(instagramAccounts.userId, account.userId)).orderBy(desc(instagramAccounts.id)).limit(1);
  return newAccount!;
}

export async function getInstagramAccountByUserId(userId: number): Promise<InstagramAccount | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(instagramAccounts).where(eq(instagramAccounts.userId, userId)).limit(1);
  return result[0];
}

export async function updateInstagramAccount(id: number, data: Partial<InsertInstagramAccount>): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(instagramAccounts).set(data).where(eq(instagramAccounts.id, id));
}

// ============= TARGET ACCOUNT MANAGEMENT =============

export async function createTargetAccount(account: InsertTargetAccount): Promise<TargetAccount> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.insert(targetAccounts).values(account);
  const [newAccount] = await db.select().from(targetAccounts).where(eq(targetAccounts.userId, account.userId)).orderBy(desc(targetAccounts.id)).limit(1);
  return newAccount!;
}

export async function getTargetAccountsByUserId(userId: number): Promise<TargetAccount[]> {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(targetAccounts).where(eq(targetAccounts.userId, userId)).orderBy(desc(targetAccounts.createdAt));
}

export async function getActiveTargetAccounts(userId: number): Promise<TargetAccount[]> {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(targetAccounts).where(
    and(eq(targetAccounts.userId, userId), eq(targetAccounts.isActive, true))
  );
}

export async function deleteTargetAccount(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(targetAccounts).where(eq(targetAccounts.id, id));
}

export async function updateTargetAccount(id: number, data: Partial<InsertTargetAccount>): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(targetAccounts).set(data).where(eq(targetAccounts.id, id));
}

// ============= BOT CONFIG MANAGEMENT =============

export async function getBotConfig(userId: number): Promise<BotConfig | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(botConfig).where(eq(botConfig.userId, userId)).limit(1);
  return result[0];
}

export async function upsertBotConfig(config: InsertBotConfig): Promise<BotConfig> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const existing = await getBotConfig(config.userId);
  
  if (existing) {
    await db.update(botConfig).set(config).where(eq(botConfig.userId, config.userId));
    return (await getBotConfig(config.userId))!;
  } else {
    const result = await db.insert(botConfig).values(config);
    return (await getBotConfig(config.userId))!;
  }
}

// ============= DAILY LIMITS TRACKING =============

export async function getTodayLimits(userId: number): Promise<DailyLimit | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  
  const today = new Date().toISOString().split('T')[0];
  const result = await db.select().from(dailyLimits).where(
    and(eq(dailyLimits.userId, userId), eq(dailyLimits.date, today))
  ).limit(1);
  
  return result[0];
}

export async function getLikesInLastHour(userId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const result = await db.select().from(actionLogs).where(
    and(
      eq(actionLogs.userId, userId),
      eq(actionLogs.actionType, 'like'),
      eq(actionLogs.status, 'success'),
      sql`${actionLogs.createdAt} >= ${oneHourAgo}`
    )
  );
  
  return result.length;
}

export async function incrementDailyLimit(userId: number, type: 'likes' | 'follows' | 'stories'): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const today = new Date().toISOString().split('T')[0];
  const existing = await getTodayLimits(userId);
  
  if (existing) {
    const updates: Partial<InsertDailyLimit> = {};
    if (type === 'likes') updates.likesCount = existing.likesCount + 1;
    if (type === 'follows') updates.followsCount = existing.followsCount + 1;
    if (type === 'stories') updates.storiesViewedCount = existing.storiesViewedCount + 1;
    
    await db.update(dailyLimits).set(updates).where(eq(dailyLimits.id, existing.id));
  } else {
    const newLimit: InsertDailyLimit = {
      userId,
      date: today,
      likesCount: type === 'likes' ? 1 : 0,
      followsCount: type === 'follows' ? 1 : 0,
      storiesViewedCount: type === 'stories' ? 1 : 0,
    };
    await db.insert(dailyLimits).values(newLimit);
  }
}

// ============= ACTION LOGS =============

export async function createActionLog(log: InsertActionLog): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.insert(actionLogs).values(log);
}

export async function getRecentActionLogs(userId: number, limit: number = 50): Promise<ActionLog[]> {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(actionLogs).where(eq(actionLogs.userId, userId)).orderBy(desc(actionLogs.createdAt)).limit(limit);
}

export async function getActionLogsByType(userId: number, actionType: ActionLog['actionType'], limit: number = 50): Promise<ActionLog[]> {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(actionLogs).where(
    and(eq(actionLogs.userId, userId), eq(actionLogs.actionType, actionType))
  ).orderBy(desc(actionLogs.createdAt)).limit(limit);
}

// ============= SCRAPED USERS QUEUE =============

export async function addScrapedUsers(users: InsertScrapedUser[]): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  if (users.length === 0) return;
  await db.insert(scrapedUsers).values(users);
}

export async function getUnprocessedUsers(userId: number, limit: number = 10): Promise<ScrapedUser[]> {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(scrapedUsers).where(
    and(eq(scrapedUsers.userId, userId), eq(scrapedUsers.isProcessed, false))
  ).limit(limit);
}

export async function markUserAsProcessed(id: number, followed: boolean, liked: boolean): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(scrapedUsers).set({
    isProcessed: true,
    isFollowed: followed,
    isLiked: liked,
    processedAt: new Date(),
  }).where(eq(scrapedUsers.id, id));
}

// ============= ANALYTICS =============

export async function getTodayAnalytics(userId: number): Promise<Analytics | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  
  const today = new Date().toISOString().split('T')[0];
  const result = await db.select().from(analytics).where(
    and(eq(analytics.userId, userId), eq(analytics.date, today))
  ).limit(1);
  
  return result[0];
}

export async function updateAnalytics(userId: number, data: Partial<InsertAnalytics>): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const today = new Date().toISOString().split('T')[0];
  const existing = await getTodayAnalytics(userId);
  
  if (existing) {
    await db.update(analytics).set(data).where(eq(analytics.id, existing.id));
  } else {
    await db.insert(analytics).values({
      userId,
      date: today,
      ...data,
    });
  }
}

export async function getAnalyticsHistory(userId: number, days: number = 7): Promise<Analytics[]> {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(analytics).where(eq(analytics.userId, userId)).orderBy(desc(analytics.date)).limit(days);
}
