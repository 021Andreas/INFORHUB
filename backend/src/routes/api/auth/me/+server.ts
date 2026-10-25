import { requireUser, respond } from "$lib/server/http";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = ({ locals }) =>
  respond(async () => {
    requireUser(locals);
    return { user: locals.user };
  });