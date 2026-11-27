import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { AppError } from "@/lib/money";

export function jsonError(error: unknown) {
  if (error instanceof AppError) {
    return NextResponse.json(
      { ok: false, error: error.message, code: error.code },
      { status: error.status },
    );
  }

  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        ok: false,
        error: "Please check the submitted values.",
        fields: error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
      },
      { status: 422 },
    );
  }

  console.error("[api] Unhandled error:", error);
  return NextResponse.json(
    { ok: false, error: "Something went wrong. Please try again." },
    { status: 500 },
  );
}

export async function readJson(request: Request) {
  try {
    return await request.json();
  } catch {
    throw new AppError("Invalid JSON body.", 400);
  }
}

export function friendlyError(error: unknown) {
  if (error instanceof AppError) return error.message;
  if (error instanceof ZodError) return error.issues[0]?.message ?? "Invalid input.";
  if (error instanceof Error) return error.message;
  return "Something went wrong.";
}
