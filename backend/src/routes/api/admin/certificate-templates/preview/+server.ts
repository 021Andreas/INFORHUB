import { certificateConfigSchema } from "$lib/server/certificates/config";
import { renderPreview } from "$lib/server/certificates/preview";
import { errorResponse, readJson, requireRole } from "$lib/server/http";
import type { RequestHandler } from "./$types";

// Pratinjau dari pengaturan yang BELUM disimpan (untuk editor template): body = config
export const POST: RequestHandler = async ({ request, locals }) => {
  try {
    requireRole(locals, "admin");
    const config = certificateConfigSchema.parse(await readJson(request));
    const bytes = await renderPreview(config);
    return new Response(bytes as BodyInit, {
      headers: { "Content-Type": "application/pdf", "Content-Disposition": 'inline; filename="pratinjau.pdf"', "Cache-Control": "no-store" },
    });
  } catch (e) {
    return errorResponse(e);
  }
};