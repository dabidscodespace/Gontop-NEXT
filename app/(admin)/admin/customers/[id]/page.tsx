import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ArrowDownUp,
  CalendarDays,
  CircleDollarSign,
  Clock3,
  KeyRound,
  Mail,
  Phone,
  ReceiptText,
  ShieldCheck,
  ShoppingBag,
  UserRound,
  Wallet,
} from "lucide-react";

import { ActionForm } from "@/components/action-form";
import {
  Card,
  EmptyState,
  PageIdentity,
} from "@/components/admin/ui";
import { WorkspaceNav } from "@/components/admin/workspace-nav";
import { NoAccess } from "@/components/admin/no-access";
import { WalletAdjustmentModal } from "@/components/admin/wallet-adjustment-modal";
import { StatusBadge } from "@/components/status-badge";
import { getSession } from "@/lib/auth";
import { formatBDT } from "@/lib/money";
import { hasPermission } from "@/lib/permissions";
import { getCustomerDetail } from "@/lib/services/admin";
import { toggleCustomerAction } from "../../actions";

export const dynamic = "force-dynamic";

type ProfileTab = "overview" | "orders" | "wallet";

export default async function AdminCustomerDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { admin } = await getSession();
  if (!admin) redirect("/admin/login");
  const canViewCustomer = hasPermission(admin, "customers.view");
  const canManageWallet = hasPermission(admin, "wallet.manage");
  const canViewOrders = hasPermission(admin, "orders.view");
  if (!canViewCustomer && !canManageWallet) return <NoAccess />;

  const [{ id }, query] = await Promise.all([params, searchParams]);
  const data = await getCustomerDetail(id);
  if (!data) notFound();
  const requestedTab: ProfileTab = query.tab === "orders" || query.tab === "wallet" ? query.tab : "overview";
  const tab: ProfileTab = canViewCustomer ? requestedTab : "wallet";
  const initial = (data.user.name || data.user.email || "?").trim().charAt(0).toUpperCase();
  const profileHref = `/admin/customers/${data.user.id}`;

  return (
    <div className="space-y-5">
      <PageIdentity
        eyebrow="Customer profile"
        tone="teal"
        icon={UserRound}
        back={canViewCustomer ? { href: "/admin/customers", label: "Back to customers" } : { href: "/admin/wallets", label: "Back to wallets" }}
        title={data.user.name || "Unnamed customer"}
        description={canViewCustomer ? "A focused account workspace for identity, orders, wallet history and access." : "Review this customer's wallet balance and immutable ledger."}
        signal={data.user.isActive ? "Account active" : "Account disabled"}
        actions={<AccountStatus active={data.user.isActive} />}
      />

      <Card>
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center">
          <div className="flex min-w-0 items-center gap-4 lg:w-[310px]">
            <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-700 to-teal-400 text-2xl font-extrabold text-white shadow-lg shadow-teal-500/25">
              {initial}
            </span>
            <div className="min-w-0">
              <p className="truncate text-base font-black text-gray-950">{data.user.name || "Unnamed customer"}</p>
              <p className="mt-1 flex items-center gap-1.5 truncate text-xs text-gray-500"><Mail className="h-3 w-3" /> {data.user.email}</p>
              <p className="mt-1 flex items-center gap-1.5 text-xs text-gray-500"><Phone className="h-3 w-3" /> {data.user.phone || "No phone number"}</p>
            </div>
          </div>
          <div className={`grid flex-1 grid-cols-2 gap-3 ${canViewCustomer ? "lg:grid-cols-4" : "lg:grid-cols-2"}`}>
            {canViewCustomer && <ProfileFact label="Lifetime spend" value={formatBDT(data.summary.spent)} icon={CircleDollarSign} />}
            {canViewCustomer && <ProfileFact label="Orders" value={data.summary.orders.toLocaleString()} hint={`${data.summary.paidOrders} recognized`} icon={ShoppingBag} />}
            <ProfileFact label="Wallet" value={formatBDT(data.balance)} icon={Wallet} />
            <ProfileFact label="Joined" value={new Date(data.user.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })} icon={CalendarDays} />
          </div>
        </div>
      </Card>

      <WorkspaceNav
        label="Customer profile sections"
        active={tab}
        compact
        tone="teal"
        items={canViewCustomer ? [
          { key: "overview", label: "Overview", href: profileHref, icon: UserRound },
          { key: "orders", label: "Orders", href: `${profileHref}?tab=orders`, icon: ReceiptText, badge: data.summary.orders },
          { key: "wallet", label: "Wallet ledger", href: `${profileHref}?tab=wallet`, icon: Wallet, badge: data.transactions.length },
        ] : [
          { key: "wallet", label: "Wallet ledger", href: `${profileHref}?tab=wallet`, icon: Wallet, badge: data.transactions.length },
        ]}
      />

      {tab === "overview" && (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(300px,0.8fr)]">
          <div className="space-y-5">
            <Card title="Account details" icon={UserRound} description="Identity and sign-in information supplied by this customer.">
              <dl className="grid gap-4 sm:grid-cols-2">
                <Detail label="Full name" value={data.user.name || "Not provided"} />
                <Detail label="Email address" value={data.user.email} />
                <Detail label="Phone number" value={data.user.phone || "Not provided"} />
                <Detail label="Sign-in method" value={data.user.googleId ? "Google account" : data.user.passwordHash ? "Email and password" : "Registration incomplete"} />
                <Detail label="Account created" value={new Date(data.user.createdAt).toLocaleString("en-GB", { dateStyle: "long", timeStyle: "short" })} />
                <Detail label="Last order" value={data.summary.lastOrderAt ? new Date(data.summary.lastOrderAt).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" }) : "No orders yet"} />
              </dl>
            </Card>

            <Card
              title="Recent orders"
              icon={ReceiptText}
              description={data.summary.orders > 5 ? `Showing the latest 5 of ${data.summary.orders.toLocaleString()} orders.` : "The customer's latest purchases."}
              actions={data.orders.length > 0 ? <Link href={`${profileHref}?tab=orders`} className="text-xs font-extrabold text-accent-orange hover:underline">View order history</Link> : undefined}
              padded={false}
            >
              <OrderList orders={data.orders.slice(0, 5)} canOpen={canViewOrders} />
            </Card>
          </div>

          <div className="space-y-5">
            <Card title="Account access" icon={KeyRound} description="Disabling blocks future sign-ins without deleting history.">
              <div className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-gray-50 p-3">
                <div>
                  <p className="text-sm font-extrabold text-gray-900">Customer sign-in</p>
                  <p className="mt-0.5 text-xs text-gray-500">Currently {data.user.isActive ? "allowed" : "blocked"}</p>
                </div>
                <AccountStatus active={data.user.isActive} compact />
              </div>
              <ActionForm
                action={toggleCustomerAction}
                submitLabel={data.user.isActive ? "Disable account" : "Enable account"}
                confirm={data.user.isActive ? "Disable this customer? They will not be able to sign in." : "Enable this customer?"}
                buttonClassName={data.user.isActive ? "border border-red-200 bg-white text-red-600 shadow-none hover:bg-red-50" : "bg-emerald-600 shadow-emerald-500/20 hover:bg-emerald-700"}
              >
                <input type="hidden" name="userId" value={data.user.id} />
              </ActionForm>
            </Card>

            <Card
              title="Latest wallet activity"
              icon={ArrowDownUp}
              description="A preview of this customer's immutable ledger."
              actions={<Link href={`${profileHref}?tab=wallet`} className="text-xs font-extrabold text-accent-orange hover:underline">Open ledger</Link>}
              padded={false}
            >
              <TransactionList transactions={data.transactions.slice(0, 5)} compact />
            </Card>
          </div>
        </div>
      )}

      {tab === "orders" && (
        <Card
          title="Order history"
          icon={ReceiptText}
          description={`Showing up to 20 recent orders. ${data.summary.orders.toLocaleString()} total, ${data.summary.paidOrders.toLocaleString()} recognized in lifetime spend.`}
          actions={hasPermission(admin, "orders.view") ? <Link href={`/admin/orders?q=${encodeURIComponent(data.user.email)}`} className="text-xs font-extrabold text-accent-orange hover:underline">Search all orders</Link> : undefined}
          padded={false}
        >
          <OrderList orders={data.orders} showDetails canOpen={canViewOrders} />
        </Card>
      )}

      {tab === "wallet" && (
        <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(300px,0.75fr)]">
          <Card
            title="Wallet ledger"
            icon={ArrowDownUp}
            description="Deposits, order payments, refunds and admin adjustments are recorded in sequence and never edited in place."
            padded={false}
            className="self-start overflow-hidden"
          >
            <TransactionList transactions={data.transactions} />
          </Card>

          <Card
            title={hasPermission(admin, "wallet.manage") ? "Wallet controls" : "Wallet access"}
            icon={ShieldCheck}
            description={hasPermission(admin, "wallet.manage") ? "Review the balance, then open a protected adjustment flow when needed." : "This ledger is available in read-only mode for your role."}
            className="self-start"
          >
            <div className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-teal-50/60 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-[0.12em] text-emerald-600">Current balance</p>
                  <p className="mt-1 text-3xl font-black tracking-[-0.04em] text-emerald-950">{formatBDT(data.balance)}</p>
                  <p className="mt-1 text-[11px] font-semibold text-emerald-700">{data.transactions.length} recent ledger entr{data.transactions.length === 1 ? "y" : "ies"}</p>
                </div>
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-emerald-600 shadow-sm ring-1 ring-inset ring-emerald-100">
                  <Wallet className="h-4 w-4" />
                </span>
              </div>
            </div>

            {hasPermission(admin, "wallet.manage") ? (
              <div className="mt-4 space-y-3">
                <p className="text-xs leading-relaxed text-gray-500">Credits and debits are immutable, permission-gated and written to the audit trail.</p>
                <WalletAdjustmentModal userId={data.user.id} customerName={data.user.name || data.user.email} currentBalance={Number(data.balance)} />
              </div>
            ) : (
              <p className="mt-4 text-sm leading-relaxed text-gray-600">Wallet-management permission is required to credit or debit this balance.</p>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}

function AccountStatus({ active, compact = false }: { active: boolean; compact?: boolean }) {
  return (
    <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full font-bold ring-1 ring-inset ${compact ? "px-2 py-0.5 text-[10px]" : "px-3 py-1 text-xs"} ${active ? "bg-emerald-50 text-emerald-700 ring-emerald-200" : "bg-red-50 text-red-600 ring-red-200"}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${active ? "bg-emerald-500" : "bg-red-500"}`} />
      {active ? "Active" : "Disabled"}
    </span>
  );
}

function ProfileFact({ label, value, hint, icon: Icon }: { label: string; value: string; hint?: string; icon: typeof Wallet }) {
  return (
    <div className="flex min-w-0 items-start gap-2.5 rounded-xl border border-gray-100 bg-gray-50/70 p-3">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-accent-orange shadow-sm"><Icon className="h-3.5 w-3.5" /></span>
      <div className="min-w-0">
        <p className="truncate text-[9px] font-black uppercase tracking-[0.1em] text-gray-400">{label}</p>
        <p className="mt-0.5 truncate text-sm font-black text-gray-950">{value}</p>
        {hint && <p className="truncate text-[10px] text-gray-400">{hint}</p>}
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50/60 px-3.5 py-3">
      <dt className="text-[10px] font-black uppercase tracking-[0.1em] text-gray-400">{label}</dt>
      <dd className="mt-1 break-words text-sm font-bold text-gray-800">{value}</dd>
    </div>
  );
}

type CustomerOrder = Awaited<ReturnType<typeof getCustomerDetail>> extends infer Result
  ? NonNullable<Result> extends { orders: Array<infer Order> }
    ? Order
    : never
  : never;

type CustomerTransaction = Awaited<ReturnType<typeof getCustomerDetail>> extends infer Result
  ? NonNullable<Result> extends { transactions: Array<infer Transaction> }
    ? Transaction
    : never
  : never;

function OrderList({ orders, showDetails = false, canOpen = true }: { orders: CustomerOrder[]; showDetails?: boolean; canOpen?: boolean }) {
  if (orders.length === 0) return <EmptyState icon={ReceiptText} title="No orders yet" description="Orders from this customer will appear here." />;
  return (
    <ul className="divide-y divide-gray-100">
      {orders.map((order) => {
        const content = (
          <>
            <div className="min-w-0">
              <p className="truncate font-mono text-xs font-black text-gray-900">{order.publicId || `Order ${order.orderNumber}`}</p>
              <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-gray-400"><Clock3 className="h-3 w-3" /> {new Date(order.createdAt).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}</p>
            </div>
            <div className="flex items-center justify-between gap-3 sm:justify-end">
              <StatusBadge status={order.status} />
              <span className="min-w-24 text-right text-sm font-black text-gray-950">{formatBDT(order.total)}</span>
              {showDetails && canOpen && <span className="hidden text-xs font-bold text-accent-orange sm:inline">Open →</span>}
            </div>
          </>
        );
        return (
          <li key={order.id}>
            {canOpen ? (
              <Link href={`/admin/orders/${order.id}`} className="flex flex-col gap-3 px-5 py-3.5 transition hover:bg-orange-50/40 sm:flex-row sm:items-center sm:justify-between">{content}</Link>
            ) : (
              <div className="flex flex-col gap-3 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between">{content}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function TransactionList({ transactions, compact = false }: { transactions: CustomerTransaction[]; compact?: boolean }) {
  if (transactions.length === 0) return <EmptyState icon={Wallet} title="No wallet activity" description="Deposits, payments, refunds and adjustments will show here." />;
  return (
    <ul className="divide-y divide-gray-100">
      {transactions.map((transaction) => {
        const positive = Number(transaction.amount) > 0;
        return (
          <li key={transaction.id} className="flex items-center justify-between gap-3 px-5 py-3.5">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="truncate text-sm font-extrabold capitalize text-gray-800">{transaction.type.replace(/_/g, " ")}</p>
                {!compact && <span className="rounded-md bg-gray-100 px-1.5 py-0.5 text-[9px] font-bold uppercase text-gray-500">{transaction.status}</span>}
              </div>
              <p className="mt-0.5 truncate text-xs text-gray-500">{transaction.description || "No description"}</p>
              {!compact && <p className="mt-1 text-[10px] text-gray-400">{new Date(transaction.createdAt).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })} · Balance {formatBDT(transaction.balanceAfter)}</p>}
            </div>
            <span className={`shrink-0 text-sm font-black ${positive ? "text-emerald-600" : "text-gray-800"}`}>
              {positive ? "+" : ""}{formatBDT(transaction.amount)}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
