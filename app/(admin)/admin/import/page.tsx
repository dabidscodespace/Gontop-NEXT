import { redirect } from "next/navigation";

import { PageHeader } from "@/components/admin/ui";
import { CsvImportPanel } from "@/components/admin/csv-import-panel";
import {
  CustomerMigrationPanel,
  OrderMigrationPanel,
} from "@/components/admin/data-migration-panel";
import { NoAccess } from "@/components/admin/no-access";
import { getSession } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export default async function AdminImportPage() {
  const { admin } = await getSession();
  if (!admin) redirect("/admin/login");
  if (!hasPermission(admin, "csv.manage")) return <NoAccess />;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Data tools"
        title="CSV Migration"
        description="Bring your WooCommerce catalogue across, then export any time. Nothing here depends on WordPress after import."
      />

      <CsvImportPanel />
      <CustomerMigrationPanel />
      <OrderMigrationPanel />

      <section className="rounded-2xl border border-gray-200/80 bg-white p-6 text-sm text-gray-600 shadow-sm">
        <h2 className="text-base font-bold text-gray-900">Migrating customers & orders</h2>
        <p className="mt-1 leading-relaxed">
          Import customers before orders when possible, so registration details are preserved.
          Orders create any missing customer automatically, including guest checkout customers,
          using the billing email. Existing emails and order numbers are skipped, so running the
          same import twice is safe.
        </p>
        <p className="mt-2 leading-relaxed">
          Historical orders are recorded with their original status, total, line items, payment
          reference, notes and player fields where exported. Refund totals are recorded for
          reporting. Imported orders do <strong>not</strong> change wallet balances or create
          wallet ledger entries. Customer passwords cannot be imported; those customers can use
          Google sign-in with the same email or register again.
        </p>
        <p className="mt-2 leading-relaxed">
          Products: upload the WooCommerce export directly in the panel above. Categories map to
          games and variation attributes map to package names. Add player fields and game
          instructions after import — WooCommerce does not contain those settings.
        </p>
      </section>
    </div>
  );
}
