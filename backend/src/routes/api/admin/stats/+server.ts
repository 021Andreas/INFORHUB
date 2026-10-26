import { requireRole, respond } from "$lib/server/http";
import { getAdminStats } from "$lib/server/services/read.service";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = ({ locals }) =>
  respond(async () => {
    requireRole(locals, "admin");
    return getAdminStats();
  });