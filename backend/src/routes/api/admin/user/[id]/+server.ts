import { z } from "zod";
import { AppError } from "$lib/server/services/event.service";
import { parseId, readJson, requireRole, respond } from "$lib/server/http";
import { updateUser } from "$lib/server/services/read.service";
import type { RequestHandler } from "./$types";

const schema = z.object({
  role: z.enum(["mahasiswa", "penyelenggara", "admin"]).optional(),
  status: z.enum(["pending_verification", "active", "suspended"]).optional(),
});

// Ubah role dan/atau status akun (mis. jadikan penyelenggara, blokir akun).
// Admin tidak bisa mengubah akunnya sendiri.
export const PATCH: RequestHandler = ({ params, request, locals }) =>
  respond(async () => {
    const actor = requireRole(locals, "admin");
    const patch = schema.parse(await readJson(request));
    if (!patch.role && !patch.status) throw new AppError(400, "Isi minimal role atau status");
    return updateUser(actor, parseId(params.id), patch);
  });