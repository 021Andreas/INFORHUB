import { requireUser, respond } from "$lib/server/http";
import { listMyRegistrations } from "$lib/server/services/read.service";
import type { RequestHandler } from "./$types";

// Riwayat pendaftaran milik user yang login (termasuk presensi & id sertifikat)
export const GET: RequestHandler = ({ locals }) =>
  respond(async () => listMyRegistrations(requireUser(locals).id));