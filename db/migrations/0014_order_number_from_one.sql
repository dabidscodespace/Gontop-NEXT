ALTER SEQUENCE "order_number_seq" MINVALUE 1;--> statement-breakpoint
UPDATE "orders" SET "order_number" = -"id";--> statement-breakpoint
UPDATE "orders" AS o SET "order_number" = s.rn FROM (SELECT "id", row_number() OVER (ORDER BY "id") AS rn FROM "orders") AS s WHERE o."id" = s."id";--> statement-breakpoint
SELECT setval('order_number_seq', GREATEST((SELECT COALESCE(MAX("order_number"), 0) FROM "orders"), 0) + 1, false);
