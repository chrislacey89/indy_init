CREATE TABLE `follow_ups` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`intro_id` integer NOT NULL,
	`token` text NOT NULL,
	`notify_account` text NOT NULL,
	`agreed_at` integer NOT NULL,
	`due_at` integer NOT NULL,
	`sent_at` integer,
	`answer` text,
	`note` text,
	`answered_at` integer,
	FOREIGN KEY (`intro_id`) REFERENCES `introductions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `follow_ups_token` ON `follow_ups` (`token`);--> statement-breakpoint
CREATE UNIQUE INDEX `follow_ups_intro` ON `follow_ups` (`intro_id`);