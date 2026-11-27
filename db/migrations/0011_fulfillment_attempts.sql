CREATE TABLE "fulfillment_attempts" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" integer NOT NULL,
	"provider" text NOT NULL,
	"outcome" text NOT NULL,
	"message" text DEFAULT '' NOT NULL,
	"reference" text DEFAULT '' NOT NULL,
	"retryable" boolean DEFAULT false NOT NULL,
	"admin_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "fulfillment_attempts_outcome_valid" CHECK (outcome in ('in_progress', 'completed', 'failed', 'manual_required'))
);
--> statement-breakpoint
ALTER TABLE "fulfillment_attempts" ADD CONSTRAINT "fulfillment_attempts_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fulfillment_attempts" ADD CONSTRAINT "fulfillment_attempts_admin_id_admin_users_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."admin_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "fulfillment_attempts_order_idx" ON "fulfillment_attempts" USING btree ("order_id","created_at");