import { z } from "zod";
import { parseId, readJson, requireRole, respond } from "$lib/server/http";
import { rejectSubmission } from "$lib/server/services/template-submission.service";
import type { RequestHandler } from "./$types";

const schema = z.object({
  note: z.string({ error: "Catatan penolakan wajib diisi" }).trim().min(3, "Catatan minimal 3 karakter").max(500),
});

export const POST: RequestHandler = ({ params, request, locals }) =>
  respond(async () => {
    const actor = requireRole(locals, "admin");
    return rejectSubmission(actor, parseId(params.id), schema.parse(await readJson(request)).note);
  });
