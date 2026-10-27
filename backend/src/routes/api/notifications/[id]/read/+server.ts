import { parseId, requireUser, respond } from "$lib/server/http";
import { markNotificationRead } from "$lib/server/services/read.service";
import type { RequestHandler } from "./$types";

export const POST: RequestHandler = ({ params, locals }) =>
  respond(async () => {
    const actor = requireUser(locals);
    await markNotificationRead(actor.id, parseId(params.id));
    return { ok: true };
  });