CREATE TABLE "topup_methods" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "topup_methods_key_unique" UNIQUE("key")
);
--> statement-breakpoint
ALTER TABLE "categories" ADD COLUMN "show_on_home" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "categories" ADD COLUMN "game_limit" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "topup_method" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "instructions" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "topup_method_id" integer;--> statement-breakpoint
ALTER TABLE "variations" ADD COLUMN "topup_method_id" integer;--> statement-breakpoint
ALTER TABLE "variations" ADD COLUMN "fields" jsonb;--> statement-breakpoint
CREATE INDEX "topup_methods_active_order_idx" ON "topup_methods" USING btree ("is_active","sort_order");--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_topup_method_id_topup_methods_id_fk" FOREIGN KEY ("topup_method_id") REFERENCES "public"."topup_methods"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "variations" ADD CONSTRAINT "variations_topup_method_id_topup_methods_id_fk" FOREIGN KEY ("topup_method_id") REFERENCES "public"."topup_methods"("id") ON DELETE set null ON UPDATE no action;