import { parseId, requireRole, respond } from "$lib/server/http";
import { getTemplate } from "$lib/server/services/template.service";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = ({ params, locals }) =>
  respond(async () => {
    requireRole(locals, "admin");
    return getTemplate(parseId(params.id));
  });