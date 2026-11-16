import { DEFAULT_CERTIFICATE_CONFIG } from "$lib/server/certificates/config";
import { renderPreview } from "$lib/server/certificates/preview";
import { errorResponse, parseId, requireRole } from "$lib/server/http";
import { getOwnLayout } from "$lib/server/services/template-submission.service";
import type { RequestHandler } from "./$types";

// Pratinjau PDF dari desain tersimpan milik saya (renderer yang sama dengan penerbitan sungguhan)
export const GET: RequestHandler = async ({ params, locals }) => {
  try {
    const layout = await getOwnLayout(requireRole(locals, "penyelenggara"), parseId(params.id));
    const bytes = await renderPreview(DEFAULT_CERTIFICATE_CONFIG, layout);
    return new Response(bytes as BodyInit, {
      headers: { "Content-Type": "application/pdf", "Content-Disposition": 'inline; filename="pratinjau.pdf"', "Cache-Control": "private, no-store" },
    });
  } catch (e) {
    return errorResponse(e);
  }
};
