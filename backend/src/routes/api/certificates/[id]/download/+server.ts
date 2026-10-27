import { errorResponse, parseId, requireUser } from "$lib/server/http";
import { getCertificateForDownload } from "$lib/server/services/event.service";
import { storage } from "$lib/server/storage";
import type { RequestHandler } from "./$types";

// Unduh PDF (dibaca dari penyimpanan lalu dialirkan backend): pemilik sertifikat,
// penyelenggara acara, atau admin. Frontend cukup membuka URL ini.
export const GET: RequestHandler = async ({ params, locals }) => {
  try {
    const actor = requireUser(locals);
    const cert = await getCertificateForDownload(actor, parseId(params.id));
    const { bytes } = await storage.get("certificate", cert.filePath);
    return new Response(bytes as BodyInit, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${cert.certificateNumber}.pdf"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (e) {
    return errorResponse(e);
  }
};