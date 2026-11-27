CREATE TABLE "category_products" (
	"category_id" integer NOT NULL,
	"product_id" integer NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "category_products_category_id_product_id_pk" PRIMARY KEY("category_id","product_id")
);
--> statement-breakpoint
ALTER TABLE "categories" ADD COLUMN "layout" text DEFAULT 'parent_games' NOT NULL;--> statement-breakpoint
ALTER TABLE "category_products" ADD CONSTRAINT "category_products_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "category_products" ADD CONSTRAINT "category_products_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;