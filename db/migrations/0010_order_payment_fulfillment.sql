ALTER TABLE "orders" ADD COLUMN "payment_status" text DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "fulfillment_status" text DEFAULT 'pending' NOT NULL;--> statement-breakpoint
-- Backfill the new columns from the existing composite status (no data loss; status is kept).
UPDATE "orders" SET "payment_status" = CASE WHEN "status" = 'refunded' THEN 'refunded' WHEN "paid_at" IS NOT NULL THEN 'paid' WHEN "status" = 'cancelled' THEN 'failed' ELSE 'pending' END;--> statement-breakpoint
UPDATE "orders" o SET "payment_status" = 'partially_refunded' WHERE o."status" <> 'refunded' AND EXISTS (SELECT 1 FROM "refunds" r WHERE r."order_id" = o."id" AND r."status" = 'completed');--> statement-breakpoint
UPDATE "orders" SET "fulfillment_status" = CASE "status" WHEN 'processing' THEN 'processing' WHEN 'completed' THEN 'completed' WHEN 'failed' THEN 'failed' WHEN 'cancelled' THEN 'cancelled' ELSE 'pending' END;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_payment_status_valid" CHECK (payment_status in ('pending', 'paid', 'failed', 'partially_refunded', 'refunded'));--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_fulfillment_status_valid" CHECK (fulfillment_status in ('pending', 'processing', 'on_hold', 'completed', 'failed', 'cancelled'));