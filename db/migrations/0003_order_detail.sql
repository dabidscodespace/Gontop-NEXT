ALTER TABLE "order_history" ADD COLUMN "customer_visible" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "order_notes" ADD COLUMN "customer_visible" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "delivery_message" text DEFAULT '' NOT NULL;