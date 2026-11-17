import { z } from "zod";
import { layoutSchema } from "$lib/server/certificates/layout";
import { queryEnum, readJson, requireRole, respond } from "$lib/server/http";
import { createSubmission, listOwnSubmissions } from "$lib/server/services/template-submission.service";
import type { RequestHandler } from "./$types";

// Pengajuan template milik saya. Opsional: ?status=draft|pending|approved|rejected
export const GET: RequestHandler = ({ locals, url }) =>
  respond(async () => {
    const actor = requireRole(locals, "penyelenggara");
    const status = queryEnum(url, "status", ["all", "draft", "pending", "approved", "rejected"], "all");
    return listOwnSubmissions(actor, status === "all" ? undefined : status);
  });

const schema = z.object({
  name: z.string({ error: "Nama template wajib diisi" }).trim().min(2, "Nama minimal 2 karakter").max(100),
  layout: layoutSchema,
  eventId: z.number().int().positive().optional(),
  // true = langsung diajukan ke admin (desain harus lengkap: ada QR dan {{participant_name}}); false = simpan sebagai draft
  submit: z.boolean().default(false),
}).superRefine((value, ctx) => {
  if (value.submit && !value.eventId) {
    ctx.addIssue({ code: "custom", path: ["eventId"], message: "Pilih acara sebelum mengajukan template" });
  }
});

export const POST: RequestHandler = ({ request, locals }) =>
  respond(async () => {
    const actor = requireRole(locals, "penyelenggara");
    return createSubmission(actor, schema.parse(await readJson(request)));
  }, 201);
