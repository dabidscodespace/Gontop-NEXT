import { mkdirSync } from "node:fs";
import path from "node:path";

import { PGlite } from "@electric-sql/pglite";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { migrate as migratePglite } from "drizzle-orm/pglite/migrator";
import { drizzle as drizzlePg } from "drizzle-orm/postgres-js";
import { migrate as migratePg } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

const url = process.env.DATABASE_URL?.trim();
const migrationsFolder = path.join(process.cwd(), "db", "migrations");

if (!url || url.startsWith("pglite:")) {
  const location = url
    ? url.slice("pglite:".length).replace(/^\/\//, "")
    : ".data/gontop";
  const resolved = location ? path.resolve(location) : undefined;
  if (resolved) mkdirSync(resolved, { recursive: true });
  const client = new PGlite(resolved);
  const db = drizzlePglite(client);
  await migratePglite(db, { migrationsFolder });
  console.log(`✅ Migrated local PGlite database at ${location}`);
  await client.close();
} else {
  const client = postgres(url, { max: 1 });
  const db = drizzlePg(client);
  await migratePg(db, { migrationsFolder });
  console.log("✅ Migrated PostgreSQL database");
  await client.end();
}
