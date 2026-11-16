import { parseId, requireRole, respond } from "$lib/server/http";
import { submitSubmission } from "$lib/server/services/template-submission.service";
import type { RequestHandler } from "./$types";

// Kirim draft untuk ditinjau admin (draft -> pending)
export const POST: RequestHandler = ({ params, locals }) =>
  respond(async () => submitSubmission(requireRole(locals, "penyelenggara"), parseId(params.id)));
