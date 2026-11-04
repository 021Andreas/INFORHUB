import { renderPreview } from "$lib/server/certificates/preview";
import { errorResponse, parseId, requireRole } from "$lib/server/http";
import { getTemplate } from "$lib/server/services/template.service";
import type { RequestHandler } from "./$types";

// Pratinjau PDF dari template tersimpan
export const GET: RequestHandler = async ({ params, locals }) => {
  try {
    requireRole(locals, "admin");
    const t = await getTemplate(parseId(params.id));
    const bytes = await renderPreview(t.config);
    return new Response(bytes as BodyInit, {
      headers: { "Content-Type": "application/pdf", "Content-Disposition": 'inline; filename="pratinjau.pdf"', "Cache-Control": "no-store" },
    });
  } catch (e) {
    return errorResponse(e);
  }
};