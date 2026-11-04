import { parseId, requireUser, respond } from "$lib/server/http";
import { saveEvent, unsaveEvent } from "$lib/server/services/engagement.service";
import type { RequestHandler } from "./$types";

// Simpan acara (idempoten: menyimpan dua kali tidak error)
export const PUT: RequestHandler = ({ params, locals }) =>
  respond(async () => saveEvent(requireUser(locals).id, parseId(params.id)));

// Hapus dari daftar tersimpan
export const DELETE: RequestHandler = ({ params, locals }) =>
  respond(async () => unsaveEvent(requireUser(locals).id, parseId(params.id)));