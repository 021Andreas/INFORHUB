import { env } from "$env/dynamic/private";
import { AppError } from "$lib/server/services/event.service";
import { requireRole, respond } from "$lib/server/http";
import { MAX_POSTER_BYTES, posterSegment, savePoster } from "$lib/server/uploads/posters";
import type { RequestHandler } from "./$types";

// multipart/form-data, field 'file' (atau 'poster'). Maks 2 MB; PNG/JPG/WebP.
// Mengembalikan { url } (selalu diawali http) untuk diisi ke posterUrl acara.
export const POST: RequestHandler = ({ request, locals, url }) =>
  respond(async () => {
    requireRole(locals, "penyelenggara", "admin");

    // tolak lebih awal sebelum body dibaca seluruhnya
    const declared = Number(request.headers.get("content-length") ?? 0);
    if (declared > MAX_POSTER_BYTES + 64 * 1024) throw new AppError(413, "Ukuran poster maksimal 2 MB");

    let form: FormData;
    try {
      form = await request.formData();
    } catch {
      throw new AppError(400, "Kirim sebagai multipart/form-data");
    }
    const file = form.get("file") ?? form.get("poster");
    if (!(file instanceof File)) throw new AppError(400, "Sertakan file gambar pada field 'file'");

    const ref = await savePoster(file);
    const base = (env.PUBLIC_BASE_URL ?? url.origin).replace(/\/$/, "");
    return { url: `${base}/api/uploads/poster/${posterSegment(ref)}` };
  }, 201);