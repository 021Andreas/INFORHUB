import { z } from "zod";
import { layoutSchema } from "$lib/server/certificates/layout";
import { AppError } from "$lib/server/errors";
import { parseId, readJson, requireRole, respond } from "$lib/server/http";
import {
  deleteOwnSubmission,
  getOwnSubmission,
  updateSubmission,
} from "$lib/server/services/template-submission.service";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = ({ params, locals }) =>
  respond(async () => getOwnSubmission(requireRole(locals, "penyelenggara"), parseId(params.id)));

const schema = z.object({
  name: z.string().trim().min(2, "Nama minimal 2 karakter").max(100).optional(),
  layout: layoutSchema.optional(),
});

// Ubah draft atau pengajuan yang ditolak (status kembali ke draft). Yang pending/approved terkunci (409).
export const PUT: RequestHandler = ({ params, request, locals }) =>
  respond(async () => {
    const actor = requireRole(locals, "penyelenggara");
    const patch = schema.parse(await readJson(request));
    if (patch.name === undefined && patch.layout === undefined) throw new AppError(400, "Tidak ada perubahan yang dikirim");
    return updateSubmission(actor, parseId(params.id), patch);
  });

// Hapus draft atau yang ditolak
export const DELETE: RequestHandler = ({ params, locals }) =>
  respond(async () => deleteOwnSubmission(requireRole(locals, "penyelenggara"), parseId(params.id)));
