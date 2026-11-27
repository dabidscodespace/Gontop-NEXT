import { randomBytes } from "node:crypto";

import { eq } from "drizzle-orm";

import { adminUsers, banners, games, products, variations } from "../db/schema";
import { getDb } from "../lib/db/index";
import { hashPassword, newId } from "../lib/crypto";
import { saveSettings, DEFAULT_SETTINGS } from "../lib/settings";

async function main() {
  const db = await getDb();

  const ownerEmail = (process.env.ADMIN_EMAIL || "owner@gontop.app").toLowerCase();
  const generatedPassword = process.env.ADMIN_PASSWORD || randomBytes(9).toString("base64url");
  const ownerName = process.env.ADMIN_NAME || "Store Owner";

  const existingOwner = await db
    .select({ id: adminUsers.id })
    .from(adminUsers)
    .where(eq(adminUsers.email, ownerEmail))
    .limit(1);

  if (!existingOwner[0]) {
    await db.insert(adminUsers).values({
      id: newId(),
      email: ownerEmail,
      name: ownerName,
      passwordHash: hashPassword(generatedPassword),
      role: "owner",
      permissions: [],
      isActive: true,
    });
    console.log(`✅ Owner created: ${ownerEmail}`);
    if (!process.env.ADMIN_PASSWORD) {
      console.log(`🔑 Generated owner password: ${generatedPassword}`);
      console.log("   Store it now and change it after first login.");
    }
  } else {
    console.log(`ℹ️  Owner already exists: ${ownerEmail}`);
  }

  await saveSettings(DEFAULT_SETTINGS);

  if (process.env.SEED_DEMO === "true") {
    const gameCount = await db.select({ id: games.id }).from(games).limit(1);
    if (!gameCount[0]) {
      const demoGame = await db
        .insert(games)
        .values({
          name: "Mobile Legends",
          slug: "mobile-legends",
          image: "/assets/banner_1.jpg",
          description: "Diamonds and weekly passes delivered fast.",
          instructions: "Enter your Player ID and Server ID exactly as shown in the game.",
          sortOrder: 0,
          isActive: true,
        })
        .returning();

      const demoProduct = await db
        .insert(products)
        .values({
          gameId: demoGame[0].id,
          name: "Mobile Legends Diamonds",
          slug: "mobile-legends-diamonds",
          sku: "MLBB-DEMO",
          description: "<p>Top up Mobile Legends diamonds instantly.</p>",
          shortDescription: "Instant MLBB diamond top-up.",
          image: "/assets/banner_1.jpg",
          price: "90.00",
          fields: [
            {
              id: "player_id",
              label: "Player ID",
              type: "number",
              required: true,
              placeholder: "e.g. 123456789",
            },
            {
              id: "server_id",
              label: "Server ID",
              type: "number",
              required: true,
              placeholder: "e.g. 2001",
            },
          ],
          availability: "available",
        })
        .returning();

      await db.insert(variations).values([
        {
          productId: demoProduct[0].id,
          name: "86 Diamonds",
          sku: "MLBB-86",
          price: "90.00",
          stockStatus: "instock",
          sortOrder: 0,
        },
        {
          productId: demoProduct[0].id,
          name: "172 Diamonds",
          sku: "MLBB-172",
          price: "175.00",
          stockStatus: "instock",
          sortOrder: 1,
        },
      ]);

      await db.insert(banners).values({
        title: "Welcome to GONTOP",
        description: "Great deals are guaranteed!",
        image: "/assets/banner.avif",
        sortOrder: 0,
        isActive: true,
      });

      console.log("✅ Demo catalogue created");
    }
  }

  console.log("✅ Seed complete");
  const client = db.$client as { close?: () => Promise<void> } | undefined;
  await client?.close?.();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
