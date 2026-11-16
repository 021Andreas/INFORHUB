import { errorResponse, parseId, requireRole } from "$lib/server/http";
import { readAsset } from "$lib/server/services/asset.service";
import type { RequestHandler } from "./$types";

// Isi gambar untuk miniatur di editor. Hanya pemilik atau admin; tidak disimpan cache bersama.
export const GET: RequestHandler = async ({ params, locals }) => {
  try {
    const actor = requireRole(locals, "penyelenggara", "admin");
    const { bytes, mime } = await readAsset(actor, parseId(params.id));
    return new Response(bytes as BodyInit, {
      headers: { "Content-Type": mime, "Cache-Control": "private, max-age=3600", "X-Content-Type-Options": "nosniff" },
    });
  } catch (e) {
    return errorResponse(e);
  }
};
