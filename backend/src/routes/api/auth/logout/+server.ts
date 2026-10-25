import { endSession } from "$lib/server/auth";
import { respond } from "$lib/server/http";
import type { RequestHandler } from "./$types";

export const POST: RequestHandler = ({ cookies }) =>
  respond(async () => {
    endSession(cookies);
    return { ok: true };
  });