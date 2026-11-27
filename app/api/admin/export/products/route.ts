import { requireAdmin } from "@/lib/auth";
import { jsonError } from "@/lib/api";
import { exportProductsCsv } from "@/lib/csv";

export async function GET() {
  try {
    await requireAdmin("csv.manage");
    const csv = await exportProductsCsv();

    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="gontop-products-${new Date()
          .toISOString()
          .slice(0, 10)}.csv"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}
