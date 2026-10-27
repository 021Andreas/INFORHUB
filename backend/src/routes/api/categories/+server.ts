import { respond } from "$lib/server/http";
import { listCategories } from "$lib/server/services/read.service";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = () => respond(() => listCategories());