import { randomUUID } from "node:crypto";
import { and, count, desc, eq, inArray, like, or } from "drizzle-orm";
import { db } from "$lib/server/db";
import { certificateAssets, certificateTemplateSubmissions, certificateTemplates } from "$lib/server/db/schema";
import { AppError, type Actor } from "$lib/server/errors";
import { storage } from "$lib/server/storage";

export const MAX_ASSET_BYTES = 2 * 1024 * 1024; // 2 MB
const MAX_SIDE = 3000; // piksel per sisi
const MAX_PIXELS = 6_000_000; // pdf-lib menguraikan gambar di memori: batasi supaya tidak membebani server
const MAX_ASSETS_PER_USER = 50;

type Detected = { ext: "png" | "jpg"; mime: "image/png" | "image/jpeg"; width: number; height: number };

// Tipe & ukuran ditentukan dari ISI file (bukan nama/header kiriman klien). Hanya PNG dan JPEG
// karena itulah yang dapat disematkan pdf-lib; WebP/SVG ditolak.
function inspect(b: Uint8Array): Detected | null {
  const dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
  if (b.length > 24 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) {
    return { ext: "png", mime: "image/png", width: dv.getUint32(16), height: dv.getUint32(20) };
  }
  if (b.length > 4 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) {
    let i = 2;
    while (i + 9 < b.length) {
      if (b[i] !== 0xff) {
        i++;
        continue;
      }
      const marker = b[i + 1];
      if (marker === 0xff) {
        i++;
        continue;
      }
      if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
        return { ext: "jpg", mime: "image/jpeg", height: dv.getUint16(i + 5), width: dv.getUint16(i + 7) };
      }
      i += 2 + dv.getUint16(i + 2);
    }
  }
  return null;
}

const cleanName = (n: string) =>
  n.replace(/[\u0000-\u001F\u007F/\\]/g, "").trim().slice(0, 150) || "gambar";

export async function saveAsset(owner: Actor, file: File) {
  if (file.size === 0) throw new AppError(400, "File kosong");
  if (file.size > MAX_ASSET_BYTES) throw new AppError(413, "Ukuran gambar maksimal 2 MB");
  const bytes = new Uint8Array(await file.arrayBuffer());
  const info = inspect(bytes);
  if (!info) throw new AppError(400, "Gambar harus berformat PNG atau JPEG", "ASSET_FORMAT");
  if (!info.width || !info.height || info.width > MAX_SIDE || info.height > MAX_SIDE || info.width * info.height > MAX_PIXELS)
    throw new AppError(400, `Dimensi gambar maksimal ${MAX_SIDE}x${MAX_SIDE} piksel (diterima ${info.width}x${info.height})`, "ASSET_TOO_LARGE");

  const [{ n }] = await db.select({ n: count() }).from(certificateAssets).where(eq(certificateAssets.ownerId, owner.id));
  if (n >= MAX_ASSETS_PER_USER) throw new AppError(409, `Batas ${MAX_ASSETS_PER_USER} gambar tercapai; hapus yang tidak terpakai`, "ASSET_QUOTA");

  const ref = await storage.put("asset", `asset-${randomUUID()}.${info.ext}`, bytes, info.mime);
  try {
    const [res] = await db.insert(certificateAssets).values({
      ownerId: owner.id,
      filename: cleanName(file.name),
      mime: info.mime,
      size: bytes.length,
      width: info.width,
      height: info.height,
      storageRef: ref,
    });
    return { id: res.insertId, filename: cleanName(file.name), mime: info.mime, size: bytes.length, width: info.width, height: info.height };
  } catch (e) {
    await storage.remove("asset", ref).catch(() => {}); // jangan tinggalkan file yatim
    throw e;
  }
}

export async function listAssets(owner: Actor) {
  return db
    .select({
      id: certificateAssets.id,
      filename: certificateAssets.filename,
      mime: certificateAssets.mime,
      size: certificateAssets.size,
      width: certificateAssets.width,
      height: certificateAssets.height,
      createdAt: certificateAssets.createdAt,
    })
    .from(certificateAssets)
    .where(eq(certificateAssets.ownerId, owner.id))
    .orderBy(desc(certificateAssets.id));
}

async function ownedAsset(actor: Actor, id: number) {
  const [a] = await db.select().from(certificateAssets).where(eq(certificateAssets.id, id));
  // 404 (bukan 403) bila milik orang lain, supaya keberadaan aset tidak bocor
  if (!a || (a.ownerId !== actor.id && actor.role !== "admin")) throw new AppError(404, "Gambar tidak ditemukan");
  return a;
}

export async function readAsset(actor: Actor, id: number) {
  const a = await ownedAsset(actor, id);
  const { bytes } = await storage.get("asset", a.storageRef);
  return { bytes, mime: a.mime };
}

/** Semua ID aset harus ada dan milik `ownerId`. */
export async function assertAssetsOwned(ownerId: number, ids: number[]) {
  if (ids.length === 0) return;
  const rows = await db
    .select({ id: certificateAssets.id, ownerId: certificateAssets.ownerId })
    .from(certificateAssets)
    .where(inArray(certificateAssets.id, ids));
  const found = new Map(rows.map((r) => [r.id, r.ownerId]));
  for (const id of ids) {
    if (found.get(id) !== ownerId)
      throw new AppError(400, `Gambar #${id} tidak ditemukan atau bukan milik Anda`, "ASSET_NOT_OWNED");
  }
}

// Referensi aset di JSON selalu berbentuk "assetId":<angka> diikuti koma atau kurung tutup
// (JSON disimpan oleh serializeLayout), sehingga pola ini tidak salah cocok dengan ID lain.
const refPatterns = (id: number) => [`%"assetId":${id},%`, `%"assetId":${id}}%`];

export async function deleteAsset(actor: Actor, id: number) {
  const a = await ownedAsset(actor, id);
  const [p1, p2] = refPatterns(id);
  const [{ s }] = await db
    .select({ s: count() })
    .from(certificateTemplateSubmissions)
    .where(or(like(certificateTemplateSubmissions.layoutJson, p1), like(certificateTemplateSubmissions.layoutJson, p2)));
  const [{ t }] = await db
    .select({ t: count() })
    .from(certificateTemplates)
    .where(or(like(certificateTemplates.layout, p1), like(certificateTemplates.layout, p2)));
  if (s + t > 0)
    throw new AppError(409, "Gambar masih dipakai oleh desain/template dan tidak bisa dihapus", "ASSET_IN_USE");

  await db.delete(certificateAssets).where(and(eq(certificateAssets.id, id)));
  await storage.remove("asset", a.storageRef).catch((e) => console.error("Gagal membuang berkas aset", a.storageRef, e));
  return { ok: true };
}

/** Untuk pratinjau/penyimpanan oleh pemakai: admin boleh memakai gambar mana pun yang ada; penyelenggara hanya miliknya. */
export async function assertAssetsAccessible(actor: Actor, ids: number[]) {
  if (actor.role !== "admin") return assertAssetsOwned(actor.id, ids);
  if (ids.length === 0) return;
  const rows = await db.select({ id: certificateAssets.id }).from(certificateAssets).where(inArray(certificateAssets.id, ids));
  if (rows.length !== ids.length) throw new AppError(400, "Ada gambar pada desain yang tidak ditemukan", "ASSET_NOT_FOUND");
}
