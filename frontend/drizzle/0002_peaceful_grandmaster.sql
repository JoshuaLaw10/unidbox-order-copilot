CREATE TABLE `dealers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`contactPerson` varchar(255),
	`email` varchar(320),
	`phone` varchar(50),
	`address` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `dealers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('user','admin','dealer') NOT NULL DEFAULT 'user';--> statement-breakpoint
ALTER TABLE `inquiries` ADD `dealerId` int;--> statement-breakpoint
ALTER TABLE `orders` ADD `dealerId` int;--> statement-breakpoint
ALTER TABLE `users` ADD `passwordHash` varchar(255);--> statement-breakpoint
ALTER TABLE `users` ADD `dealerId` int;--> statement-breakpoint
ALTER TABLE `inquiries` ADD CONSTRAINT `inquiries_dealerId_dealers_id_fk` FOREIGN KEY (`dealerId`) REFERENCES `dealers`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `orders` ADD CONSTRAINT `orders_dealerId_dealers_id_fk` FOREIGN KEY (`dealerId`) REFERENCES `dealers`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `users` ADD CONSTRAINT `users_dealerId_dealers_id_fk` FOREIGN KEY (`dealerId`) REFERENCES `dealers`(`id`) ON DELETE no action ON UPDATE no action;