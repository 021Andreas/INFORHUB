import { z } from "zod";
import { parseId, readJson, requireRole, respond } from "$lib/server/http";
import { revokeCertificate } from "$lib/server/services/certificate.service";
import type { RequestHandler } from "./$types";

const schema = z.object({
  reason: z.string({ error: "Alasan pencabutan wajib diisi" }).trim().min(3, "Alasan minimal 3 karakter").max(255),
});

// Cabut sertifikat (admin atau penyelenggara acara tsb). Verifikasi publik menampilkan "dicabut".
export const POST: RequestHandler = ({ params, request, locals }) =>
  respond(async () => {
    const actor = requireRole(locals, "penyelenggara", "admin");
    const { reason } = schema.parse(await readJson(request));
    return revokeCertificate(actor, parseId(params.id), reason);
  });