import { parseRange, requireRole, respond } from "$lib/server/http";
import { getActivityReport } from "$lib/server/services/report.service";
import type { RequestHandler } from "./$types";

// Laporan aktivitas platform. ?from=&to= (bawaan: 90 hari terakhir sampai hari ini).
export const GET: RequestHandler = ({ locals, url }) =>
  respond(async () => {
    requireRole(locals, "admin");
    const { from, to } = parseRange(url);
    const end = to ?? new Date();
    const start = from ?? new Date(end.getTime() - 90 * 24 * 3600 * 1000);
    return getActivityReport(start, end);
  });