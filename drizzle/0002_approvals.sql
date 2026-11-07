CREATE TABLE `drafts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`intro_id` integer NOT NULL,
	`ai_text` text NOT NULL,
	`edited_text` text,
	`model` text NOT NULL,
	`prompt_version` text NOT NULL,
	`status` text DEFAULT 'drafted' NOT NULL,
	`approved_by` text,
	`created_at` integer NOT NULL,
	`approved_at` integer,
	FOREIGN KEY (`intro_id`) REFERENCES `introductions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
ALTER TABLE `introductions` ADD `contact` text;--> statement-breakpoint
ALTER TABLE `introductions` ADD `thread_token` text;--> statement-breakpoint
CREATE UNIQUE INDEX `introductions_thread_token` ON `introductions` (`thread_token`);--> statement-breakpoint
UPDATE `introductions` SET `thread_token` = lower(hex(randomblob(16))) WHERE `thread_token` IS NULL;
