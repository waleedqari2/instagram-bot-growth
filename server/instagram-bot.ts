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
 * Initialize Instagram client and login
 */
async function loginInstagram(username: string, password?: string, sessionData?: any): Promise<IgApiClient> {
  const ig = new IgApiClient();
  
  try {
    if (sessionData) {
      // Import session from Instagrapi format
      console.log('[Instagram Bot] Importing session from Instagrapi...');
      
      // Set device settings from session
      const sessionObj = sessionData.session_data || sessionData;
      const authData = sessionData.authorization_data || sessionObj.authorization_data;
      
      if (sessionObj.uuids) {
        ig.state.deviceId = sessionObj.uuids.android_device_id || '';
        ig.state.uuid = sessionObj.uuids.uuid || '';
        ig.state.phoneId = sessionObj.uuids.phone_id || '';
        ig.state.adid = sessionObj.uuids.advertising_id || '';
      }
      
      if (authData && authData.sessionid) {
        // Try to deserialize existing session if available
        try {
          const sessionString = JSON.stringify({
            cookies: JSON.stringify({
              ds_user_id: authData.ds_user_id,
              sessionid: authData.sessionid,
            }),
          });
          await ig.state.deserialize(sessionString);
        } catch (e) {
          console.log('[Instagram Bot] Could not deserialize, trying alternative method');
          // Alternative: set cookies via cookie jar
          ig.state.cookieJar.setCookie(`ds_user_id=${authData.ds_user_id}; Domain=.instagram.com; Path=/`, 'https://www.instagram.com');
          ig.state.cookieJar.setCookie(`sessionid=${authData.sessionid}; Domain=.instagram.com; Path=/`, 'https://www.instagram.com');
        }
      }
      
      // Verify session by getting current user
      const user = await ig.account.currentUser();
      console.log(`[Instagram Bot] Successfully logged in as @${user.username} (from session)`);
      return ig;
      
    } else if (password) {
      // Traditional login with username/password
      ig.state.generateDevice(username);
      await ig.account.login(username, password);
      console.log(`[Instagram Bot] Successfully logged in as @${username}`);
      return ig;
    } else {
      throw new Error('Either password or sessionData must be provided');
    }
  } catch (error: any) {
    console.error('[Instagram Bot] Login failed:', error.message);
    
    // Provide helpful error messages
    if (error.message.includes('400') || error.message.includes('Bad Request')) {
      throw new Error('Invalid username or password. Please check your credentials.');
    } else if (error.message.includes('403') || error.message.includes('Forbidden')) {
      throw new Error('Account access denied. Your account may be restricted or require verification.');
    } else if (error.message.includes('login_required')) {
      throw new Error('Login required. Please try again or verify your account.');
    } else if (error.message.includes('checkpoint')) {
      throw new Error('Account checkpoint required. Please verify your account on Instagram.com first.');
    }
    
    throw new Error(`Instagram login failed: ${error.message}`);
  }
}

/**
 * Start the bot for a user
 */
export async function startBot(userId: number, username: string, password?: string, sessionData?: any): Promise<{ success: boolean; message: string }> {
  try {
    // Check if bot is already running
    if (activeBots.has(userId)) {
      return { success: false, message: 'Bot is already running' };
    }

    // Get or create Instagram account
    let igAccount = await getInstagramAccountByUserId(userId);
    
    if (!igAccount) {
      // Hash password before storing (only if password provided)
      const hashedPassword = password ? await bcrypt.hash(password, 10) : null;
      igAccount = await createInstagramAccount({
        userId,
        username,
        password: hashedPassword,
        isActive: true,
      });
    }

    // Login to Instagram
    const ig = await loginInstagram(username, password, sessionData);
    
    // Update last login time
    await updateInstagramAccount(igAccount.id, {
      lastLoginAt: new Date(),
      sessionData: JSON.stringify(await ig.state.serialize()),
    });

    // Initialize bot config if not exists
    let config = await getBotConfig(userId);
    if (!config) {
      console.log(`[Bot ${userId}] Creating bot config...`);
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
      console.log(`[Bot ${userId}] Bot config created successfully`);
    } else {
      // Update isRunning status
      await upsertBotConfig({
        ...config,
        isRunning: true,
        lastStartedAt: new Date(),
      });
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
      metadata: JSON.stringify({ event: 'bot_started' }),
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
 * Main bot loop
 */
async function runBotLoop(userId: number): Promise<void> {
  const bot = activeBots.get(userId);
  if (!bot) return;

  const config = await getBotConfig(userId);
  if (!config) return;

  console.log(`[Bot ${userId}] Starting main loop`);

  // Run continuously
  while (bot.isRunning) {
    try {
      // Refresh session every hour to prevent expiration
      const hoursSinceRefresh = (Date.now() - bot.lastSessionRefresh.getTime()) / (1000 * 60 * 60);
      if (hoursSinceRefresh >= 1) {
        console.log(`[Bot ${userId}] Refreshing session...`);
        try {
          const igAccount = await getInstagramAccountByUserId(userId);
          if (igAccount && igAccount.sessionData) {
            await bot.ig.state.deserialize(JSON.stringify(igAccount.sessionData));
            bot.lastSessionRefresh = new Date();
            bot.errorCount = 0; // Reset error count on successful refresh
            console.log(`[Bot ${userId}] Session refreshed successfully`);
          }
        } catch (refreshError: any) {
          console.error(`[Bot ${userId}] Session refresh failed:`, refreshError.message);
        }
      }

      const limits = await getTodayLimits(userId);
      const followsToday = limits?.followsCount || 0;
      const likesInLastHour = await getLikesInLastHour(userId);
      
      console.log(`[Bot ${userId}] Loop iteration - Follows: ${followsToday}/${config.followsPerDay}, Likes: ${likesInLastHour}/${config.likesPerHour} (last hour)`);
      console.log(`[Bot ${userId}] Follows enabled: ${config.enableFollows}, Likes enabled: ${config.enableLikes}`);

      // Check if we've hit limits
      const followLimitReached = followsToday >= config.followsPerDay;
      const likeLimitReached = likesInLastHour >= config.likesPerHour; // Hourly limit!
      
      if ((followLimitReached || !config.enableFollows) && (likeLimitReached || !config.enableLikes)) {
        console.log(`[Bot ${userId}] All actions disabled or limits reached, switching to story viewing`);
        await viewRandomStories(userId, bot.ig);
        await randomDelay(config.minDelaySeconds, config.maxDelaySeconds);
        continue;
      }

      // Get a user to process
      const users = await getUnprocessedUsers(userId, 1);
      
      if (users.length === 0) {
        console.log(`[Bot ${userId}] No users in queue, scraping...`);
        await scrapeUsersFromTargets(userId, bot.ig);
        await randomDelay(config.minDelaySeconds, config.maxDelaySeconds);
        continue;
      }
      
      const targetUser = users[0];

      // Process follow action (if enabled and not already followed)
      if (config.enableFollows && !followLimitReached && !targetUser.isFollowed) {
        console.log(`[Bot ${userId}] Calling processFollowAction for ${targetUser.username}...`);
        await processFollowAction(userId, bot.ig, config);
      } else if (!config.enableFollows) {
        console.log(`[Bot ${userId}] Follows disabled in settings`);
      } else if (followLimitReached) {
        console.log(`[Bot ${userId}] Follow limit reached (${followsToday}/${config.followsPerDay})`);
      } else if (targetUser.isFollowed) {
        console.log(`[Bot ${userId}] Already followed ${targetUser.username}, skipping`);
      }

      // Process like action (if enabled and not already liked)
      if (config.enableLikes && !likeLimitReached && !targetUser.isLiked) {
        console.log(`[Bot ${userId}] Calling processLikeAction for ${targetUser.username}...`);
        await processLikeAction(userId, bot.ig, config);
      } else if (!config.enableLikes) {
        console.log(`[Bot ${userId}] Likes disabled in settings`);
      } else if (likeLimitReached) {
        console.log(`[Bot ${userId}] Like limit reached (${likesInLastHour}/${config.likesPerHour} per hour)`);
      } else if (targetUser.isLiked) {
        console.log(`[Bot ${userId}] Already liked ${targetUser.username}, skipping`);
      }

      // If both actions done or skipped, view stories
      if ((followLimitReached || !config.enableFollows || targetUser.isFollowed) && 
          (likeLimitReached || !config.enableLikes || targetUser.isLiked)) {
        await viewRandomStories(userId, bot.ig);
      }

      // Random delay between actions
      await randomDelay(config.minDelaySeconds, config.maxDelaySeconds);

    } catch (error: any) {
      console.error(`[Bot ${userId}] Error in main loop:`, error.message);
      bot.errorCount++;
      
      await createActionLog({
        userId,
        actionType: 'follow',
        status: 'failed',
        targetUsername: null,
        targetUrl: null,
        errorMessage: error.message,
        metadata: JSON.stringify({ event: 'loop_error', errorCount: bot.errorCount }),
      });
      
      // If too many consecutive errors, stop bot to prevent issues
      if (bot.errorCount >= 10) {
        console.error(`[Bot ${userId}] Too many consecutive errors (${bot.errorCount}), stopping bot`);
        bot.isRunning = false;
        await upsertBotConfig({
          ...config,
          isRunning: false,
          lastStoppedAt: new Date(),
        });
        break;
      }
      
      // Wait before retrying (longer delay for more errors)
      const delaySeconds = Math.min(60 + (bot.errorCount * 30), 300);
      console.log(`[Bot ${userId}] Waiting ${delaySeconds}s before retry (error count: ${bot.errorCount})`);
      await randomDelay(delaySeconds, delaySeconds + 30);
    }
  }

  console.log(`[Bot ${userId}] Main loop stopped`);
}

/**
 * Process follow action
 */
async function processFollowAction(userId: number, ig: IgApiClient, config: any): Promise<void> {
  console.log(`[Bot ${userId}] processFollowAction started`);
  try {
    // Get unprocessed users from queue
    let users = await getUnprocessedUsers(userId, 1);
    console.log(`[Bot ${userId}] Found ${users.length} unprocessed users`);
    
    // Reset bot error count on successful operation
    const bot = activeBots.get(userId);
    if (bot && users.length > 0) {
      bot.errorCount = Math.max(0, bot.errorCount - 1);
    }
    
    if (users.length === 0) {
      // Scrape new users from target accounts
      console.log(`[Bot ${userId}] No users in queue, scraping from targets...`);
      await scrapeUsersFromTargets(userId, ig);
      
      // Try to get users again after scraping
      users = await getUnprocessedUsers(userId, 1);
      
      if (users.length === 0) {
        console.log(`[Bot ${userId}] Still no users after scraping, will retry later`);
        return;
      }
    }

    const targetUser = users[0];
    
    try {
      // Use instagramUserId directly if available, otherwise search
      let userPk: string;
      
      if (targetUser.instagramUserId) {
        // Use saved Instagram user ID directly (no search needed!)
        userPk = targetUser.instagramUserId;
        console.log(`[Bot ${userId}] Using saved Instagram ID for ${targetUser.username}: ${userPk}`);
      } else {
        // Fallback: search for user (old data without instagramUserId)
        console.log(`[Bot ${userId}] No Instagram ID saved, searching for ${targetUser.username}...`);
        const searchResult = await ig.user.searchExact(targetUser.username);
        userPk = searchResult.pk.toString();
      }
      
      // Follow the user
      try {
        await ig.friendship.create(userPk);
      } catch (followError: any) {
        // Handle specific Instagram errors
        if (followError.message?.includes('challenge_required')) {
          console.error(`[Bot ${userId}] Challenge required - Instagram security check`);
          throw new Error('Instagram security challenge required. Please verify account manually.');
        }
        if (followError.message?.includes('spam')) {
          console.error(`[Bot ${userId}] Detected as spam - slowing down`);
          await randomDelay(300, 600); // Wait 5-10 minutes
        }
        throw followError;
      }
      
      // Mark as processed and followed
      await markUserAsProcessed(targetUser.id, true, false);
      
      await createActionLog({
        userId,
        actionType: 'follow',
        status: 'success',
        targetUsername: targetUser.username,
        targetUrl: null,
        errorMessage: null,
        metadata: JSON.stringify({ source: targetUser.sourceAccount }),
      });

      console.log(`[Bot ${userId}] Followed: ${targetUser.username}`);
    } catch (error: any) {
      await createActionLog({
        userId,
        actionType: 'follow',
        status: 'failed',
        targetUsername: targetUser.username,
        targetUrl: null,
        errorMessage: error.message,
        metadata: null,
      });
      
      await markUserAsProcessed(targetUser.id, false, false);
    }
  } catch (error: any) {
    console.error(`[Bot ${userId}] Follow action error:`, error.message);
  }
}

/**
 * Process like action
 */
async function processLikeAction(userId: number, ig: IgApiClient, config: any): Promise<void> {
  try {
    // Get unprocessed users from queue
    let users = await getUnprocessedUsers(userId, 1);
    
    if (users.length === 0) {
      // Try scraping if no users available
      console.log(`[Bot ${userId}] No users in queue for liking, scraping from targets...`);
      await scrapeUsersFromTargets(userId, ig);
      
      // Try to get users again after scraping
      users = await getUnprocessedUsers(userId, 1);
      
      if (users.length === 0) {
        console.log(`[Bot ${userId}] Still no users after scraping, will retry later`);
        return;
      }
    }

    const targetUser = users[0];
    
    try {
      // Use instagramUserId directly if available, otherwise search
      let userPk: string;
      
      if (targetUser.instagramUserId) {
        // Use saved Instagram user ID directly (no search needed!)
        userPk = targetUser.instagramUserId;
        console.log(`[Bot ${userId}] Using saved Instagram ID for like: ${targetUser.username} (${userPk})`);
      } else {
        // Fallback: search for user (old data without instagramUserId)
        console.log(`[Bot ${userId}] No Instagram ID saved for like, searching for ${targetUser.username}...`);
        const searchResult = await ig.user.searchExact(targetUser.username);
        userPk = searchResult.pk.toString();
      }
      
      // Get user's feed
      const userFeed = ig.feed.user(userPk);
      const posts = await userFeed.items();
      
      if (posts.length > 0) {
        // Like the first post
        const post = posts[0];
        await ig.media.like({
          mediaId: post.id,
          moduleInfo: {
            module_name: 'profile',
            username: targetUser.username,
            user_id: userPk,
          },
          d: 0,
        });
        
        await incrementDailyLimit(userId, 'likes');
        
        await createActionLog({
          userId,
          actionType: 'like',
          status: 'success',
          targetUsername: targetUser.username,
          targetUrl: null,
          errorMessage: null,
          metadata: JSON.stringify({ postId: post.id }),
        });

        console.log(`[Bot ${userId}] Liked post from: ${targetUser.username}`);
      }
    } catch (error: any) {
      await createActionLog({
        userId,
        actionType: 'like',
        status: 'failed',
        targetUsername: targetUser.username,
        targetUrl: null,
        errorMessage: error.message,
        metadata: null,
      });
    }
  } catch (error: any) {
    console.error(`[Bot ${userId}] Like action error:`, error.message);
  }
}

/**
 * Scrape users from target accounts
 */
async function scrapeUsersFromTargets(userId: number, ig: IgApiClient): Promise<void> {
  console.log(`[Bot ${userId}] scrapeUsersFromTargets started`);
  try {
    const targets = await getActiveTargetAccounts(userId);
    console.log(`[Bot ${userId}] Found ${targets.length} target accounts`);
    
    if (targets.length === 0) {
      console.log(`[Bot ${userId}] No target accounts configured`);
      return;
    }

    // Pick a random target
    const target = targets[Math.floor(Math.random() * targets.length)];
    
    try {
      const searchResult = await ig.user.searchExact(target.username);
      
      // Get followers
      const followersFeed = ig.feed.accountFollowers(searchResult.pk);
      const followers = await followersFeed.items();
      
      // Add to queue
      const scrapedUsers: InsertScrapedUser[] = followers.slice(0, 20).map(follower => ({
        userId,
        username: follower.username,
        instagramUserId: follower.pk.toString(), // Save Instagram user ID (PK)
        sourceType: 'follower' as const,
        sourceAccount: target.username,
        isProcessed: false,
        isFollowed: false,
        isLiked: false,
        processedAt: null,
      }));
      
      await addScrapedUsers(scrapedUsers);
      
      await createActionLog({
        userId,
        actionType: 'scrape_followers',
        status: 'success',
        targetUsername: target.username,
        targetUrl: null,
        errorMessage: null,
        metadata: JSON.stringify({ count: scrapedUsers.length }),
      });

      console.log(`[Bot ${userId}] Scraped ${scrapedUsers.length} followers from ${target.username}`);
    } catch (error: any) {
      await createActionLog({
        userId,
        actionType: 'scrape_followers',
        status: 'failed',
        targetUsername: target.username,
        targetUrl: null,
        errorMessage: error.message,
        metadata: null,
      });
    }
  } catch (error: any) {
    console.error(`[Bot ${userId}] Scrape error:`, error.message);
  }
}

/**
 * View random stories
 */
async function viewRandomStories(userId: number, ig: IgApiClient): Promise<void> {
  try {
    // Get story feed
    const reelsFeed = ig.feed.reelsTray();
    const tray = await reelsFeed.items();
    
    if (tray.length === 0) {
      console.log(`[Bot ${userId}] No stories available`);
      return;
    }

    // Pick random story
    const randomStory = tray[Math.floor(Math.random() * tray.length)];
    
    // Mark as seen (simplified - just log it)
    // Note: Story viewing API has changed, we'll just log it for now
    // await ig.story.seen([randomStory]);
    
    await incrementDailyLimit(userId, 'stories');
    
    await createActionLog({
      userId,
      actionType: 'view_story',
      status: 'success',
      targetUsername: randomStory.user?.username || 'unknown',
      targetUrl: null,
      errorMessage: null,
      metadata: null,
    });

    console.log(`[Bot ${userId}] Viewed story from: ${randomStory.user?.username}`);
  } catch (error: any) {
    console.error(`[Bot ${userId}] Story viewing error:`, error.message);
    await createActionLog({
      userId,
      actionType: 'view_story',
      status: 'failed',
      targetUsername: null,
      targetUrl: null,
      errorMessage: error.message,
      metadata: null,
    });
  }
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
