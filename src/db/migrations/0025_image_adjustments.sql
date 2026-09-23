-- Image positioning adjustments (Spec: Image-Positioning)
-- Non-destructive per-upload metadata: avatar (pages.avatar_*), banner
-- (pages.banner_*), background image/video (pages.background_*).
-- All nullable — NULL = current rendering (cover/center, no zoom), so
-- existing users see zero change. No backfill needed.
ALTER TABLE `pages` ADD `avatar_fit` text;--> statement-breakpoint
ALTER TABLE `pages` ADD `avatar_pos_x` real;--> statement-breakpoint
ALTER TABLE `pages` ADD `avatar_pos_y` real;--> statement-breakpoint
ALTER TABLE `pages` ADD `avatar_zoom` real;--> statement-breakpoint
ALTER TABLE `pages` ADD `banner_fit` text;--> statement-breakpoint
ALTER TABLE `pages` ADD `banner_pos_x` real;--> statement-breakpoint
ALTER TABLE `pages` ADD `banner_pos_y` real;--> statement-breakpoint
ALTER TABLE `pages` ADD `banner_zoom` real;--> statement-breakpoint
ALTER TABLE `pages` ADD `background_fit_override` text;--> statement-breakpoint
ALTER TABLE `pages` ADD `background_pos_x` real;--> statement-breakpoint
ALTER TABLE `pages` ADD `background_pos_y` real;--> statement-breakpoint
ALTER TABLE `pages` ADD `background_zoom` real;
