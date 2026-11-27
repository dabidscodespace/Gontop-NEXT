DROP INDEX "orders_public_idx";--> statement-breakpoint
DROP INDEX "payments_invoice_uq";--> statement-breakpoint
DROP INDEX "products_slug_idx";--> statement-breakpoint
ALTER TABLE "games" ADD COLUMN "parent_id" integer;--> statement-breakpoint
ALTER TABLE "games" ADD COLUMN "region" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "games" ADD CONSTRAINT "games_parent_id_games_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."games"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "category_games_game_idx" ON "category_games" USING btree ("game_id");--> statement-breakpoint
CREATE INDEX "category_products_product_idx" ON "category_products" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "games_parent_idx" ON "games" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "order_items_product_idx" ON "order_items" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "order_items_variation_idx" ON "order_items" USING btree ("variation_id");--> statement-breakpoint
CREATE INDEX "variations_topup_idx" ON "variations" USING btree ("topup_method_id");--> statement-breakpoint
ALTER TABLE "games" ADD CONSTRAINT "games_parent_not_self" CHECK ("games"."parent_id" is null or "games"."parent_id" <> "games"."id");--> statement-breakpoint
UPDATE "products" SET "sku" = NULL WHERE "sku" IS NOT NULL AND btrim("sku") = '';--> statement-breakpoint
UPDATE "variations" SET "sku" = NULL WHERE "sku" IS NOT NULL AND btrim("sku") = '';--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_price_nonnegative" CHECK ("products"."price" >= 0);--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_sku_not_blank" CHECK ("products"."sku" is null or length(btrim("products"."sku")) > 0);--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_status_valid" CHECK (status in ('draft', 'pending_review', 'published', 'archived'));--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_type_valid" CHECK (product_type in ('simple', 'variable'));--> statement-breakpoint
ALTER TABLE "variations" ADD CONSTRAINT "variations_price_nonnegative" CHECK ("variations"."price" >= 0);--> statement-breakpoint
ALTER TABLE "variations" ADD CONSTRAINT "variations_compare_at_valid" CHECK ("variations"."compare_at_price" is null or "variations"."price" <= "variations"."compare_at_price");--> statement-breakpoint
ALTER TABLE "variations" ADD CONSTRAINT "variations_sale_window_valid" CHECK ("variations"."sale_starts_at" is null or "variations"."sale_ends_at" is null or "variations"."sale_starts_at" < "variations"."sale_ends_at");--> statement-breakpoint
ALTER TABLE "variations" ADD CONSTRAINT "variations_sku_not_blank" CHECK ("variations"."sku" is null or length(btrim("variations"."sku")) > 0);--> statement-breakpoint
ALTER TABLE "variations" ADD CONSTRAINT "variations_status_valid" CHECK (status in ('draft', 'pending_review', 'published', 'archived'));--> statement-breakpoint
ALTER TABLE "variations" ADD CONSTRAINT "variations_stock_valid" CHECK ("variations"."stock_status" in ('instock', 'outofstock'));