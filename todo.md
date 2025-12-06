# Instagram Bot Growth Manager - TODO

## Phase 1: Database Schema & Core Infrastructure
- [x] Design database schema for Instagram accounts
- [x] Design database schema for target accounts list
- [x] Design database schema for bot actions log
- [x] Design database schema for daily limits tracking
- [x] Design database schema for bot configuration settings
- [x] Push database schema to production

## Phase 2: Instagram Integration
- [x] Research and implement Instagram login (username/password)
- [x] Implement Instagram session management
- [x] Implement Instagram API wrapper for following users
- [x] Implement Instagram API wrapper for liking posts
- [x] Implement Instagram API wrapper for viewing stories
- [x] Implement Instagram API wrapper for fetching followers
- [x] Implement Instagram API wrapper for fetching post likers
- [x] Add error handling for Instagram rate limits

## Phase 3: Bot Engine & Logic
- [x] Create bot service for managing bot lifecycle
- [x] Implement target account management (add/remove/list)
- [x] Implement follower scraping from target accounts
- [x] Implement post liker scraping from target accounts
- [x] Implement smart follow logic (120 likes/hour limit)
- [x] Implement smart like logic (100 follows/day limit)
- [x] Implement story viewing automation
- [x] Add random delays between actions (anti-detection)
- [x] Implement queue system for bot actions
- [x] Add daily limit reset mechanism

## Phase 4: Dashboard & UI
- [x] Create modern dashboard layout
- [x] Create bot control panel (start/stop/pause)
- [x] Create target accounts management page
- [x] Create bot activity log viewer
- [x] Create real-time statistics dashboard
- [x] Create daily limits progress indicators
- [x] Add bot status indicators (running/paused/stopped)
- [x] Add notifications for important events

## Phase 5: Analytics & Reporting
- [x] Track total follows performed
- [x] Track total likes performed
- [x] Track total stories viewed
- [x] Track follower growth over time
- [x] Create daily activity reports
- [ ] Create weekly performance summary
- [ ] Add charts for visual analytics

## Phase 6: Safety & Optimization
- [x] Implement rate limiting to prevent Instagram bans
- [x] Add configurable delays between actions
- [x] Implement action cooldown periods
- [ ] Add account health monitoring
- [ ] Implement automatic pause on suspicious activity
- [ ] Add backup and restore functionality

## Phase 7: Testing & Deployment
- [ ] Write unit tests for bot engine
- [ ] Write integration tests for Instagram API
- [ ] Test rate limiting mechanisms
- [ ] Test error handling and recovery
- [ ] Perform load testing
- [ ] Create user documentation
- [ ] Deploy to production

## User Requested Changes
- [x] Change default likes limit from 120/hour (2880/day) to 62/hour (1500/day)

- [x] Fix Start Bot to use saved credentials instead of asking every time

- [x] Clear old cached data showing 2880 instead of 1488
- [x] Add clear error message for Facebook-linked accounts
- [x] Reset all user data to apply new limits

- [x] Fix bot.getConfig returning undefined when no config exists

- [x] Add disconnect/logout button for Instagram account

## New Feature: Session Cookie Authentication
- [x] Update database schema to store session cookies
- [x] Modify bot login to accept session cookies instead of username/password
- [x] Create UI for users to paste session cookies
- [x] Add instructions on how to extract cookies from browser
- [ ] Test session-based authentication with Instagram

- [x] Fix session cookie to accept all Instagram cookies (not just sessionid)
- [x] Update instructions to export all cookies as JSON
- [x] Simplify auth back to username/password due to cookie expiration issues

## Cookie Authentication Issues
- [x] Test session-based authentication with Instagram
- [x] Revert to username/password with better error handling
- [ ] Add support for 2FA (Two-Factor Authentication)

## Bug Fixes
- [x] Fix Start Bot to ask for username on first login (currently fails with empty username)

## Session Import Feature
- [x] Update instagram-bot.ts to accept Instagrapi session JSON
- [x] Add session import endpoint to routers.ts
- [x] Create UI for uploading session file
- [x] Test login with provided session (wqmx222) - ✅ SUCCESS!

## Critical Bug: Bot Not Executing Actions
- [x] Fix bot loop to properly scrape users before processing
- [x] Ensure scraped users are added to queue before follow/like actions
- [x] Add proper error handling and logging for scraping failures
- [x] Test that bot actually follows and likes users after fix
- [x] Fix bot config not being saved to database (was only in memory)
- [x] Add upsertBotConfig call in startBot function
- [x] Verify bot successfully scrapes followers and executes actions

## New Issues After Bot Fix
- [x] Fix automatic logout issue - bot disconnects after page refresh (was using old published version)
- [x] Fix Start Bot dialog - JSON upload option disappeared, only shows password prompt (working in dev version)
- [x] Investigate why session expires or gets invalidated (user was on old version)
- [x] Ensure session file upload option is always available (confirmed working)

## Critical Bug: Bot Stops After Hours of Running
- [x] Investigate why bot stops automatically after running for several hours
- [x] Check for session expiration issues
- [x] Check for Instagram API rate limiting or blocks
- [x] Add automatic restart mechanism if bot crashes (auto-stop after 10 errors)
- [x] Add session refresh logic to prevent expiration (every 1 hour)
- [x] Improve error handling to prevent bot from stopping completely
- [x] Add error counter with exponential backoff
- [x] Add specific handling for Instagram challenge_required and spam errors
- [x] Reset error count on successful operations
- [x] Create comprehensive project summary (PROJECT_SUMMARY.md)
- [x] Document all features, fixes, and recommendations

## Fix 404 Not Found Errors When Following Users
- [ ] Update scraped_users schema to include user_id (Instagram PK)
- [ ] Modify scraping logic to save user_id along with username
- [ ] Update follow logic to use user_id directly instead of searchExact
- [ ] Update like logic to use user_id directly
- [ ] Test with real accounts to verify fix
- [ ] Run database migration to add user_id column

## Critical Issues: Settings Not Working & Duplicate Actions
- [x] Fix daily limits check - follows don't stop after reaching limit
- [x] Fix hourly likes limit - not respecting configured limit (now uses getLikesInLastHour)
- [x] Fix delay settings - bot now respects min/max delay settings
- [x] Prevent duplicate actions - bot checks isFollowed and isLiked flags
- [x] Add separate enable/disable toggles for follows
- [x] Add separate enable/disable toggles for likes
- [x] Update bot_config schema to include enable_follows and enable_likes flags
- [x] Update Settings UI to show toggle switches
- [ ] Test all limits are properly enforced
