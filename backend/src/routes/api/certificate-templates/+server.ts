import { requireRole, respond } from "$lib/server/http";
import { listTemplates } from "$lib/server/services/template.service";
import type { RequestHandler } from "./$types";

// Daftar template (id, name, version, isDefault) untuk dipilih penyelenggara saat membuat/mengedit acara
export const GET: RequestHandler = ({ locals }) =>
  respond(async () => {
    requireRole(locals, "penyelenggara", "admin");
    return listTemplates();
  });