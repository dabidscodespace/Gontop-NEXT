/**
 * Integration checks for the financial and catalogue logic.
 * Runs against embedded PostgreSQL (PGlite) with the real migrations.
 *
 *   npm run test:flows
 */
import { rm } from "node:fs/promises";

const testDir = `.data/test-flows-${process.pid}-${Date.now()}`;
process.env.DATABASE_URL = `pglite://${testDir}`;
process.env.ADMIN_PASSWORD = "test-owner-password";

let passed = 0;
let failed = 0;

function check(name: string, condition: unknown, detail = "") {
  if (condition) {
    passed += 1;
    console.log(`  ✅ ${name}`);
  } else {
    failed += 1;
    console.error(`  ❌ ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

async function expectError(name: string, fn: () => Promise<unknown>, includes?: string) {
  try {
    await fn();
    check(name, false, "expected an error but none was thrown");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    check(name, includes ? message.toLowerCase().includes(includes.toLowerCase()) : true, message);
  }
}

async function main() {
  const { getDb, closeDb } = await import("../lib/db/index");
  const schema = await import("../db/schema");
  const { registerUser } = await import("../lib/services/auth");
  const { applyWalletEntry, getWalletBalance } = await import("../lib/services/wallet");
  const { eq } = await import("drizzle-orm");
  const { createOrder, cancelUnpaidOrder, updateOrderStatus, getOrderWithDetails } = await import(
    "../lib/services/orders"
  );
  const { refundOrder, getOrderRefundSummary, resolvePendingGatewayRefund, countPendingGatewayRefunds } = await import("../lib/services/refunds");
  const { newId } = await import("../lib/crypto");
  const { previewImport, importProducts } = await import("../lib/csv");
  const {
    previewCustomerImport,
    importCustomers,
    previewOrderImport,
    importOrders,
  } = await import("../lib/migration");
  const { hasPermission } = await import("../lib/permissions");
  const { hashPassword, verifyPassword } = await import("../lib/crypto");

  const db = await getDb();

  console.log("\n▸ Password hashing");
  const hash = hashPassword("correct-horse");
  check("correct password verifies", verifyPassword("correct-horse", hash));
  check("wrong password is rejected", !verifyPassword("wrong", hash));
  check("different hashes per call (salt)", hash !== hashPassword("correct-horse"));

  console.log("\n▸ Permissions");
  check("owner has any permission", hasPermission({ role: "owner", permissions: [] }, "staff.manage"));
  check(
    "moderator only has granted permissions",
    hasPermission({ role: "moderator", permissions: ["orders.view"] }, "orders.view") &&
      !hasPermission({ role: "moderator", permissions: ["orders.view"] }, "refunds.process"),
  );

  console.log("\n▸ Fixtures");
  const [game] = await db
    .insert(schema.games)
    .values({ name: "Mobile Legends", slug: "mobile-legends", isActive: true })
    .returning();

  const [product] = await db
    .insert(schema.products)
    .values({
      gameId: game.id,
      name: "MLBB Diamonds",
      slug: "mlbb-diamonds",
      price: "100",
      availability: "available",
      status: "published",
      fields: [
        { id: "player_id", label: "Player ID", type: "number", required: true },
        { id: "server_id", label: "Server ID", type: "number", required: true },
        {
          id: "region",
          label: "Region",
          type: "select",
          required: false,
          options: [
            { value: "eu", label: "Europe" },
            { value: "na", label: "North America" },
          ],
        },
      ],
    })
    .returning();

  const [small] = await db
    .insert(schema.variations)
    .values({ productId: product.id, name: "100 Diamonds", sku: "MLBB-100", price: "100", sortOrder: 0, status: "published" })
    .returning();
  const [large] = await db
    .insert(schema.variations)
    .values({ productId: product.id, name: "500 Diamonds", price: "500", sortOrder: 1, status: "published" })
    .returning();

  const user = await registerUser({
    name: "Test Customer",
    email: "test@example.com",
    phone: "01700000000",
    password: "password123",
  });

  const [testAdmin] = await db
    .insert(schema.adminUsers)
    .values({
      id: "test-admin",
      email: "admin@example.com",
      name: "Test Admin",
      passwordHash: hashPassword("admin-password"),
      role: "owner",
    })
    .returning();
  const adminId = testAdmin.id;

  await db.transaction(async (tx) => {
    await applyWalletEntry(tx, {
      userId: user.id,
      amount: 500,
      type: "admin_credit",
      description: "Test opening balance",
    });
  });

  check("opening wallet balance", (await getWalletBalance(user.id)) === 500);

  const playerFields = { player_id: "123456", server_id: "2001" };

  console.log("\n▸ Wallet order");
  const walletOrder = await createOrder(user.id, {
    productId: product.id,
    items: [{ variationId: small.id, quantity: 1 }],
    playerFields,
    paymentType: "wallet",
    walletAmount: 0,
    customerNote: "",
  });
  check("wallet-only order starts processing immediately", walletOrder.status === "processing");
  check("wallet balance debited", (await getWalletBalance(user.id)) === 400);
  const walletDetails = await getOrderWithDetails(walletOrder.publicId);
  check("player fields are snapshotted with labels", walletDetails?.order.playerFields["Player ID"] === "123456");
  check("order history recorded", (walletDetails?.history.length ?? 0) >= 1);

  console.log("\n▸ Validation");
  await expectError(
    "choice field rejects a value outside its options",
    () =>
      createOrder(user.id, {
        productId: product.id,
        items: [{ variationId: small.id, quantity: 1 }],
        playerFields: { player_id: "123", server_id: "1", region: "mars" },
        paymentType: "wallet",
        walletAmount: 0,
        customerNote: "",
      }),
    "Choose a valid option for Region.",
  );
  await expectError(
    "missing required player field is rejected",
    () =>
      createOrder(user.id, {
        productId: product.id,
        items: [{ variationId: small.id, quantity: 1 }],
        playerFields: { player_id: "123" },
        paymentType: "wallet",
        walletAmount: 0,
        customerNote: "",
      }),
    "Server ID",
  );

  await expectError(
    "insufficient wallet balance is rejected",
    () =>
      createOrder(user.id, {
        productId: product.id,
        items: [{ variationId: large.id, quantity: 2 }],
        playerFields,
        paymentType: "wallet",
        walletAmount: 0,
        customerNote: "",
      }),
    "insufficient",
  );

  console.log("\n▸ Hybrid order + cancellation");
  await db.update(schema.variations).set({ stockQuantity: 5 }).where(eq(schema.variations.id, large.id));
  const largeStock = async () =>
    (await db.select().from(schema.variations).where(eq(schema.variations.id, large.id)).limit(1))[0].stockQuantity;
  const hybrid = await createOrder(user.id, {
    productId: product.id,
    items: [{ variationId: large.id, quantity: 1 }],
    playerFields,
    paymentType: "hybrid",
    walletAmount: 200,
    customerNote: "",
  });
  check("hybrid order awaits gateway payment", hybrid.status === "pending_payment");
  check("hybrid wallet portion reserved", (await getWalletBalance(user.id)) === 200);
  check("gateway portion computed server-side", hybrid.gatewayPortion === 300);

  check("unpaid order reserved stock", (await largeStock()) === 4, `stock=${await largeStock()}`);
  await cancelUnpaidOrder(hybrid.orderId, "Test cancellation");
  check("cancelled order returns wallet portion", (await getWalletBalance(user.id)) === 400);
  check("cancelled unpaid order released stock", (await largeStock()) === 5, `stock=${await largeStock()}`);
  const cancelled = await getOrderWithDetails(hybrid.publicId);
  check("cancelled status stored", cancelled?.order.status === "cancelled");

  console.log("\n▸ Fulfillment transitions");
  const fulfillment = await createOrder(user.id, {
    productId: product.id,
    items: [{ variationId: small.id, quantity: 1 }],
    playerFields,
    paymentType: "wallet",
    walletAmount: 0,
    customerNote: "",
  });
  check("wallet order starts processing", fulfillment.status === "processing");
  check("balance after second order", (await getWalletBalance(user.id)) === 300);

  await updateOrderStatus({ orderId: fulfillment.orderId, status: "processing", adminId });
  await updateOrderStatus({ orderId: fulfillment.orderId, status: "completed", adminId, note: "Top-up confirmed" });
  const completed = await getOrderWithDetails(fulfillment.publicId);
  check("order completed", completed?.order.status === "completed");
  check("completion timestamp set", Boolean(completed?.order.completedAt));

  await expectError(
    "completed order cannot move backwards",
    () => updateOrderStatus({ orderId: fulfillment.orderId, status: "processing", adminId }),
    "cannot change",
  );

  console.log("\n▸ Refunds");
  const partial = await refundOrder({
    orderId: fulfillment.orderId,
    amount: 40,
    method: "wallet",
    reason: "Partial goodwill refund",
    adminId,
  });
  check("partial refund recorded", partial.fullyRefunded === false);
  check("partial refund credited", (await getWalletBalance(user.id)) === 340);
  const stillCompleted = await getOrderWithDetails(fulfillment.publicId);
  check("partially refunded order keeps status", stillCompleted?.order.status === "completed");

  const full = await refundOrder({
    orderId: fulfillment.orderId,
    amount: 60,
    method: "wallet",
    reason: "Remaining refund",
    adminId,
  });
  check("full refund marks order refunded", full.fullyRefunded === true);
  check("full refund credited", (await getWalletBalance(user.id)) === 400);

  await expectError(
    "double refund is prevented",
    () =>
      refundOrder({
        orderId: fulfillment.orderId,
        amount: 10,
        method: "wallet",
        reason: "Should fail",
        adminId,
      }),
    "refundable",
  );

  const refundSummary = await getOrderRefundSummary(fulfillment.orderId);
  check("refund ledger sums to order total", refundSummary.refunded === 100);

  console.log("\n▸ CSV migration");
  const csv = [
    "product_name,product_slug,game_slug,game_name,product_sku,variation_name,variation_sku,regular_price,sale_price,stock_quantity,stock_status",
    "Free Fire Diamonds,free-fire-diamonds,mobile-legends,Mobile Legends,FF-1,100 Diamonds,FF-100,90,80,25,instock",
    "Free Fire Diamonds,free-fire-diamonds,mobile-legends,Mobile Legends,FF-1,310 Diamonds,FF-310,250,240,10,instock",
  ].join("\n");

  const preview = await previewImport(csv);
  check("CSV preview groups variations", preview.products === 1 && preview.items[0]?.variationCount === 2);
  check("CSV preview has no errors", preview.errors.length === 0, JSON.stringify(preview.errors));
  check("CSV detects new product", preview.validProducts === 1);

  const imported = await importProducts(csv, { createMissingGames: false });
  check("CSV import creates product", imported.imported === 1);
  check("CSV import creates variations", imported.importedVariations === 2);

  const importedRows = await db
    .select()
    .from(schema.products)
    .where(eq(schema.products.slug, "free-fire-diamonds"));
  check("imported product persisted", importedRows.length === 1);

  const wooCsv = [
    "Type,SKU,Name,Slug,Categories,Images,Description,Short description,Regular price,Sale price,In stock?,Stock,Attribute 1 value(s),Parent",
    [
      "variable",
      "WOO-VAR",
      "Woo Legends Diamonds",
      "woo-legends",
      "Games > Mobile Legends",
      "https://example.com/cover.jpg",
      "<p>Top up description</p>",
      "Instant delivery",
      "",
      "",
      "1",
      "",
      "",
      "",
    ].join(","),
    [
      "variation",
      "WOO-86",
      "Woo Legends Diamonds - 86 Diamonds",
      "",
      "",
      "https://example.com/86.jpg",
      "",
      "",
      "90",
      "80",
      "1",
      "25",
      "86 Diamonds",
      "WOO-VAR",
    ].join(","),
    [
      "variation",
      "WOO-172",
      "Woo Legends Diamonds - 172 Diamonds",
      "",
      "",
      "",
      "",
      "",
      "160",
      "",
      "0",
      "0",
      "172 Diamonds",
      "WOO-VAR",
    ].join(","),
  ].join("\n");

  const wooPreview = await previewImport(wooCsv);
  check(
    "WooCommerce export is normalized",
    wooPreview.errors.length === 0 &&
      wooPreview.products === 1 &&
      wooPreview.items[0]?.variationCount === 2 &&
      wooPreview.items[0]?.gameSlug === "mobile-legends" &&
      wooPreview.items[0]?.minPrice === 80,
    JSON.stringify(wooPreview),
  );

  const wooImported = await importProducts(wooCsv, { createMissingGames: false });
  check("WooCommerce export imports", wooImported.imported === 1 && wooImported.importedVariations === 2);

  const [wooProduct] = await db
    .select()
    .from(schema.products)
    .where(eq(schema.products.slug, "woo-legends"));
  const wooVariations = wooProduct
    ? await db.select().from(schema.variations).where(eq(schema.variations.productId, wooProduct.id))
    : [];
  check(
    "WooCommerce variation names come from attributes",
    wooVariations.map((variation) => variation.name).sort().join("|") === "172 Diamonds|86 Diamonds",
    JSON.stringify(wooVariations.map((variation) => variation.name)),
  );
  check(
    "WooCommerce sale price and stock are preserved",
    wooVariations.some(
      (variation) => variation.price === "80.00" && variation.stockQuantity === 25,
    ),
  );

  const duplicatePreview = await previewImport(csv);
  check("re-import skips existing product", duplicatePreview.skippedProducts === 1);

  const badSkuCsv = [
    "product_name,product_slug,game_slug,variation_name,variation_sku,price",
    "Another Pack,another-pack,mobile-legends,10 Diamonds,FF-100,10",
  ].join("\n");
  const badSku = await previewImport(badSkuCsv);
  check("duplicate SKU is reported", badSku.errors.some((error) => error.message.includes("Duplicate SKU")));

  console.log("\n▸ Customer migration");
  const customerCsv = [
    "email,first_name,last_name,phone,registered",
    "legacy.one@example.com,Legacy,One,01711111111,2024-01-02 10:00:00",
    "legacy.two@example.com,Legacy,Two,01722222222,2024-02-03",
    "legacy.one@example.com,Duplicate,One,,",
  ].join("\n");

  const customerPreview = await previewCustomerImport(customerCsv);
  check(
    "customer preview merges duplicate emails",
    customerPreview.groups === 2 && customerPreview.errors.length === 0,
    JSON.stringify(customerPreview.errors),
  );

  const customerImport = await importCustomers(customerCsv);
  check("customers imported", customerImport.imported === 2 && customerImport.skipped === 0);

  const [legacyCustomer] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.email, "legacy.one@example.com"));
  check("imported customer has no password", Boolean(legacyCustomer) && legacyCustomer.passwordHash === null);
  check("imported customer phone kept", legacyCustomer?.phone === "01711111111");
  check("imported customer has zero wallet", (await getWalletBalance(legacyCustomer.id)) === 0);

  const customerReimport = await importCustomers(customerCsv);
  check("customer re-import is idempotent", customerReimport.imported === 0 && customerReimport.skipped === 2);

  console.log("\n▸ Order migration");
  const orderCsv = [
    "order_id,order_number,order_date,status,billing_email,billing_first_name,billing_last_name,billing_phone,order_total,payment_method_title,line_items,player_fields,customer_note,order_notes,refund_total",
    [
      "9001",
      "9001",
      "2024-03-01 12:30:00",
      "completed",
      "legacy.one@example.com",
      "Legacy",
      "One",
      "01711111111",
      "180",
      "SSLCOMMERZ",
      '[{"name":"100 Diamonds","sku":"MLBB-100","quantity":2,"total":180}]',
      '{"Player ID":"12345","Server ID":"2001"}',
      "Please deliver",
      "Imported note",
      "20",
    ]
      .map((value) => (value.includes(",") || value.includes('"') ? `"${value.replace(/"/g, '""')}"` : value))
      .join(","),
    [
      "9002",
      "9002",
      "2024-03-02 09:00:00",
      "processing",
      "",
      "Guest",
      "Customer",
      "",
      "250",
      "bKash",
      "name:310 Diamonds|quantity:1|total:250",
      "",
      "",
      "",
      "0",
    ]
      .map((value) => (value.includes(",") || value.includes('"') ? `"${value.replace(/"/g, '""')}"` : value))
      .join(","),
  ].join("\n");

  const orderPreview = await previewOrderImport(orderCsv);
  check(
    "order preview groups and validates orders",
    orderPreview.groups === 2 && orderPreview.newGroups === 2 && orderPreview.errors.length === 0,
    JSON.stringify(orderPreview),
  );

  const orderImport = await importOrders(orderCsv);
  check(
    "orders imported with one guest customer",
    orderImport.imported === 2 && orderImport.customersCreated === 1 && orderImport.errors.length === 0,
    JSON.stringify(orderImport),
  );

  const [importedOrder] = await db
    .select()
    .from(schema.orders)
    .where(eq(schema.orders.publicId, "GT-WC-9001"));
  check(
    "order status, total and player fields imported",
    importedOrder?.status === "completed" &&
      importedOrder.total === "180.00" &&
      importedOrder.itemCount === 2 &&
      importedOrder.playerFields["Player ID"] === "12345",
    JSON.stringify(importedOrder),
  );

  const importedItems = await db
    .select()
    .from(schema.orderItems)
    .where(eq(schema.orderItems.orderId, importedOrder.id));
  check(
    "order item matched catalogue variation",
    importedItems.length === 1 &&
      importedItems[0].variationId === small.id &&
      importedItems[0].productId === product.id &&
      importedItems[0].unitPrice === "90.00",
    JSON.stringify(importedItems),
  );
  const importedPayments = await db
    .select({ id: schema.payments.id, amount: schema.payments.amount })
    .from(schema.payments)
    .where(eq(schema.payments.orderId, importedOrder.id));
  const importedRefunds = await db
    .select({ id: schema.refunds.id, amount: schema.refunds.amount })
    .from(schema.refunds)
    .where(eq(schema.refunds.orderId, importedOrder.id));
  check(
    "imported order has payment and refund records",
    importedPayments.length === 1 &&
      importedPayments[0].amount === "180.00" &&
      importedRefunds.length === 1 &&
      Number(importedRefunds[0].amount) === 20,
    JSON.stringify({ importedPayments, importedRefunds }),
  );
  check("imported order does not change wallet", (await getWalletBalance(legacyCustomer.id)) === 0);

  const orderReimport = await importOrders(orderCsv);
  check(
    "order re-import is idempotent",
    orderReimport.imported === 0 && orderReimport.skipped === 2,
    JSON.stringify(orderReimport),
  );

  console.log("\n▸ Full WooCommerce order fields");
  const fullCsv = [
    "Order ID,Order Number,Order Status,Order Date,Date Paid,Date Completed,Customer ID,Billing First Name,Billing Last Name,Billing Email,Billing Phone,Billing Address 1,Billing City,Billing Country,Shipping Address 1,Shipping City,Payment Method Title,Transaction ID,Order Subtotal Amount,Cart Discount Amount,Shipping Total Amount,Tax Total,Order Total Amount,Refunded Amount,Customer IP Address,Created Via,Coupon Codes,Currency,Item #1 Name,Item #1 SKU,Item #1 Quantity,Item #1 Total,Item #2 Name,Item #2 SKU,Item #2 Quantity,Item #2 Total",
    "9100,9100,wc-completed,2024-04-01 10:00:00,2024-04-01 10:05:00,2024-04-01 10:20:00,77,Rafi,Hasan,rafi.full@example.com,01800000000,House 1 Road 2,Dhaka,BD,House 1 Road 2,Dhaka,bKash,TXN-ABC-123,200,10,5,0,195,0,103.5.1.9,admin,SAVE10,BDT,100 Diamonds,MLBB-100,1,90,50 Diamonds,MLBB-50,1,100",
  ].join("\n");
  const fullPreview = await previewOrderImport(fullCsv);
  check("full order export previews cleanly", fullPreview.errors.length === 0, JSON.stringify(fullPreview.errors));
  const fullImport = await importOrders(fullCsv);
  check("full order export imports", fullImport.imported === 1 && fullImport.errors.length === 0, JSON.stringify(fullImport));

  const [fullOrder] = await db.select().from(schema.orders).where(eq(schema.orders.publicId, "GT-WC-9100"));
  const orderFields = (fullOrder?.importedData as { fields?: Record<string, string> })?.fields ?? {};
  check(
    "every order-level column is kept",
    orderFields.billing_address_1 === "House 1 Road 2" &&
      orderFields.billing_country === "BD" &&
      orderFields.shipping_city === "Dhaka" &&
      orderFields.tax_total === "0" &&
      orderFields.shipping_total_amount === "5" &&
      orderFields.customer_ip_address === "103.5.1.9" &&
      orderFields.coupon_codes === "SAVE10" &&
      orderFields.currency === "BDT" &&
      orderFields.refunded_amount === "0" &&
      orderFields.created_via === "admin",
    JSON.stringify(orderFields),
  );
  check(
    "item columns are not duplicated into order fields",
    !("item_1_name" in orderFields) && !("item_#1_name" in orderFields) && !("item_#1_sku" in orderFields),
    JSON.stringify(Object.keys(orderFields)),
  );
  check("real transaction id is stored on payment", (await db.select().from(schema.payments).where(eq(schema.payments.orderId, fullOrder.id)))[0]?.transactionId === "TXN-ABC-123");

  const fullItems = await db.select().from(schema.orderItems).where(eq(schema.orderItems.orderId, fullOrder.id));
  check(
    "numbered line items imported with their columns",
    fullItems.length === 2 &&
      fullItems.some((item) => item.productName && (item.importedData as Record<string, string>).sku === "MLBB-100") &&
      fullItems.some((item) => (item.importedData as Record<string, string>).sku === "MLBB-50"),
    JSON.stringify(fullItems),
  );

  console.log("\n▸ Payment and fulfillment status");
  const { ORDER_TRANSITIONS, fulfillmentStatusFor } = await import("../lib/order-status");
  const stateOrder = await createOrder(user.id, {
    productId: product.id,
    items: [{ variationId: small.id, quantity: 1 }],
    playerFields,
    paymentType: "wallet",
    walletAmount: 0,
    customerNote: "",
  });
  const stateRow = async () => (await getOrderWithDetails(stateOrder.publicId))!.order;
  check("new wallet order: payment paid", (await stateRow()).paymentStatus === "paid");
  check("new wallet order: processing with manual fulfillment", (await stateRow()).status === "processing" && (await stateRow()).fulfillmentStatus === "processing");

  await updateOrderStatus({ orderId: stateOrder.orderId, status: "processing", adminId });
  check("processing sets fulfillment", (await stateRow()).fulfillmentStatus === "processing");
  check("processing keeps payment paid", (await stateRow()).paymentStatus === "paid");

  await updateOrderStatus({ orderId: stateOrder.orderId, status: "on_hold", adminId, note: "Player ID check" });
  check("on hold reached", (await stateRow()).status === "on_hold");
  check("on hold sets fulfillment", (await stateRow()).fulfillmentStatus === "on_hold");
  await expectError(
    "on hold order cannot be completed directly",
    () => updateOrderStatus({ orderId: stateOrder.orderId, status: "completed", adminId }),
    "cannot change",
  );
  await updateOrderStatus({ orderId: stateOrder.orderId, status: "processing", adminId, note: "Resumed" });
  check("resume from hold", (await stateRow()).status === "processing");

  await updateOrderStatus({ orderId: stateOrder.orderId, status: "failed", adminId, note: "Top-up rejected" });
  check("failed sets fulfillment", (await stateRow()).fulfillmentStatus === "failed");
  await updateOrderStatus({ orderId: stateOrder.orderId, status: "processing", adminId, note: "Retry" });
  check("retry from failed restores processing", (await stateRow()).status === "processing");
  check("retry sets fulfillment processing", (await stateRow()).fulfillmentStatus === "processing");
  await updateOrderStatus({ orderId: stateOrder.orderId, status: "completed", adminId });
  check("retried order completes", (await stateRow()).fulfillmentStatus === "completed");

  check("on hold can resume to processing", ORDER_TRANSITIONS.on_hold.includes("processing"));
  check("on hold cannot be cancelled", !ORDER_TRANSITIONS.on_hold.includes("cancelled"));
  check("pending payment can fail", ORDER_TRANSITIONS.pending_payment.includes("failed"));
  check("refunded is not a manual target", !Object.values(ORDER_TRANSITIONS).some((targets) => targets.includes("refunded")));
  check("payment-only states leave fulfillment alone", fulfillmentStatusFor("paid") === null && fulfillmentStatusFor("refunded") === null);

  console.log("\n▸ Automatic fulfillment");
  const { registerFulfillmentProvider } = await import("../lib/fulfillment");
  const { listFulfillmentAttempts } = await import("../lib/services/orders");
  let supplierCalls = 0;
  let nextManual = false;
  registerFulfillmentProvider({
    key: "test-supplier",
    label: "Test supplier",
    automatic: true,
    async fulfill(order) {
      supplierCalls += 1;
      if (nextManual) {
        nextManual = false;
        return { outcome: "manual_required", message: "Supplier cannot take this top-up." };
      }
      if (supplierCalls === 1) return { outcome: "failed", message: "Supplier offline", retryable: true };
      return { outcome: "completed", reference: `SUP-${order.publicId}` };
    },
  });
  process.env.FULFILLMENT_PROVIDER = "test-supplier";
  try {
    const auto = await createOrder(user.id, {
      productId: product.id,
      items: [{ variationId: small.id, quantity: 1 }],
      playerFields,
      paymentType: "wallet",
      walletAmount: 0,
      customerNote: "",
    });
    // Checkout starts processing and the automatic provider runs immediately.
    let autoRow = (await getOrderWithDetails(auto.publicId))!.order;
    check("automatic failure marks order failed", autoRow.status === "failed");
    check("automatic failure sets fulfillment failed", autoRow.fulfillmentStatus === "failed");
    check("supplier called once", supplierCalls === 1);

    await updateOrderStatus({ orderId: auto.orderId, status: "processing", adminId, note: "Retry" });
    autoRow = (await getOrderWithDetails(auto.publicId))!.order;
    check("supplier retry completes order", autoRow.status === "completed");
    check("supplier called twice", supplierCalls === 2);

    const attempts = await listFulfillmentAttempts(auto.orderId);
    check("two attempts recorded", attempts.length === 2);
    check("completed attempt keeps reference", attempts.some((a) => a.outcome === "completed" && a.reference === `SUP-${auto.publicId}`));
    check("failed attempt is retryable", attempts.some((a) => a.outcome === "failed" && a.retryable));

    await expectError(
      "fulfilled order cannot be re-run",
      () => updateOrderStatus({ orderId: auto.orderId, status: "processing", adminId }),
      "Cannot change",
    );
    check("no extra supplier call after completion", supplierCalls === 2);

    await db.transaction(async (tx) => {
      await applyWalletEntry(tx, { userId: user.id, amount: 1000, type: "admin_credit", description: "Fulfillment test top-up" });
    });
    nextManual = true;
    const manualCreated = await createOrder(user.id, {
      productId: product.id,
      items: [{ variationId: small.id, quantity: 1 }],
      playerFields,
      paymentType: "wallet",
      walletAmount: 0,
      customerNote: "",
    });
    await updateOrderStatus({ orderId: manualCreated.orderId, status: "processing", adminId });
    const manualRow = (await getOrderWithDetails(manualCreated.publicId))!.order;
    check("manual_required leaves the order processing", manualRow.status === "processing");
    const manualAttempts = await listFulfillmentAttempts(manualCreated.orderId);
    check("manual_required is recorded as an attempt", manualAttempts.length === 1 && manualAttempts[0].outcome === "manual_required");
    await updateOrderStatus({ orderId: manualCreated.orderId, status: "completed", adminId, note: "Delivered by hand" });
    check("admin can complete a manual_required order", (await getOrderWithDetails(manualCreated.publicId))!.order.status === "completed");

    nextManual = true;
    const staleCreated = await createOrder(user.id, {
      productId: product.id,
      items: [{ variationId: small.id, quantity: 1 }],
      playerFields,
      paymentType: "wallet",
      walletAmount: 0,
      customerNote: "",
    });
    await db.insert(schema.fulfillmentAttempts).values({
      orderId: staleCreated.orderId,
      provider: "test-supplier",
      outcome: "in_progress",
      adminId,
      createdAt: new Date(Date.now() - 11 * 60 * 1000),
    });
    const callsBeforeStale = supplierCalls;
    await updateOrderStatus({ orderId: staleCreated.orderId, status: "on_hold", adminId });
    await updateOrderStatus({ orderId: staleCreated.orderId, status: "processing", adminId });
    check("stale in-progress claim is reclaimed", (await getOrderWithDetails(staleCreated.publicId))!.order.status === "completed");
    check("reclaimed claim calls the supplier once", supplierCalls === callsBeforeStale + 1);

    nextManual = true;
    const liveCreated = await createOrder(user.id, {
      productId: product.id,
      items: [{ variationId: small.id, quantity: 1 }],
      playerFields,
      paymentType: "wallet",
      walletAmount: 0,
      customerNote: "",
    });
    await db.insert(schema.fulfillmentAttempts).values({
      orderId: liveCreated.orderId,
      provider: "test-supplier",
      outcome: "in_progress",
      adminId,
    });
    const callsBeforeLive = supplierCalls;
    await updateOrderStatus({ orderId: liveCreated.orderId, status: "on_hold", adminId });
    await expectError(
      "live in-progress claim blocks a second run",
      () => updateOrderStatus({ orderId: liveCreated.orderId, status: "processing", adminId }),
      "already in progress",
    );
    check("blocked run does not call the supplier", supplierCalls === callsBeforeLive);
  } finally {
    delete process.env.FULFILLMENT_PROVIDER;
  }

  console.log("\n▸ Refund and stock safety");
  await db.transaction(async (tx) => {
    await applyWalletEntry(tx, { userId: user.id, amount: 1000, type: "admin_credit", description: "Safety test top-up" });
  });
  await db.update(schema.variations).set({ stockQuantity: 10 }).where(eq(schema.variations.id, small.id));
  const stockBefore = (await db.select().from(schema.variations).where(eq(schema.variations.id, small.id)).limit(1))[0]
    .stockQuantity;
  check("fixture variation tracks stock", stockBefore !== null);

  const stockOrder = await createOrder(user.id, {
    productId: product.id,
    items: [{ variationId: small.id, quantity: 2 }],
    playerFields,
    paymentType: "wallet",
    walletAmount: 0,
    customerNote: "",
  });
  const stockNow = async (): Promise<number | null> =>
    (await db.select().from(schema.variations).where(eq(schema.variations.id, small.id)).limit(1))[0].stockQuantity;
  check("checkout reserves stock", (await stockNow()) === (stockBefore ?? 0) - 2);

  const stockRefund = await refundOrder({
    orderId: stockOrder.orderId,
    amount: Number((await getOrderWithDetails(stockOrder.publicId))!.order.total),
    method: "wallet",
    reason: "Not delivered",
    adminId,
  });
  // A processing order may already be with the supplier, so its stock is not released automatically.
  check("full refund of processing order keeps stock reserved", (await stockNow()) === (stockBefore ?? 0) - 2);
  check("full refund marks payment refunded", (await getOrderWithDetails(stockOrder.publicId))!.order.paymentStatus === "refunded");
  check("refund reports fully refunded", stockRefund.fullyRefunded === true);

  const raceOrder = await createOrder(user.id, {
    productId: product.id,
    items: [{ variationId: small.id, quantity: 1 }],
    playerFields,
    paymentType: "wallet",
    walletAmount: 0,
    customerNote: "",
  });
  const raceTotal = Number((await getOrderWithDetails(raceOrder.publicId))!.order.total);
  const raceResults = await Promise.allSettled([
    refundOrder({ orderId: raceOrder.orderId, amount: raceTotal, method: "wallet", reason: "Race A", adminId }),
    refundOrder({ orderId: raceOrder.orderId, amount: raceTotal, method: "wallet", reason: "Race B", adminId }),
  ]);
  check("concurrent full refunds: exactly one succeeds", raceResults.filter((r) => r.status === "fulfilled").length === 1);
  const raceSummary = await getOrderRefundSummary(raceOrder.orderId);
  check("concurrent refunds never exceed total", raceSummary.refunded === raceTotal);

  const stockBeforePartial = await stockNow();
  const partialOrder = await createOrder(user.id, {
    productId: product.id,
    items: [{ variationId: small.id, quantity: 1 }],
    playerFields,
    paymentType: "wallet",
    walletAmount: 0,
    customerNote: "",
  });
  await refundOrder({ orderId: partialOrder.orderId, amount: 10, method: "wallet", reason: "Partial", adminId });
  const partialRow = (await getOrderWithDetails(partialOrder.publicId))!.order;
  check("partial refund sets payment partially refunded", partialRow.paymentStatus === "partially_refunded");
  check("partial refund keeps stock reserved", (await stockNow()) === (stockBeforePartial ?? 0) - 1);

  console.log("\n▸ Pending gateway refunds");
  const pendingOrder = await createOrder(user.id, {
    productId: product.id,
    items: [{ variationId: small.id, quantity: 1 }],
    playerFields,
    paymentType: "wallet",
    walletAmount: 0,
    customerNote: "",
  });
  const pendingTotal = Number((await getOrderWithDetails(pendingOrder.publicId))!.order.total);
  const pendingBefore = await countPendingGatewayRefunds();
  const pendingRefundId = newId();
  await db.insert(schema.refunds).values({
    id: pendingRefundId,
    orderId: pendingOrder.orderId,
    userId: user.id,
    amount: pendingTotal.toFixed(2),
    method: "gateway",
    reason: "Gateway refund in flight",
    status: "pending",
  });
  check("orders dashboard counts the pending gateway refund", (await countPendingGatewayRefunds()) === pendingBefore + 1);
  await expectError(
    "pending gateway refund reserves the refundable amount",
    () => refundOrder({ orderId: pendingOrder.orderId, amount: 1, method: "wallet", reason: "Overlap", adminId }),
    "remains refundable",
  );
  await expectError(
    "completing a gateway refund requires its reference",
    () => resolvePendingGatewayRefund({ refundId: pendingRefundId, outcome: "completed", adminId }),
    "reference",
  );
  const settled = await resolvePendingGatewayRefund({
    refundId: pendingRefundId,
    outcome: "completed",
    gatewayReference: "GW-TEST-1",
    adminId,
  });
  const settledOrder = (await getOrderWithDetails(pendingOrder.publicId))!.order;
  check("settled gateway refund leaves the pending count", (await countPendingGatewayRefunds()) === pendingBefore);
  check("confirmed gateway refund completes and marks order refunded", settled.fullyRefunded && settledOrder.status === "refunded");
  check("confirmed gateway refund stores reference", (await db.select().from(schema.refunds).where(eq(schema.refunds.id, pendingRefundId)).limit(1))[0].gatewayReference === "GW-TEST-1");
  await expectError(
    "a settled refund cannot be resolved again",
    () => resolvePendingGatewayRefund({ refundId: pendingRefundId, outcome: "failed", adminId }),
    "only pending",
  );

  const failedOrder = await createOrder(user.id, {
    productId: product.id,
    items: [{ variationId: small.id, quantity: 1 }],
    playerFields,
    paymentType: "wallet",
    walletAmount: 0,
    customerNote: "",
  });
  const failedRefundId = newId();
  await db.insert(schema.refunds).values({
    id: failedRefundId,
    orderId: failedOrder.orderId,
    userId: user.id,
    amount: "10.00",
    method: "gateway",
    reason: "Gateway refund rejected",
    status: "pending",
  });
  await resolvePendingGatewayRefund({ refundId: failedRefundId, outcome: "failed", adminId });
  await refundOrder({ orderId: failedOrder.orderId, amount: 10, method: "wallet", reason: "After rejected gateway", adminId });
  check("failed gateway refund releases its reservation", (await getOrderRefundSummary(failedOrder.orderId)).refunded === 10);
  check("failed gateway refund leaves order processing", (await getOrderWithDetails(failedOrder.publicId))!.order.status === "processing");

  console.log("\n▸ Refund history");
  const partialHistory = await db.select().from(schema.orderHistory).where(eq(schema.orderHistory.orderId, fulfillment.orderId));
  check("partial refund is recorded in order history", partialHistory.some((h) => /partially refunded/i.test(h.note)));
  check("every history row has a note and a known actor", partialHistory.length > 0 && partialHistory.every((h) => h.note.trim().length > 0 && ["admin", "system", "customer"].includes(h.changedByType)));

  console.log(`\n${failed === 0 ? "✅" : "❌"} ${passed} passed, ${failed} failed\n`);

  await closeDb();
  await rm(testDir, { recursive: true, force: true });

  if (failed > 0) process.exit(1);
}

main().catch(async (error) => {
  console.error(error);
  await rm(testDir, { recursive: true, force: true }).catch(() => {});
  process.exit(1);
});
