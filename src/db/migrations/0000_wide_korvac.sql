CREATE TABLE `analytics_clicks` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`link_id` integer NOT NULL,
	`visitor_hash` text NOT NULL,
	`referrer` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `analytics_pageviews` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`date` text DEFAULT (date('now')) NOT NULL,
	`visitor_hash` text NOT NULL,
	`referrer` text,
	`country` text,
	`device_type` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `links` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`order_index` integer DEFAULT 0 NOT NULL,
	`type` text DEFAULT 'url' NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`url` text NOT NULL,
	`icon` text,
	`is_highlighted` integer DEFAULT false NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`schedule_start` text,
	`schedule_end` text,
	`clicks_count` integer DEFAULT 0 NOT NULL,
	`metadata` text DEFAULT '{}' NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `_meta` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `profile` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`avatar_url` text,
	`display_name` text DEFAULT '' NOT NULL,
	`bio` text DEFAULT '' NOT NULL,
	`badge_text` text,
	`social_links` text DEFAULT '[]' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `themes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`background_type` text DEFAULT 'gradient' NOT NULL,
	`background_value` text DEFAULT '#1a1a2e,#16213e' NOT NULL,
	`font_family` text DEFAULT 'Inter' NOT NULL,
	`primary_color` text DEFAULT '#0f3460' NOT NULL,
	`text_color` text DEFAULT '#eaeaea' NOT NULL,
	`link_style` text DEFAULT 'rounded' NOT NULL,
	`animation_type` text DEFAULT 'lift' NOT NULL,
	`is_active` integer DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`username` text NOT NULL,
	`password_hash` text NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_username_unique` ON `users` (`username`);