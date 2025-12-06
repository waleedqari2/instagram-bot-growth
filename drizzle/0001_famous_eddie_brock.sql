CREATE TABLE `action_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`actionType` enum('follow','like','view_story','scrape_followers','scrape_likers') NOT NULL,
	`targetUsername` varchar(255),
	`targetUrl` text,
	`status` enum('success','failed','skipped') NOT NULL,
	`errorMessage` text,
	`metadata` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `action_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `analytics` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`date` varchar(10) NOT NULL,
	`totalFollows` int NOT NULL DEFAULT 0,
	`totalLikes` int NOT NULL DEFAULT 0,
	`totalStoriesViewed` int NOT NULL DEFAULT 0,
	`accountFollowerCount` int DEFAULT 0,
	`accountFollowingCount` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `analytics_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `bot_config` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`likesPerHour` int NOT NULL DEFAULT 120,
	`followsPerDay` int NOT NULL DEFAULT 100,
	`minDelaySeconds` int NOT NULL DEFAULT 30,
	`maxDelaySeconds` int NOT NULL DEFAULT 90,
	`isRunning` boolean NOT NULL DEFAULT false,
	`lastStartedAt` timestamp,
	`lastStoppedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `bot_config_id` PRIMARY KEY(`id`),
	CONSTRAINT `bot_config_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE TABLE `daily_limits` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`date` varchar(10) NOT NULL,
	`likesCount` int NOT NULL DEFAULT 0,
	`followsCount` int NOT NULL DEFAULT 0,
	`storiesViewedCount` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `daily_limits_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `instagram_accounts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`username` varchar(255) NOT NULL,
	`password` text NOT NULL,
	`sessionData` text,
	`isActive` boolean NOT NULL DEFAULT true,
	`lastLoginAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `instagram_accounts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `scraped_users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`username` varchar(255) NOT NULL,
	`sourceType` enum('follower','liker') NOT NULL,
	`sourceAccount` varchar(255) NOT NULL,
	`isProcessed` boolean NOT NULL DEFAULT false,
	`isFollowed` boolean NOT NULL DEFAULT false,
	`isLiked` boolean NOT NULL DEFAULT false,
	`processedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `scraped_users_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `target_accounts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`username` varchar(255) NOT NULL,
	`category` varchar(100),
	`isActive` boolean NOT NULL DEFAULT true,
	`lastScrapedAt` timestamp,
	`followerCount` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `target_accounts_id` PRIMARY KEY(`id`)
);
