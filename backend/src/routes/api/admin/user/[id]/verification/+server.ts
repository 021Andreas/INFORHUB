import { z } from "zod";
import { parseId, readJson, requireRole, respond } from "$lib/server/http";
import { reviewOrganizer } from "$lib/server/services/profile.service";
import type { RequestHandler } from "./$types";

const schema = z.object({
  decision: z.enum(["approve", "reject"]),
  note: z.string().trim().max(500).optional(), // wajib saat reject
});

// Keputusan atas pengajuan penyelenggara. approve -> role 'penyelenggara' + terverifikasi.
export const POST: RequestHandler = ({ params, request, locals }) =>
  respond(async () => {
    const actor = requireRole(locals, "admin");
    const { decision, note } = schema.parse(await readJson(request));
    return reviewOrganizer(actor, parseId(params.id), decision, note);
  });