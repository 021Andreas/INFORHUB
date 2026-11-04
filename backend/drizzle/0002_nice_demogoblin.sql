CREATE TABLE `certificate_templates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`version` int NOT NULL,
	`config` text NOT NULL,
	`is_default` boolean NOT NULL DEFAULT false,
	`created_by` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `certificate_templates_id` PRIMARY KEY(`id`),
	CONSTRAINT `template_name_version_unique` UNIQUE(`name`,`version`)
);
--> statement-breakpoint
CREATE TABLE `event_reviews` (
	`id` int AUTO_INCREMENT NOT NULL,
	`event_id` int NOT NULL,
	`user_id` int NOT NULL,
	`rating` int NOT NULL,
	`comment` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `event_reviews_id` PRIMARY KEY(`id`),
	CONSTRAINT `review_event_user_unique` UNIQUE(`event_id`,`user_id`)
);
--> statement-breakpoint
CREATE TABLE `saved_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`event_id` int NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `saved_events_id` PRIMARY KEY(`id`),
	CONSTRAINT `saved_user_event_unique` UNIQUE(`user_id`,`event_id`)
);
--> statement-breakpoint
ALTER TABLE `notifications` MODIFY COLUMN `type` enum('registration_success','registration_cancelled','event_approved','event_rejected','event_reminder','certificate_issued','certificate_revoked','event_updated','organizer_verified','organizer_rejected') NOT NULL;--> statement-breakpoint
ALTER TABLE `certificates` ADD `template_id` int;--> statement-breakpoint
ALTER TABLE `certificates` ADD `verification_code` varchar(32);--> statement-breakpoint
ALTER TABLE `certificates` ADD `status` enum('valid','revoked') DEFAULT 'valid' NOT NULL;--> statement-breakpoint
ALTER TABLE `certificates` ADD `revoked_at` datetime;--> statement-breakpoint
ALTER TABLE `certificates` ADD `revoked_reason` varchar(255);--> statement-breakpoint
ALTER TABLE `certificates` ADD `revoked_by` int;--> statement-breakpoint
ALTER TABLE `events` ADD `certificate_template_id` int;--> statement-breakpoint
ALTER TABLE `users` ADD `nim` varchar(20);--> statement-breakpoint
ALTER TABLE `users` ADD `organization_name` varchar(150);--> statement-breakpoint
ALTER TABLE `users` ADD `verification_status` enum('none','pending','verified','rejected') DEFAULT 'none' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `verification_note` varchar(500);--> statement-breakpoint
ALTER TABLE `users` ADD `verified_at` datetime;--> statement-breakpoint
ALTER TABLE `users` ADD `verified_by` int;--> statement-breakpoint
ALTER TABLE `certificates` ADD CONSTRAINT `certificates_verification_code_unique` UNIQUE(`verification_code`);--> statement-breakpoint
ALTER TABLE `users` ADD CONSTRAINT `users_nim_unique` UNIQUE(`nim`);--> statement-breakpoint
ALTER TABLE `certificate_templates` ADD CONSTRAINT `certificate_templates_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `event_reviews` ADD CONSTRAINT `event_reviews_event_id_events_id_fk` FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `event_reviews` ADD CONSTRAINT `event_reviews_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `saved_events` ADD CONSTRAINT `saved_events_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `saved_events` ADD CONSTRAINT `saved_events_event_id_events_id_fk` FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `review_event_idx` ON `event_reviews` (`event_id`);--> statement-breakpoint
CREATE INDEX `saved_user_idx` ON `saved_events` (`user_id`);--> statement-breakpoint
ALTER TABLE `certificates` ADD CONSTRAINT `certificates_template_id_certificate_templates_id_fk` FOREIGN KEY (`template_id`) REFERENCES `certificate_templates`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `certificates` ADD CONSTRAINT `certificates_revoked_by_users_id_fk` FOREIGN KEY (`revoked_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `events` ADD CONSTRAINT `events_certificate_template_id_certificate_templates_id_fk` FOREIGN KEY (`certificate_template_id`) REFERENCES `certificate_templates`(`id`) ON DELETE no action ON UPDATE no action;