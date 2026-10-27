import { createHash, createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { env } from "$env/dynamic/private";
import { AppError } from "$lib/server/services/event.service";
import { storage } from "$lib/server/storage";

export const MAX_POSTER_BYTES = 2 * 1024 * 1024; // 2 MB
const MIME = { png: "image/png", jpg: "image/jpeg", webp: "image/webp" } as const;
const IMAGE_MIMES = new Set<string>(Object.values(MIME));

// Tipe ditentukan dari isi file (magic bytes), bukan dari nama atau header yang dikirim klien.
function detectType(b: Uint8Array): keyof typeof MIME | null {
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

/** Validasi lalu simpan. Mengembalikan referensi penyimpanan (nama file / ID Drive). */
export async function savePoster(file: File): Promise<string> {
  if (file.size === 0) throw new AppError(400, "File kosong");
  if (file.size > MAX_POSTER_BYTES) throw new AppError(413, "Ukuran poster maksimal 2 MB");
  const bytes = new Uint8Array(await file.arrayBuffer());
  const ext = detectType(bytes);
  if (!ext) throw new AppError(400, "Poster harus berupa gambar PNG, JPG, atau WebP");
  return storage.put("poster", `poster-${randomUUID()}.${ext}`, bytes, MIME[ext]);
}

/*
 * URL poster = /api/uploads/poster/<ref>.<tanda-tangan>. Tanda tangan HMAC memastikan hanya
 * URL yang diterbitkan endpoint upload ini yang valid; ID file Drive lain (mis. sertifikat)
 * tidak bisa dibaca lewat endpoint ini walau ID-nya diketahui.
 */
function signingKey() {
  const base = env.POSTER_SECRET ?? env.JWT_SECRET;
  if (!base || base.length < 32) throw new Error("JWT_SECRET (atau POSTER_SECRET) belum diatur atau kurang dari 32 karakter");
  return createHash("sha256").update(`${base}:poster`).digest();
}
const sign = (ref: string) => createHmac("sha256", signingKey()).update(ref).digest("hex").slice(0, 24);

export const posterSegment = (ref: string) => `${ref}.${sign(ref)}`;

function refFromSegment(segment: string): string | null {
  const i = segment.lastIndexOf(".");
  if (i < 1) return null;
  const ref = segment.slice(0, i);
  const got = Buffer.from(segment.slice(i + 1));
  const want = Buffer.from(sign(ref));
  return got.length === want.length && timingSafeEqual(got, want) ? ref : null;
}

export async function loadPoster(segment: string): Promise<{ bytes: Uint8Array; mime: string }> {
  const ref = refFromSegment(segment);
  if (!ref) throw new AppError(404, "Poster tidak ditemukan");
  const file = await storage.get("poster", ref);
  if (!IMAGE_MIMES.has(file.mime)) throw new AppError(404, "Poster tidak ditemukan");
  return file;
}