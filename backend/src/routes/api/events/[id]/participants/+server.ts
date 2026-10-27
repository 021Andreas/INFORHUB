import { parseId, queryEnum, requireRole, respond } from "$lib/server/http";
import { listParticipants } from "$lib/server/services/read.service";
import type { RequestHandler } from "./$types";

// Daftar peserta acara (penyelenggara acara tsb / admin).
// ?status=registered (default) | cancelled | all
export const GET: RequestHandler = ({ params, locals, url }) =>
  respond(async () => {
    const actor = requireRole(locals, "penyelenggara", "admin");
    const status = queryEnum(url, "status", ["registered", "cancelled", "all"], "registered");
    return listParticipants(actor, parseId(params.id), status);
  });