import { IgApiClient } from 'instagram-private-api';
import * as bcrypt from 'bcryptjs';
import {
  getInstagramAccountByUserId,
  createInstagramAccount,
  updateInstagramAccount,
  getBotConfig,
  upsertBotConfig,
  getTodayLimits,
  getLikesInLastHour,
  incrementDailyLimit,
  createActionLog,
  getActiveTargetAccounts,
  addScrapedUsers,
  getUnprocessedUsers,
  markUserAsProcessed,
  updateAnalytics,
} from './db';
import type { InsertScrapedUser, InsertActionLog } from '../drizzle/schema';
import fs from 'fs/promises';
import path from 'path';

interface BotInstance {
  ig: IgApiClient;
  userId: number;
  isRunning: boolean;
  lastSessionRefresh: Date;
  errorCount: number;
}

const activeBots = new Map<number, BotInstance>();

/**
 * Random delay between min and max seconds
 */
function randomDelay(minSeconds: number, maxSeconds: number): Promise<void> {
  const delay = (Math.random() * (maxSeconds - minSeconds) + minSeconds) * 1000;
  return new Promise(resolve => setTimeout(resolve, delay));
}

/**
 * Load session from public/session.json
 */
async function loadSessionFromFile(): Promise<any> {
  const sessionPath = path.join(process.cwd(), 'public', 'session.json');
  try {
    const data = await fs.readFile(sessionPath, 'utf-8');
    console.log('[Bot] Session loaded from public/session.json');
    return JSON.parse(data);
  } catch (e) {
    console.log('[Bot] No session file found, will try password login');
    return null;
  }
}

/**
 * Import session from JSON file (Instagrapi format)
 */
async function importSessionFromFile(sessionPath: string): Promise<any> {
  try {
    const sessionData = await fs.readFile(sessionPath, 'utf-8');
    return JSON.parse(sessionData);
  } catch (e) {
    throw new Error('Invalid session file');
  }
}

/**
 * Initialize Instagram client and login
 */
async function loginInstagram(username: string, password?: string, sessionData?: any): Promise<IgApiClient> {
  const ig = new IgApiClient();

  try {
    if (sessionData) {
      console.log('[Instagram Bot] Using provided session data...');

      const sessionObj = sessionData.session_data || sessionData;
      const authData = sessionData.authorization_data || sessionObj.authorization_data;

      // Set device identifiers
      if (sessionObj.uuids) {
        ig.state.deviceId = sessionObj.uuids.android_device_id || '';
        ig.state.uuid = sessionObj.uuids.uuid || '';
        ig.state.phoneId = sessionObj.uuids.phone_id || '';
        ig.state.adid = sessionObj.uuids.advertising_id || '';
      }

      // Set authorization cookies
      if (authData && authData.sessionid) {
        ig.state.cookieJar.setCookie(`ds_user_id=${authData.ds_user_id}; Domain=.instagram.com; Path=/`, 'https://www.instagram.com');
        ig.state.cookieJar.setCookie(`sessionid=${authData.sessionid}; Domain=.instagram.com; Path=/`, 'https://www.instagram.com');
      }

      // Verify session
      const user = await ig.account.currentUser();
      console.log(`[Instagram Bot] Logged in as @${user.username} (from session)`);
      return ig;

    } else if (password) {
      // Traditional login (fallback)
      ig.state.generateDevice(username);
      await ig.account.login(username, password);
      console.log(`[Instagram Bot] Logged in as @${username}`);
      return ig;

    } else {
      throw new Error('Either password or sessionData must be provided');
    }
  } catch (error: any) {
    console.error('[Instagram Bot] Login failed:', error.message);
    if (error.message.includes('400')) throw new Error('Invalid credentials');
    if (error.message.includes('403')) throw new Error('Account restricted');
    if (error.message.includes('login_required')) throw new Error('Session expired');
    throw new Error(`Instagram login failed: ${error.message}`);
  }
}

/**
 * Start the bot for a user
 */
export async function startBot(userId: number, username: string, password?: string, sessionData?: any): Promise<{ success: boolean; message: string }> {
  try {
    if (activeBots.has(userId)) {
      return { success: false, message: 'Bot is already running' };
    }

    // Get or create Instagram account
    let igAccount = await getInstagramAccountByUserId(userId);
    if (!igAccount) {
      const hashedPassword = password ? await bcrypt.hash(password, 10) : null;
      igAccount = await createInstagramAccount({
        userId,
        username,
        password: hashedPassword,
        isActive: true,
      });
    }

    // تحميل الـ session من الملف تلقائياً إذا لم يُمرَّر
    if (!sessionData) {
      sessionData = await loadSessionFromFile();
    }

    // Login to Instagram (session first, then password)
    const ig = await loginInstagram(username, password, sessionData);

    // Update last login
    await updateInstagramAccount(igAccount.id, {
      lastLoginAt: new Date(),
      sessionData: JSON.stringify(await ig.state.serialize()),
    });

    // Initialize bot config
    let config = await getBotConfig(userId);
    if (!config) {
      config = await upsertBotConfig({
        userId,
        likesPerHour: 62,
        followsPerDay: 100,
        minDelaySeconds: 30,
        maxDelaySeconds: 90,
        isRunning: true,
        lastStartedAt: new Date(),
        lastStoppedAt: null,
      });
    } else {
      await upsertBotConfig({ ...config, isRunning: true, lastStartedAt: new Date() });
    }

    // Store bot instance
    activeBots.set(userId, {
      ig,
      userId,
      isRunning: true,
      lastSessionRefresh: new Date(),
      errorCount: 0,
    });

    // Start bot loop
    runBotLoop(userId);

    await createActionLog({
      userId,
      actionType: 'follow',
      status: 'success',
      targetUsername: null,
      targetUrl: null,
      errorMessage: null,
      metadata: JSON.stringify({ event: 'bot_started', method: sessionData ? 'session' : 'password' }),
    });

    return { success: true, message: 'Bot started successfully' };

  } catch (error: any) {
    console.error('[Instagram Bot] Failed to start:', error);
    return { success: false, message: error.message || 'Failed to start bot' };
  }
}

/**
 * Stop the bot for a user
 */
export async function stopBot(userId: number): Promise<{ success: boolean; message: string }> {
  const bot = activeBots.get(userId);
  if (!bot) {
    return { success: false, message: 'Bot is not running' };
  }

  bot.isRunning = false;
  activeBots.delete(userId);

  await createActionLog({
    userId,
    actionType: 'follow',
    status: 'success',
    targetUsername: null,
    targetUrl: null,
    errorMessage: null,
    metadata: JSON.stringify({ event: 'bot_stopped' }),
  });

  return { success: true, message: 'Bot stopped successfully' };
}

/**
 * Check if bot is running
 */
export function isBotRunning(userId: number): boolean {
  return activeBots.has(userId);
}

/**
 * Get bot status
 */
export async function getBotStatus(userId: number) {
  const isRunning = isBotRunning(userId);
  const config = await getBotConfig(userId);
  const limits = await getTodayLimits(userId);
  const igAccount = await getInstagramAccountByUserId(userId);

  return {
    isRunning,
    config,
    limits: {
      followsToday: limits?.followsCount || 0,
      likesToday: limits?.likesCount || 0,
      storiesViewedToday: limits?.storiesViewedCount || 0,
      followsLimit: config?.followsPerDay || 100,
      likesLimit: config?.likesPerHour || 120,
    },
    account: igAccount ? {
      username: igAccount.username,
      lastLoginAt: igAccount.lastLoginAt,
    } : null,
  };
}
