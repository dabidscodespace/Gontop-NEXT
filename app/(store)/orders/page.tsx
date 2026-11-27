import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Package } from "lucide-react";

import { StatusBadge } from "@/components/status-badge";
import { getSession } from "@/lib/auth";
import { formatBDT } from "@/lib/money";
import { getUserOrders } from "@/lib/services/orders";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "My Orders",
  robots: { index: false },
};

export default async function OrdersPage() {
  const { user } = await getSession();
  if (!user) redirect("/login?next=/orders");

  const orders = await getUserOrders(user.id);
  const active = orders.filter((order) =>
    ["pending_payment", "processing", "on_hold"].includes(order.status),
  );
  const past = orders.filter(
    (order) => !["pending_payment", "processing", "on_hold"].includes(order.status),
  );

  return (
    <div className="min-h-screen bg-cover bg-center bg-repeat-y" style={{ backgroundImage: "url('/swiper_bg.svg')" }}>
      <div className="mx-auto max-w-4xl px-3 py-6">
        <h1 className="text-xl font-bold text-gray-800">My Orders</h1>
        <p className="mt-1 text-sm text-gray-600">
          Track top-ups and view your order history.
        </p>

        {orders.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-gray-300 bg-white/80 py-16 text-center">
            <Package className="mx-auto h-10 w-10 text-gray-300" />
            <p className="mt-3 text-sm font-medium text-gray-600">No orders yet</p>
            <p className="mt-1 text-xs text-gray-400">
              Your top-up orders will appear here.
            </p>
            <Link
              href="/"
              className="mt-4 inline-flex rounded-lg bg-accent-orange px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600"
            >
              Browse games
            </Link>
          </div>
        ) : (
          <div className="mt-5 space-y-6">
            {active.length > 0 && (
              <OrderGroup title="Active orders" orders={active} />
            )}
            {past.length > 0 && <OrderGroup title="Order history" orders={past} />}
          </div>
        )}
      </div>
    </div>
  );
}

function OrderGroup({
  title,
  orders,
}: {
  title: string;
  orders: Awaited<ReturnType<typeof getUserOrders>>;
}) {
  return (
    <section>
      <h2 className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-500">{title}</h2>
      <div className="space-y-2">
        {orders.map((order) => (
          <Link
            key={order.id}
            href={`/orders/${order.publicId}`}
            className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-3 shadow-sm transition-colors hover:border-orange-300"
          >
            <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-gray-100">
              {order.image ? (
                <img src={order.image} alt="" className="h-full w-full object-cover" />
              ) : (
                <Package className="h-6 w-6 text-gray-400" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-gray-800">
                {order.productName ?? "Top-up order"}
              </p>
              <p className="mt-0.5 text-xs text-gray-500">
                Order #{order.orderNumber} · {new Date(order.createdAt).toLocaleDateString("en-GB")}
              </p>
              <div className="mt-1.5">
                <StatusBadge status={order.status} />
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-bold text-gray-800">{formatBDT(order.total)}</p>
              <p className="text-[11px] text-gray-400">
                {order.itemCount} {order.itemCount === 1 ? "item" : "items"}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
