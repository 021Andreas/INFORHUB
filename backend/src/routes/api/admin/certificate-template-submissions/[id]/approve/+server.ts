import { z } from "zod";
import { parseId, readJson, requireRole, respond } from "$lib/server/http";
import { approveSubmission } from "$lib/server/services/template-submission.service";
import type { RequestHandler } from "./$types";

const schema = z.object({ note: z.string().trim().max(500).optional() });

// Setujui: membuat versi baru di certificate_templates (milik penyelenggara) dan memberi tahu penyelenggara
export const POST: RequestHandler = ({ params, request, locals }) =>
  respond(async () => {
    const actor = requireRole(locals, "admin");
    const body = request.headers.get("content-length") === "0" ? {} : await readJson(request).catch(() => ({}));
    return approveSubmission(actor, parseId(params.id), schema.parse(body).note);
  });
