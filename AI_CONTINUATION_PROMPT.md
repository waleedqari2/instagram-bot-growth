# Instagram Bot Growth Manager - AI Continuation Prompt

**Copy and paste this entire prompt to any AI assistant (DeepSeek, Claude, ChatGPT, etc.) to continue the project.**

---

## 🎯 Project Context

I need you to help me continue developing an **Instagram Growth Bot** project that is currently **95% complete** but has a critical authentication blocker.

---

## 📋 Project Overview

**Project Name:** Instagram Bot Growth Manager  
**Tech Stack:** React 19 + Node.js + Express + tRPC + MySQL + Drizzle ORM  
**Project Path:** `/home/ubuntu/instagram_bot_growth`  
**Latest Version:** `f590eb1e`  
**Status:** ⚠️ **Blocked on Instagram Authentication**

---

## 🎯 Project Goal

Build an intelligent Instagram bot for growing accounts in the Umrah and hotel booking industry (Makkah & Madinah). The bot should:

1. **Follow followers** of target competitor accounts (100 follows/day)
2. **Like posts** of engaged users (62 likes/hour = 1488/day)
3. **View stories** continuously after daily limits are reached
4. **Random delays** (30-90 seconds) between actions to avoid detection
5. **Track everything** in database with analytics

---

## ✅ What's Already Built (95% Complete)

### 1. Database Schema (8 Tables)
```sql
- users (Manus OAuth authentication)
- instagram_accounts (Instagram credentials, encrypted)
- target_accounts (Competitor accounts to scrape from)
- scraped_users (Users collected from targets)
- bot_config (Limits: 62 likes/hour, 100 follows/day)
- daily_limits (Daily action tracking)
- action_logs (Complete activity history)
- analytics_history (Growth metrics over time)
```

### 2. Backend (tRPC API)
- ✅ User authentication system
- ✅ Bot control endpoints (start/stop/status)
- ✅ Target account CRUD operations
- ✅ Configuration management
- ✅ Analytics and reporting
- ✅ Activity logs retrieval

**File:** `server/routers.ts` (complete)

### 3. Bot Engine
- ✅ Follow logic with daily limits
- ✅ Like logic with hourly limits
- ✅ Story viewing automation
- ✅ Random delay system (30-90s)
- ✅ Queue management
- ✅ Daily reset mechanism

**File:** `server/instagram-bot.ts` (complete but authentication broken)

### 4. Frontend UI (React)
- ✅ Dashboard with real-time stats
- ✅ Bot control panel (Start/Stop/Disconnect)
- ✅ Target accounts management page
- ✅ Activity logs viewer
- ✅ Settings page
- ✅ Progress indicators

**Files:** 
- `client/src/pages/Home.tsx`
- `client/src/pages/Targets.tsx`
- `client/src/pages/Logs.tsx`
- `client/src/pages/Settings.tsx`

---

## ❌ THE CRITICAL BLOCKER

### Problem: Instagram Blocks Bot Login

**Current library:** `instagram-private-api` (Node.js)  
**Issue:** Instagram detects and blocks this library immediately

**Error messages we get:**
1. "Invalid username or password" (even with correct credentials)
2. "You can log in with your linked Facebook account" (for FB-linked accounts)
3. "403 Forbidden; login_required" (when using session cookies)

**What we tried (all failed):**
- ✅ Username + Password → Blocked
- ✅ Session Cookies → Expire too quickly
- ✅ Fresh new account (`wqmx222` / `Wa100200`) → Still blocked
- ✅ Unlinking Facebook → Suggested but not tested

---

## 🔧 PROPOSED SOLUTIONS (Pick One)

### Solution 1: Instagram OAuth (Recommended)
**Pros:**
- Official Instagram authentication
- Works with all accounts (including Facebook-linked)
- No password storage needed
- Most secure

**Cons:**
- Requires Instagram App registration
- May have limited API access (Graph API doesn't support follows/likes)

**Implementation:**
1. Add OAuth popup window for Instagram login
2. Capture access token after user authorizes
3. Store token in database
4. Use token for bot actions

**Estimated Time:** 1-2 hours

---

### Solution 2: Python + Instagrapi (Best Alternative)
**Pros:**
- More reliable than Node.js library
- Better error handling
- Active community support
- Proven to work with Instagram

**Cons:**
- Requires complete backend rebuild
- Different tech stack

**Implementation:**
1. Replace `server/instagram-bot.ts` with Python script
2. Use `instagrapi` library for Instagram actions
3. Keep frontend and database unchanged
4. Use FastAPI or Flask for Python backend
5. Maintain same tRPC endpoints

**Estimated Time:** 2-3 hours

---

### Solution 3: Puppeteer/Selenium (Last Resort)
**Pros:**
- Mimics real browser behavior
- Instagram can't detect it easily
- Works with all accounts

**Cons:**
- Slower performance
- Higher resource usage
- More complex to maintain

**Implementation:**
1. Replace `instagram-private-api` with Puppeteer
2. Automate Instagram web interface
3. Handle login, follow, like, story viewing via browser automation

**Estimated Time:** 3-4 hours

---

## 📁 Project Structure

```
instagram_bot_growth/
├── client/                    # Frontend (React 19)
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Home.tsx      # Dashboard (complete)
│   │   │   ├── Targets.tsx   # Target management (complete)
│   │   │   ├── Logs.tsx      # Activity logs (complete)
│   │   │   └── Settings.tsx  # Configuration (complete)
│   │   ├── components/       # UI components (complete)
│   │   └── lib/trpc.ts       # tRPC client (complete)
│   └── public/
├── server/                    # Backend (Node.js + Express)
│   ├── routers.ts            # tRPC API routes (complete)
│   ├── db.ts                 # Database helpers (complete)
│   ├── instagram-bot.ts      # ⚠️ Bot engine (BLOCKED HERE)
│   └── _core/                # Framework core (complete)
├── drizzle/
│   └── schema.ts             # Database schema (complete)
├── todo.md                    # Task tracking
├── PROJECT_SUMMARY.md         # Full project documentation
└── package.json              # Dependencies
```

---

## 🔑 Key Code Snippets

### Current Authentication (Broken)
```typescript
// server/instagram-bot.ts (lines 39-62)
async function loginInstagram(username: string, password: string): Promise<IgApiClient> {
  const ig = new IgApiClient();
  ig.state.generateDevice(username);
  
  try {
    await ig.account.login(username, password); // ❌ FAILS HERE
    return ig;
  } catch (error: any) {
    console.error('[Instagram Bot] Login failed:', error.message);
    throw new Error(`Instagram login failed: ${error.message}`);
  }
}
```

### Bot Start Function
```typescript
// server/instagram-bot.ts (lines 67-120)
export async function startBot(userId: number, username: string, password: string) {
  // 1. Get or create Instagram account in DB
  // 2. Login to Instagram ← FAILS HERE
  // 3. Get bot config (limits, delays)
  // 4. Start bot loop
  // 5. Process actions (follow, like, view stories)
}
```

### Frontend Bot Control
```typescript
// client/src/pages/Home.tsx (lines 165-185)
const handleStartBot = () => {
  if (botStatus?.account?.username) {
    const password = prompt(`Enter password for @${botStatus.account.username}:`);
    if (password) {
      startBotMutation.mutate({ username: botStatus.account.username, password });
    }
  } else {
    const username = prompt('Enter your Instagram username:');
    if (username) {
      const password = prompt('Enter your Instagram password:');
      if (password) {
        startBotMutation.mutate({ username, password });
      }
    }
  }
};
```

---

## 🎯 YOUR TASK

**I need you to implement ONE of the three solutions above to fix the authentication issue.**

### Recommended Approach:
1. **Start with Solution 2 (Python + Instagrapi)** - Most reliable
2. If you can't do Python, try **Solution 1 (OAuth)** - Fastest
3. If both fail, use **Solution 3 (Puppeteer)** - Last resort

### Requirements:
- ✅ Keep all existing features working
- ✅ Maintain same UI/UX
- ✅ Use same database schema
- ✅ Preserve safety limits (62 likes/hour, 100 follows/day)
- ✅ Keep random delays (30-90 seconds)
- ✅ Test with real Instagram account

---

## 📝 Important Notes

### Tested Credentials (for testing)
- **Account:** `wqmx222`
- **Password:** `Wa100200`
- **Status:** Fresh account, not linked to Facebook

### Safety Limits (DO NOT CHANGE)
- **Likes:** 62 per hour (1488 per day)
- **Follows:** 100 per day
- **Delays:** Random 30-90 seconds between actions
- **Stories:** Unlimited (after daily limits reached)

### Database Connection
- Managed by Manus platform
- Auto-injected via `DATABASE_URL` environment variable
- MySQL/TiDB compatible

---

## 🚀 Getting Started

### Step 1: Understand the Problem
Read the "CRITICAL BLOCKER" section above carefully.

### Step 2: Choose Solution
Pick one of the three solutions based on your expertise:
- Python developer? → Solution 2
- Quick fix needed? → Solution 1
- Need reliability? → Solution 3

### Step 3: Implement
Focus ONLY on fixing `server/instagram-bot.ts` authentication.
Everything else is working perfectly.

### Step 4: Test
Test with account `wqmx222` / `Wa100200` to verify login works.

---

## 📊 Success Criteria

✅ User can successfully log in to Instagram  
✅ Bot can follow users from target accounts  
✅ Bot can like posts from target accounts  
✅ Bot can view stories  
✅ All actions respect safety limits  
✅ Random delays work correctly  
✅ Dashboard shows real-time statistics  
✅ No Instagram bans or blocks  

---

## 🔗 Additional Resources

### Instagram Libraries
- **Node.js:** `instagram-private-api` (currently used, broken)
- **Python:** `instagrapi` (recommended alternative)
- **Browser:** `puppeteer` or `selenium` (last resort)

### Instagram Graph API
- **Official Docs:** https://developers.facebook.com/docs/instagram-api
- **Limitation:** Doesn't support follow/like actions (only posting/analytics)

---

## 💡 Tips for Success

1. **Don't rebuild everything** - Only fix authentication in `server/instagram-bot.ts`
2. **Keep existing database schema** - It's already perfect
3. **Preserve all safety limits** - They're carefully calculated to avoid bans
4. **Test incrementally** - Login first, then one action at a time
5. **Use error handling** - Instagram API is unpredictable

---

## 📞 Questions to Ask Me

Before you start, ask me:
1. Which solution do you prefer? (1, 2, or 3)
2. Do you have Instagram App credentials for OAuth?
3. Are you comfortable with Python if we go with Solution 2?
4. Should I preserve the exact same UI or can I improve it?

---

## 🎯 Expected Deliverable

After you fix the authentication:

1. **Updated code** for `server/instagram-bot.ts` (or new Python equivalent)
2. **Installation instructions** for any new dependencies
3. **Testing steps** to verify it works
4. **Documentation** of what you changed

---

**Ready? Let's fix this Instagram bot! 🚀**

---

## 📎 Attachments

- **Full Project Summary:** `/home/ubuntu/instagram_bot_growth/PROJECT_SUMMARY.md`
- **Task List:** `/home/ubuntu/instagram_bot_growth/todo.md`
- **Latest Version:** `f590eb1e`

---

**Last Updated:** 2025-11-27  
**Status:** Waiting for authentication fix  
**Priority:** HIGH - This is the ONLY blocker preventing deployment
