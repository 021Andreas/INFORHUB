import { z } from "zod";
import { DEFAULT_CERTIFICATE_CONFIG } from "$lib/server/certificates/config";
import { extractAssetIds, layoutSchema } from "$lib/server/certificates/layout";
import { renderPreview } from "$lib/server/certificates/preview";
import { errorResponse, readJson, requireRole } from "$lib/server/http";
import { assertAssetsAccessible } from "$lib/server/services/asset.service";
import type { RequestHandler } from "./$types";

const schema = z.object({ layout: layoutSchema });

// Pratinjau PDF dari desain yang BELUM disimpan (untuk editor). Body: { layout }.
// Gambar harus milik pemanggil (admin: gambar apa pun yang ada).
export const POST: RequestHandler = async ({ request, locals }) => {
  try {
    const actor = requireRole(locals, "penyelenggara", "admin");
    const { layout } = schema.parse(await readJson(request));
    await assertAssetsAccessible(actor, extractAssetIds(layout));
    const bytes = await renderPreview(DEFAULT_CERTIFICATE_CONFIG, layout);
    return new Response(bytes as BodyInit, {
      headers: { "Content-Type": "application/pdf", "Content-Disposition": 'inline; filename="pratinjau.pdf"', "Cache-Control": "private, no-store" },
    });
  } catch (e) {
    return errorResponse(e);
  }
};
