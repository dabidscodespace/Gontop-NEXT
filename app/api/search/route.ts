import { NextResponse } from "next/server";

import { jsonError } from "@/lib/api";
import { getSearchIndex } from "@/lib/services/catalog";

export async function GET(request: Request) {
  try {
    const q = new URL(request.url).searchParams.get("q")?.trim().toLowerCase() ?? "";
    const all = await getSearchIndex();
    const results = (q
      ? all.filter(
          (item) =>
            item.name.toLowerCase().includes(q) ||
            item.gameName.toLowerCase().includes(q) ||
            item.slug.includes(q),
        )
      : all
    ).slice(0, 20);

    return NextResponse.json(
      { ok: true, results },
      { headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=300" } },
    );
  } catch (error) {
    return jsonError(error);
  }
}
