CREATE TABLE `certificate_assets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`owner_id` int NOT NULL,
	`filename` varchar(150) NOT NULL,
	`mime` varchar(50) NOT NULL,
	`size` int NOT NULL,
	`width` int NOT NULL,
	`height` int NOT NULL,
	`storage_ref` varchar(500) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `certificate_assets_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `certificate_template_audit` (
	`id` int AUTO_INCREMENT NOT NULL,
	`submission_id` int NOT NULL,
	`actor_id` int NOT NULL,
	`action` enum('submit','approve','reject') NOT NULL,
	`note` varchar(500),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `certificate_template_audit_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `certificate_template_submissions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizer_id` int NOT NULL,
	`name` varchar(100) NOT NULL,
	`layout_json` text NOT NULL,
	`status` enum('draft','pending','approved','rejected') NOT NULL DEFAULT 'draft',
	`submitted_at` datetime,
	`reviewed_by` int,
	`reviewed_at` datetime,
	`review_note` varchar(500),
	`approved_template_id` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `certificate_template_submissions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `notifications` MODIFY COLUMN `type` enum('registration_success','registration_cancelled','event_approved','event_rejected','event_reminder','certificate_issued','certificate_revoked','event_updated','organizer_verified','organizer_rejected','template_approved','template_rejected') NOT NULL;--> statement-breakpoint
ALTER TABLE `certificate_templates` ADD `layout` text;--> statement-breakpoint
ALTER TABLE `certificate_templates` ADD `owner_id` int;--> statement-breakpoint
ALTER TABLE `certificate_assets` ADD CONSTRAINT `certificate_assets_owner_id_users_id_fk` FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `certificate_template_audit` ADD CONSTRAINT `certificate_template_audit_submission_id_certificate_template_submissions_id_fk` FOREIGN KEY (`submission_id`) REFERENCES `certificate_template_submissions`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `certificate_template_audit` ADD CONSTRAINT `certificate_template_audit_actor_id_users_id_fk` FOREIGN KEY (`actor_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `certificate_template_submissions` ADD CONSTRAINT `certificate_template_submissions_organizer_id_users_id_fk` FOREIGN KEY (`organizer_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `certificate_template_submissions` ADD CONSTRAINT `certificate_template_submissions_reviewed_by_users_id_fk` FOREIGN KEY (`reviewed_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `certificate_template_submissions` ADD CONSTRAINT `certificate_template_submissions_approved_template_id_certificate_templates_id_fk` FOREIGN KEY (`approved_template_id`) REFERENCES `certificate_templates`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `assets_owner_idx` ON `certificate_assets` (`owner_id`);--> statement-breakpoint
CREATE INDEX `audit_submission_idx` ON `certificate_template_audit` (`submission_id`);--> statement-breakpoint
CREATE INDEX `submissions_organizer_idx` ON `certificate_template_submissions` (`organizer_id`,`status`);--> statement-breakpoint
CREATE INDEX `submissions_status_idx` ON `certificate_template_submissions` (`status`);--> statement-breakpoint
ALTER TABLE `certificate_templates` ADD CONSTRAINT `certificate_templates_owner_id_users_id_fk` FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;