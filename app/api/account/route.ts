import { NextResponse } from "next/server";

import { jsonError, readJson } from "@/lib/api";
import { assertSameOrigin, requireUser } from "@/lib/auth";
import { passwordChangeSchema, profileSchema } from "@/lib/validation";
import { changeCustomerPassword, updateCustomerProfile } from "@/lib/services/auth";
import { AppError } from "@/lib/money";

export async function PATCH(request: Request) {
  try {
    await assertSameOrigin(request);
    const user = await requireUser();
    const input = profileSchema.parse(await readJson(request));
    await updateCustomerProfile(user.id, input);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    await assertSameOrigin(request);
    const user = await requireUser();
    const body = (await readJson(request)) as { action?: string };

    if (body.action === "password") {
      const input = passwordChangeSchema.parse(body);
      await changeCustomerPassword(user.id, input);
      return NextResponse.json({ ok: true });
    }

    throw new AppError("Unknown account action.", 400);
  } catch (error) {
    return jsonError(error);
  }
}
