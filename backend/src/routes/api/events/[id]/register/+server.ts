import { cancelRegistration, registerForEvent } from "$lib/server/services/event.service";
import { parseId, requireUser, respond } from "$lib/server/http";
import type { RequestHandler } from "./$types";

// Daftar ke acara (kuota & pendaftaran ganda dijaga di service)
export const POST: RequestHandler = ({ params, locals }) =>
  respond(async () => {
    const actor = requireUser(locals);
    return registerForEvent(actor.id, parseId(params.id));
  }, 201);

// Batalkan pendaftaran
export const DELETE: RequestHandler = ({ params, locals }) =>
  respond(async () => {
    const actor = requireUser(locals);
    await cancelRegistration(actor.id, parseId(params.id));
    return { ok: true };
  });