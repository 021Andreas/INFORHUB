import { mkdir, readFile, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { env } from "$env/dynamic/private";
import { AppError } from "$lib/server/services/event.service";

export const MAX_POSTER_BYTES = 2 * 1024 * 1024; // 2 MB
export const POSTER_NAME = /^[0-9a-f-]{36}\.(png|jpg|webp)$/;
export const POSTER_MIME = { png: "image/png", jpg: "image/jpeg", webp: "image/webp" } as const;

const dir = () => path.resolve(env.UPLOAD_DIR ?? "storage/posters");

// Tipe ditentukan dari isi file (magic bytes), bukan dari nama atau header yang dikirim klien.
function detectType(b: Uint8Array): keyof typeof POSTER_MIME | null {
  if (b.length > 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return "png";
  if (b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "jpg";
  if (
    b.length > 12 &&
    String.fromCharCode(...b.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...b.slice(8, 12)) === "WEBP"
  )
    return "webp";
  return null;
}

export async function savePoster(file: File): Promise<string> {
  if (file.size === 0) throw new AppError(400, "File kosong");
  if (file.size > MAX_POSTER_BYTES) throw new AppError(413, "Ukuran poster maksimal 2 MB");
  const bytes = new Uint8Array(await file.arrayBuffer());
  const ext = detectType(bytes);
  if (!ext) throw new AppError(400, "Poster harus berupa gambar PNG, JPG, atau WebP");

  const name = `${randomUUID()}.${ext}`;
  await mkdir(dir(), { recursive: true });
  await writeFile(path.join(dir(), name), bytes);
  return name;
}

export async function readPoster(name: string): Promise<{ bytes: Uint8Array; mime: string }> {
  const m = POSTER_NAME.exec(name);
  if (!m) throw new AppError(404, "Poster tidak ditemukan");
  try {
    const bytes = await readFile(path.join(dir(), name));
    return { bytes, mime: POSTER_MIME[m[1] as keyof typeof POSTER_MIME] };
  } catch {
    throw new AppError(404, "Poster tidak ditemukan");
  }
}