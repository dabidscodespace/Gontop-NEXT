ALTER TABLE "products" ADD COLUMN "availability" text DEFAULT 'available' NOT NULL;--> statement-breakpoint
UPDATE "products" SET "availability" = 'disabled' WHERE "is_active" = false;--> statement-breakpoint
ALTER TABLE "variations" ADD COLUMN "availability" text DEFAULT 'available' NOT NULL;--> statement-breakpoint
UPDATE "variations" SET "availability" = 'disabled' WHERE "is_active" = false;--> statement-breakpoint
DROP INDEX "products_status_idx";--> statement-breakpoint
DROP INDEX "products_game_idx";--> statement-breakpoint
DROP INDEX "variations_product_idx";--> statement-breakpoint
ALTER TABLE "products" DROP COLUMN "is_active";--> statement-breakpoint
ALTER TABLE "variations" DROP COLUMN "is_active";--> statement-breakpoint
CREATE INDEX "products_status_idx" ON "products" USING btree ("status","availability");--> statement-breakpoint
CREATE INDEX "products_game_idx" ON "products" USING btree ("game_id","status","availability","sort_order");--> statement-breakpoint
CREATE INDEX "variations_product_idx" ON "variations" USING btree ("product_id","status","availability","sort_order");--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_availability_valid" CHECK (availability in ('available', 'unavailable', 'disabled'));--> statement-breakpoint
ALTER TABLE "variations" ADD CONSTRAINT "variations_availability_valid" CHECK (availability in ('available', 'unavailable', 'disabled'));
