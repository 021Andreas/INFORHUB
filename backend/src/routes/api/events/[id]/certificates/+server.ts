import { certificateStore } from "$lib/server/certificates/pdf";
import { parseId, requireRole, respond } from "$lib/server/http";
import { issueCertificatesForEvent } from "$lib/server/services/event.service";
import type { RequestHandler } from "./$types";

// Terbitkan sertifikat PDF untuk semua peserta yang hadir & belum punya sertifikat.
// Syarat: acara 'completed' dan certificateAvailable = true.
// Opsional ?limit=50 untuk memecah acara besar; respons memuat `remaining` (sisa yang belum).
export const POST: RequestHandler = ({ params, locals, url }) =>
  respond(async () => {
    const actor = requireRole(locals, "penyelenggara", "admin");
    const limit = Math.floor(Number(url.searchParams.get("limit"))) || undefined;
    return issueCertificatesForEvent(actor, parseId(params.id), certificateStore, {
      limit: limit && limit > 0 ? Math.min(limit, 500) : undefined,
    });
  });