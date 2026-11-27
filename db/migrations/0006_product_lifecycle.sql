ALTER TABLE "products" ADD COLUMN "status" text DEFAULT 'draft' NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "product_type" text DEFAULT 'simple' NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "is_featured" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "fulfillment_notes" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "variations" ADD COLUMN "status" text DEFAULT 'draft' NOT NULL;--> statement-breakpoint
ALTER TABLE "variations" ADD COLUMN "sale_starts_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "variations" ADD COLUMN "sale_ends_at" timestamp with time zone;--> statement-breakpoint
-- Existing catalogue was live: keep it published so the storefront does not empty.
UPDATE "products" SET "status" = 'published';--> statement-breakpoint
UPDATE "variations" SET "status" = 'published';--> statement-breakpoint
UPDATE "products" SET "product_type" = 'variable'
  WHERE "id" IN (SELECT "product_id" FROM "variations" GROUP BY "product_id" HAVING count(*) > 1);--> statement-breakpoint
ALTER TABLE "products" ALTER COLUMN "status" SET DEFAULT 'draft';--> statement-breakpoint
ALTER TABLE "variations" ALTER COLUMN "status" SET DEFAULT 'draft';--> statement-breakpoint
CREATE INDEX "products_status_idx" ON "products" USING btree ("status","is_active");