import { parsePaging, queryEnum, requireRole, respondList } from "$lib/server/http";
import { listAdminSubmissions } from "$lib/server/services/template-submission.service";
import type { RequestHandler } from "./$types";

// Antrean review. Default ?status=pending (paling lama menunggu dulu). Nilai lain: approved|rejected|draft|all
export const GET: RequestHandler = ({ locals, url }) =>
  respondList(async () => {
    requireRole(locals, "admin");
    const status = queryEnum(url, "status", ["pending", "all", "draft", "approved", "rejected"], "pending");
    const { limit, offset } = parsePaging(url, 100, 1000);
    return listAdminSubmissions(status, { limit, offset });
  });
