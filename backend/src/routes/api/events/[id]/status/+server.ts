import { z } from "zod";
import { changeEventStatus } from "$lib/server/services/event.service";
import { parseId, readJson, requireUser, respond } from "$lib/server/http";
import type { RequestHandler } from "./$types";

const schema = z.object({
  status: z.enum(["draft", "pending", "published", "rejected", "completed"]),
  reason: z.string().trim().max(500).optional(),
});

// Ubah status acara. Aturan siapa boleh apa ada di TRANSITIONS (service).
export const POST: RequestHandler = ({ params, request, locals }) =>
  respond(async () => {
    const actor = requireUser(locals);
    const body = schema.parse(await readJson(request));
    await changeEventStatus(actor, parseId(params.id), body.status, body.reason);
    return { ok: true, status: body.status };
  });