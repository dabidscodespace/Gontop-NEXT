import { NextResponse } from "next/server";

import { jsonError } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { getSession } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { AppError } from "@/lib/money";
import { saveUpload } from "@/lib/storage";

export async function POST(request: Request) {
  try {
    await requireAdmin();
    const { admin } = await getSession();
    const canUpload =
      hasPermission(admin, "products.manage") ||
      hasPermission(admin, "banners.manage") ||
      hasPermission(admin, "categories.manage");

    if (!canUpload) throw new AppError("You cannot upload images.", 403);

    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) throw new AppError("Choose an image to upload.", 422);

    const result = await saveUpload(file);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return jsonError(error);
  }
}
