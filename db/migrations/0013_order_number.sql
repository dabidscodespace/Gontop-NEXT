CREATE SEQUENCE IF NOT EXISTS "order_number_seq" START WITH 121212 INCREMENT BY 1 MINVALUE 121212 NO CYCLE;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "order_number" integer;--> statement-breakpoint
UPDATE "orders" AS o SET "order_number" = s.n FROM (SELECT "id", nextval('order_number_seq') AS n FROM "orders" WHERE "order_number" IS NULL ORDER BY "id") AS s WHERE o."id" = s."id";--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "order_number" SET DEFAULT nextval('order_number_seq');--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "order_number" SET NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "orders_order_number_unique" ON "orders" USING btree ("order_number");
