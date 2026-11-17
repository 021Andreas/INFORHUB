import { z } from "zod";
import { parseId, readJson, requireRole, respond } from "$lib/server/http";
import { activateApprovedSubmission } from "$lib/server/services/template-submission.service";
import type { RequestHandler } from "./$types";

const schema = z.object({ eventId: z.number().int().positive() });

// Mengaktifkan template yang telah disetujui untuk satu acara milik penyelenggara.
export const POST: RequestHandler = ({ params, request, locals }) =>
  respond(async () => {
    const actor = requireRole(locals, "penyelenggara");
    const body = schema.parse(await readJson(request));
    return activateApprovedSubmission(actor, parseId(params.id), body.eventId);
  });
