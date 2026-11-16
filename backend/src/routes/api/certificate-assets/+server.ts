import { env } from "$env/dynamic/private";
import { AppError } from "$lib/server/errors";
import { requireRole, respond } from "$lib/server/http";
import { listAssets, MAX_ASSET_BYTES, saveAsset } from "$lib/server/services/asset.service";
import type { RequestHandler } from "./$types";

// Gambar milik saya (logo, tanda tangan, dll.)
export const GET: RequestHandler = ({ locals }) =>
  respond(async () => listAssets(requireRole(locals, "penyelenggara", "admin")));

// multipart/form-data, field 'file'. PNG/JPEG, maks 2 MB, maks 3000x3000 px.
// Mengembalikan { id, ... }: pakai `id` sebagai assetId pada elemen image di desain.
export const POST: RequestHandler = ({ request, locals, url }) =>
  respond(async () => {
    const actor = requireRole(locals, "penyelenggara", "admin");
    const declared = Number(request.headers.get("content-length") ?? 0);
    if (declared > MAX_ASSET_BYTES + 64 * 1024) throw new AppError(413, "Ukuran gambar maksimal 2 MB");

    let form: FormData;
    try {
      form = await request.formData();
    } catch {
      throw new AppError(400, "Kirim sebagai multipart/form-data");
    }
    const file = form.get("file");
    if (!(file instanceof File)) throw new AppError(400, "Sertakan file gambar pada field 'file'");

    const asset = await saveAsset(actor, file);
    const base = (env.PUBLIC_BASE_URL ?? url.origin).replace(/\/$/, "");
    // `url` memerlukan login (gambar bersifat pribadi); dipakai editor untuk menampilkan miniatur
    return { ...asset, url: `${base}/api/certificate-assets/${asset.id}/file` };
  }, 201);
