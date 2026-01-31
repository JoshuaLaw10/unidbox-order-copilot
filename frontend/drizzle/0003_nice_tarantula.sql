ALTER TABLE `orders` MODIFY COLUMN `dealerName` varchar(255);--> statement-breakpoint
ALTER TABLE `orders` ADD `publicSessionId` varchar(64);--> statement-breakpoint
ALTER TABLE `orders` ADD `companyName` varchar(255);--> statement-breakpoint
ALTER TABLE `orders` ADD `contactNumber` varchar(50);