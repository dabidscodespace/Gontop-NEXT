import Link from "next/link";
import { redirect } from "next/navigation";

import { OrderQuickView } from "@/components/admin/order-quick-view";
import { OrdersTable, type OrderRow } from "@/components/admin/orders-table";
import { NoAccess } from "@/components/admin/no-access";
import { Pagination, SearchBar } from "@/components/admin/ui";
import { StatusBadge } from "@/components/status-badge";
import { getSession } from "@/lib/auth";
import { formatBDT } from "@/lib/money";
import { hasPermission } from "@/lib/permissions";
import { countPendingGatewayRefunds } from "@/lib/services/refunds";
import {
  getAdminOrder,
  countCustomerOtherOrders,
  getAdminOrders,
  getCustomerPaidSummary,
  getOrderStatusCounts,
  ORDER_STATUS_LABELS,
  ORDER_TRANSITIONS,
} from "@/lib/services/orders";
import type { OrderStatus } from "@/db/schema";
import { FULFILLMENT_STATUS_LABELS, PAYMENT_STATUS_LABELS } from "@/lib/order-status";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";


const FILTERS: Array<OrderStatus | "all"> = [
  "all",
  "pending_payment",
  "paid",
  "processing",
  "completed",
  "failed",
  "on_hold",
  "cancelled",
  "refunded",
];

const dateTime = (value: Date | string) =>
  new Date(value).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });

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
  const status = params.status || "all";
  const viewId = params.view ? Number(params.view) : NaN;
  const [result, statusCounts, detail, pendingRefunds] = await Promise.all([
    getAdminOrders({
      status: status as OrderStatus | "all",
      search: params.q,
      page: params.page ? Number(params.page) : 1,
    }),
    getOrderStatusCounts(),
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

  return (
    <div className="-mx-4 -my-6 min-h-[calc(100dvh-4.5rem)] bg-white sm:-mx-6 lg:-mx-8 lg:-my-8">
      <div className="flex flex-col gap-4 border-b border-gray-200 px-4 py-5 sm:px-6 lg:px-8 xl:flex-row xl:items-center xl:justify-between">
        <div className="min-w-0">
          <span className="mb-2 block h-1 w-10 rounded-full bg-accent-orange" />
          <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">Orders</h1>
          <p className="mt-1 text-sm text-gray-500">
            {statusCounts.all.toLocaleString()} orders in total. Open quick view to act without leaving the list.
          </p>
          {pendingRefunds > 0 ? (
            <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800">
              {pendingRefunds} gateway refund{pendingRefunds === 1 ? " is" : "s are"} pending settlement. Open the order to mark it completed or failed.
            </p>
          ) : null}
        </div>
        <div className="xl:w-[26rem]">
          <SearchBar defaultValue={params.q ?? ""} placeholder="Search id, email, phone, player id, product">
            <input type="hidden" name="status" value={status} />
          </SearchBar>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto border-b border-gray-200 px-4 py-3 sm:px-6 lg:px-8">
          {FILTERS.map((item) => {
            const active = status === item;
            return (
              <Link
                key={item}
                href={hrefFor({ status: item, view: null })}
                className={cn(
                  "flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition",
                  active
                    ? "bg-accent-orange text-white shadow-sm shadow-orange-500/30"
                    : "border border-gray-200 bg-white text-gray-600 hover:border-accent-orange/50 hover:text-accent-orange",
                )}
              >
                {item === "all" ? "All" : ORDER_STATUS_LABELS[item]}
                <span
                  className={cn(
                    "rounded-full px-1.5 text-[11px] tabular-nums",
                    active ? "bg-white/25 text-white" : "bg-gray-100 text-gray-500",
                  )}
                >
                  {countFor(item).toLocaleString()}
                </span>
              </Link>
            );
          })}
      </div>

      <div className="px-0">
        <OrdersTable rows={tableRows} canUpdate={canUpdate} baseQuery={baseQuery} activeId={detail?.order.id ?? null} />
      </div>

      <Pagination
        page={result.page}
        pageCount={result.pageCount}
        buildHref={(page) => hrefFor({ page })}
      />

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
