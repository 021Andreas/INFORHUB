import { DEFAULT_CERTIFICATE_CONFIG } from "$lib/server/certificates/config";
import { renderPreview } from "$lib/server/certificates/preview";
import { errorResponse, parseId, requireRole } from "$lib/server/http";
import { getAdminLayout } from "$lib/server/services/template-submission.service";
import type { RequestHandler } from "./$types";

// Pratinjau PDF final dari desain pengajuan, untuk ditinjau admin sebelum menyetujui
export const GET: RequestHandler = async ({ params, locals }) => {
  try {
    requireRole(locals, "admin");
    const bytes = await renderPreview(DEFAULT_CERTIFICATE_CONFIG, await getAdminLayout(parseId(params.id)));
    return new Response(bytes as BodyInit, {
      headers: { "Content-Type": "application/pdf", "Content-Disposition": 'inline; filename="pratinjau.pdf"', "Cache-Control": "private, no-store" },
    });
  } catch (e) {
    return errorResponse(e);
  }
};
