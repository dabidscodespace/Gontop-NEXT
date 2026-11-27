-- Payment is represented by payment_status/paid_at. The order lifecycle now
-- moves directly from pending payment to processing once payment is received.
DELETE FROM "order_history"
WHERE "from_status" = 'paid' AND "to_status" = 'processing';--> statement-breakpoint
UPDATE "order_history" SET "from_status" = 'processing' WHERE "from_status" = 'paid';--> statement-breakpoint
UPDATE "order_history" SET "to_status" = 'processing' WHERE "to_status" = 'paid';--> statement-breakpoint
UPDATE "orders"
SET "status" = 'processing',
    "fulfillment_status" = 'processing',
    "updated_at" = now()
WHERE "status" = 'paid';
