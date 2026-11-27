import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertTriangle, ShoppingBag } from "lucide-react";

import { NoAccess } from "@/components/admin/no-access";
import { OrderQuickView } from "@/components/admin/order-quick-view";
import { OrdersTable, type OrderRow } from "@/components/admin/orders-table";
import { Card, PageHeader, Pagination, SearchBar } from "@/components/admin/ui";
import type { OrderStatus } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { formatBDT } from "@/lib/money";
import { hasPermission } from "@/lib/permissions";
import {
  countCustomerOtherOrders,
  getAdminOrder,
  getAdminOrders,
  getCustomerPaidSummary,
  getOrderStatusCounts,
  ORDER_STATUS_LABELS,
  ORDER_TRANSITIONS,
} from "@/lib/services/orders";
import { countPendingGatewayRefunds } from "@/lib/services/refunds";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const FILTERS: Array<OrderStatus | "all"> = [
  "all",
  "pending_payment",
  "processing",
  "completed",
  "failed",
  "on_hold",
  "cancelled",
  "refunded",
];

function timeAgo(value: Date | string) {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 1000));
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  return `${Math.floor(hours / 24)} d ago`;
}

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string; page?: string; view?: string }>;
}) {
  const { admin } = await getSession();
  if (!admin) redirect("/admin/login");
  if (!hasPermission(admin, "orders.view")) return <NoAccess />;

  const params = await searchParams;
  const requestedStatus = params.status || "all";
  const status = FILTERS.includes(requestedStatus as OrderStatus | "all") ? requestedStatus : "all";
  const viewId = params.view ? Number(params.view) : NaN;
  const [result, statusCounts, detail, pendingRefunds] = await Promise.all([
    getAdminOrders({
      status: status as OrderStatus | "all",
      search: params.q,
      page: params.page ? Number(params.page) : 1,
    }),
    getOrderStatusCounts(params.q),
    Number.isInteger(viewId) && viewId > 0 ? getAdminOrder(viewId) : Promise.resolve(null),
    countPendingGatewayRefunds(),
  ]);

  const hrefFor = (overrides: { status?: string; page?: number; view?: number | null } = {}) => {
    const nextStatus = overrides.status ?? status;
    const page = overrides.page ?? 1;
    const view = overrides.view === undefined ? (detail ? detail.order.id : null) : overrides.view;
    const query = new URLSearchParams();
    if (nextStatus !== "all") query.set("status", nextStatus);
    if (params.q) query.set("q", params.q);
    if (page > 1) query.set("page", String(page));
    if (view) query.set("view", String(view));
    const qs = query.toString();
    return `/admin/orders${qs ? `?${qs}` : ""}`;
  };

  const countFor = (item: OrderStatus | "all") =>
    item === "all" ? statusCounts.all : (statusCounts.counts[item] ?? 0);

  const canUpdate = hasPermission(admin, "orders.update_status");
  const baseQuery = hrefFor({ view: null }).split("?")[1] ?? "";
  const tableRows: OrderRow[] = result.rows.map((order) => ({
    id: order.id,
    publicId: order.publicId,
    orderNumber: order.orderNumber,
    status: order.status as OrderStatus,
    paymentStatus: order.paymentStatus,
    fulfillmentStatus: order.fulfillmentStatus,
    total: formatBDT(order.total),
    ago: timeAgo(order.createdAt),
    itemCount: order.itemCount,
    productName: order.productName ?? null,
    productImage: order.productImage ?? null,
    customerName: order.customerName ?? null,
    customerEmail: order.customerEmail,
    transactionId: order.transactionId ?? null,
    senderNumber: order.senderNumber ?? null,
    paymentMethod: order.paymentMethod,
  }));
  const transitions = detail ? ORDER_TRANSITIONS[detail.order.status as OrderStatus] : [];
  const [customerSummary, previousOrderCount] = detail
    ? await Promise.all([
        getCustomerPaidSummary(detail.customerId),
        countCustomerOtherOrders(detail.customerId, detail.order.id),
      ])
    : [null, 0];

  const resetHref = status === "all" ? "/admin/orders" : `/admin/orders?status=${status}`;
  const rangeStart = result.total === 0 ? 0 : (result.page - 1) * result.pageSize + 1;
  const rangeEnd = Math.min(result.total, result.page * result.pageSize);

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Order operations"
        title="Orders"
        description={`${statusCounts.all.toLocaleString()} ${params.q ? "matching" : "total"} order${statusCounts.all === 1 ? "" : "s"} · Open quick view to verify details and act without leaving the queue.`}
      />

      {pendingRefunds > 0 && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 shadow-sm">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
            <AlertTriangle className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-extrabold">Gateway refund settlement needed</p>
            <p className="mt-0.5 text-xs leading-relaxed text-amber-700">
              {pendingRefunds} gateway refund{pendingRefunds === 1 ? " is" : "s are"} pending. Open the related order to mark the result completed or failed.
            </p>
          </div>
        </div>
      )}

      <SearchBar
        defaultValue={params.q ?? ""}
        placeholder="Order #, email, phone, player ID, transaction or product"
        resetHref={params.q ? resetHref : undefined}
      >
        {status !== "all" && <input type="hidden" name="status" value={status} />}
      </SearchBar>

      <Card padded={false} className="overflow-hidden">
        <nav aria-label="Filter orders by status" className="admin-scrollbar flex gap-1.5 overflow-x-auto border-b border-gray-100 bg-gray-50/50 px-3 py-3 sm:px-4">
          {FILTERS.map((item) => {
            const active = status === item;
            return (
              <Link
                key={item}
                href={hrefFor({ status: item, view: null })}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-2.5 text-[11px] font-extrabold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-orange/30",
                  active
                    ? "bg-gray-950 text-white shadow-sm"
                    : "text-gray-500 hover:bg-white hover:text-gray-900 hover:shadow-sm",
                )}
              >
                {item === "all" ? "All orders" : ORDER_STATUS_LABELS[item]}
                <span
                  className={cn(
                    "rounded-md px-1.5 py-0.5 text-[9px] tabular-nums",
                    active ? "bg-white/15 text-white/80" : "bg-gray-200/70 text-gray-500",
                  )}
                >
                  {countFor(item).toLocaleString()}
                </span>
              </Link>
            );
          })}
        </nav>

        <OrdersTable
          rows={tableRows}
          canUpdate={canUpdate}
          baseQuery={baseQuery}
          activeId={detail?.order.id ?? null}
        />

        <footer className="flex flex-col items-center justify-between gap-3 border-t border-gray-100 bg-gray-50/50 px-4 py-3 sm:flex-row">
          <p className="text-xs font-semibold text-gray-500">
            {result.total === 0 ? "No matching orders" : `Showing ${rangeStart}–${rangeEnd} of ${result.total.toLocaleString()}`}
          </p>
          <Pagination page={result.page} pageCount={result.pageCount} buildHref={(page) => hrefFor({ page })} />
        </footer>
      </Card>

      {result.rows.length === 0 && statusCounts.all > 0 && (
        <Link href="/admin/orders" className="mx-auto flex w-fit items-center gap-2 text-xs font-bold text-accent-orange">
          <ShoppingBag className="h-3.5 w-3.5" /> Clear filters and view all orders
        </Link>
      )}

      {detail && (
        <OrderQuickView
          detail={detail}
          totalSpent={customerSummary?.total ?? "0"}
          paidOrderCount={customerSummary?.count ?? 0}
          previousOrderCount={previousOrderCount}
          canUpdate={canUpdate}
          transitions={transitions}
          closeHref={hrefFor({ view: null })}
        />
      )}
    </div>
  );
}
