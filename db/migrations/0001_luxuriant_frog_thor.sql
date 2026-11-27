ALTER TABLE "order_items" ADD COLUMN "imported_data" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "imported_data" jsonb DEFAULT '{}'::jsonb NOT NULL;