CREATE TABLE `introductions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`created_at` integer NOT NULL,
	`founder_county` text NOT NULL,
	`need_type` text NOT NULL,
	`from_node` text NOT NULL,
	`to_node` text NOT NULL
);
