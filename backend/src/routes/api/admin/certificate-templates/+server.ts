import { z } from "zod";
import { certificateConfigSchema } from "$lib/server/certificates/config";
import { readJson, requireRole, respond } from "$lib/server/http";
import { createTemplateVersion, listTemplates } from "$lib/server/services/template.service";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = ({ locals }) =>
  respond(async () => {
    requireRole(locals, "admin");
    return listTemplates();
  });

const schema = z.object({
  name: z.string().trim().min(1).max(100),
  // semua elemen opsional; yang tidak dikirim memakai nilai bawaan
  config: certificateConfigSchema.default(certificateConfigSchema.parse({})),
  makeDefault: z.boolean().default(false),
});

// Menambah VERSI BARU untuk nama template tersebut (versi lama tidak diubah).
export const POST: RequestHandler = ({ request, locals }) =>
  respond(async () => {
    const actor = requireRole(locals, "admin");
    return createTemplateVersion(actor, schema.parse(await readJson(request)));
  }, 201);