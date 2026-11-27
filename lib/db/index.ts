import "server-only";

import { mkdirSync } from "node:fs";
import path from "node:path";

import { PGlite } from "@electric-sql/pglite";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { migrate as migratePglite } from "drizzle-orm/pglite/migrator";
import type { PgDatabase } from "drizzle-orm/pg-core";
import { drizzle as drizzlePg } from "drizzle-orm/postgres-js";
import { migrate as migratePg } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

import * as schema from "@/db/schema";

export type DB = PgDatabase<never, typeof schema> & {
  $client?: unknown;
};
export type Tx = Parameters<Parameters<DB["transaction"]>[0]>[0];

type GlobalDb = {
  db?: DB;
  init?: Promise<DB>;
};

const globalForDb = globalThis as unknown as { __gontopDb?: GlobalDb };
const store = (globalForDb.__gontopDb ??= {});

function migrationFolder() {
  return path.join(process.cwd(), "db", "migrations");
}

function isPgliteUrl(url: string) {
  return url.startsWith("pglite:");
}

/**
 * Production uses a real PostgreSQL server through `postgres`.
 * Local development and the verification scripts fall back to PGlite — the
 * same PostgreSQL engine compiled to WASM — so no database server is needed.
 */
async function createDb(): Promise<DB> {
  const url = process.env.DATABASE_URL?.trim();

  if (!url || isPgliteUrl(url)) {
    const location = url
      ? url.slice("pglite:".length).replace(/^\/\//, "")
      : ".data/gontop";
    const resolved = location ? path.resolve(location) : undefined;
    if (resolved) mkdirSync(resolved, { recursive: true });
    const client = new PGlite(resolved);
    const db = drizzlePglite(client, { schema }) as unknown as DB;
    db.$client = client;
    await migratePglite(db as never, { migrationsFolder: migrationFolder() });
    return db;
  }

  if (process.env.NODE_ENV === "production" && !url.startsWith("postgres")) {
    throw new Error("DATABASE_URL must point to a PostgreSQL database in production.");
  }

  const client = postgres(url, { max: 10, prepare: false });
  const db = drizzlePg(client, { schema }) as unknown as DB;
  db.$client = client;
  return db;
}

export async function getDb(): Promise<DB> {
  if (store.db) return store.db;
  if (!store.init) {
    store.init = createDb().then((db) => {
      store.db = db;
      return db;
    });
  }
  return store.init;
}

export async function closeDb() {
  const db = store.db;
  const client = db?.$client as { close?: () => Promise<void> } | undefined;
  if (client?.close) await client.close();
  store.db = undefined;
  store.init = undefined;
}

export { schema };
