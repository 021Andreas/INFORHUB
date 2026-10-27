import { requireUser, respond } from "$lib/server/http";
import { listMyCertificates } from "$lib/server/services/read.service";
import type { RequestHandler } from "./$types";

// Sertifikat milik user yang login: id (untuk /api/certificates/:id/download),
// certificateNumber, issuedAt, eventTitle, eventStartAt
export const GET: RequestHandler = ({ locals }) =>
  respond(async () => listMyCertificates(requireUser(locals).id));