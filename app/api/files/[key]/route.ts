import { readUpload } from "@/lib/storage";
import { jsonError } from "@/lib/api";

export async function GET(
  _request: Request,
  context: { params: Promise<{ key: string }> },
) {
  try {
    const { key } = await context.params;
    const file = await readUpload(key);

    return new Response(new Uint8Array(file.buffer), {
      headers: {
        "Content-Type": file.mime,
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}
