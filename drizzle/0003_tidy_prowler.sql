ALTER TABLE `instagram_accounts` MODIFY COLUMN `password` text;--> statement-breakpoint
ALTER TABLE `instagram_accounts` ADD `sessionCookie` text;--> statement-breakpoint
ALTER TABLE `instagram_accounts` ADD CONSTRAINT `instagram_accounts_userId_unique` UNIQUE(`userId`);