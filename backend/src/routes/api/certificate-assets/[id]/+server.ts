import { parseId, requireRole, respond } from "$lib/server/http";
import { deleteAsset } from "$lib/server/services/asset.service";
import type { RequestHandler } from "./$types";

// Hapus gambar. Ditolak (409 ASSET_IN_USE) bila masih dipakai desain/template.
export const DELETE: RequestHandler = ({ params, locals }) =>
  respond(async () => deleteAsset(requireRole(locals, "penyelenggara", "admin"), parseId(params.id)));
