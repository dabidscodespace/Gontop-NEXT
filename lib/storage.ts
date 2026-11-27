import "server-only";

import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { AppError } from "@/lib/money";

const ALLOWED: Record<string, { ext: string; mime: string; magic: number[][] }> = {
  "image/png": { ext: "png", mime: "image/png", magic: [[0x89, 0x50, 0x4e, 0x47]] },
  "image/jpeg": { ext: "jpg", mime: "image/jpeg", magic: [[0xff, 0xd8, 0xff]] },
  "image/webp": { ext: "webp", mime: "image/webp", magic: [[0x52, 0x49, 0x46, 0x46]] },
  "image/gif": { ext: "gif", mime: "image/gif", magic: [[0x47, 0x49, 0x46, 0x38]] },
};

export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

function uploadDir() {
  return path.resolve(
    /* turbopackIgnore: true */
    process.env.UPLOAD_DIR || path.join(process.cwd(), ".data", "uploads"),
  );
}

function matchesMagic(buffer: Buffer, magic: number[][]) {
  return magic.some((signature) => signature.every((byte, i) => buffer[i] === byte));
}

/**
 * Storage abstraction. The local driver works on a VPS or any host with a
 * persistent disk. On Vercel, point UPLOAD_DIR at a mounted volume or swap this
 * driver for object storage; admin forms also accept external image URLs.
 */
export async function saveUpload(file: File, prefix = "img") {
  const spec = ALLOWED[file.type];
  if (!spec) {
    throw new AppError("Only PNG, JPEG, WebP and GIF images are allowed.", 422);
  }
  if (file.size <= 0 || file.size > MAX_UPLOAD_BYTES) {
    throw new AppError("Images must be smaller than 4 MB.", 422);
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  if (!matchesMagic(buffer, spec.magic)) {
    throw new AppError("The uploaded file is not a valid image.", 422);
  }

  const safePrefix = prefix.replace(/[^a-z0-9_-]/gi, "").slice(0, 20) || "img";
  const key = `${safePrefix}-${randomUUID()}.${spec.ext}`;
  const dir = uploadDir();
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, key), buffer);

  return { key, url: `/api/files/${key}`, mime: spec.mime, size: file.size };
}

const MIME_BY_EXT: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
};

export async function readUpload(key: string) {
  if (!/^[a-z0-9_-]+\.(png|jpg|webp|gif)$/i.test(key)) {
    throw new AppError("File not found.", 404);
  }
  try {
    const buffer = await readFile(/* turbopackIgnore: true */ path.join(uploadDir(), key));
    const ext = key.split(".").pop() ?? "";
    return { buffer, mime: MIME_BY_EXT[ext] ?? "application/octet-stream" };
  } catch {
    throw new AppError("File not found.", 404);
  }
}
