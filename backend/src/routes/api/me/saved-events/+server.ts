import { requireUser, respond } from "$lib/server/http";
import { listSavedEvents } from "$lib/server/services/engagement.service";
import type { RequestHandler } from "./$types";

// Daftar acara tersimpan milik user (terbaru dulu)
export const GET: RequestHandler = ({ locals }) =>
  respond(async () => listSavedEvents(requireUser(locals).id));