UPDATE "products" SET "status" = 'draft' WHERE "status" = 'pending_review';--> statement-breakpoint
UPDATE "variations" SET "status" = 'draft' WHERE "status" = 'pending_review';--> statement-breakpoint
ALTER TABLE "products" DROP CONSTRAINT "products_status_valid";--> statement-breakpoint
ALTER TABLE "variations" DROP CONSTRAINT "variations_status_valid";--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_status_valid" CHECK (status in ('draft', 'published', 'archived'));--> statement-breakpoint
ALTER TABLE "variations" ADD CONSTRAINT "variations_status_valid" CHECK (status in ('draft', 'published', 'archived'));
