import { parseId, requireRole, respond } from "$lib/server/http";
import { setDefaultTemplate } from "$lib/server/services/template.service";
import type { RequestHandler } from "./$types";

// Jadikan versi ini template default untuk acara yang tidak memilih template sendiri
export const POST: RequestHandler = ({ params, locals }) =>
  respond(async () => {
    requireRole(locals, "admin");
    return setDefaultTemplate(parseId(params.id));
  });