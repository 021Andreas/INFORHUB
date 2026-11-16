import { z } from "zod";
import { certificateConfigSchema } from "$lib/server/certificates/config";
import { assertSubmittable, extractAssetIds, layoutSchema } from "$lib/server/certificates/layout";
import { db } from "$lib/server/db";
import { AppError } from "$lib/server/errors";
import { readJson, requireRole, respond } from "$lib/server/http";
import { assertAssetsOwned } from "$lib/server/services/asset.service";
import {
  createLayoutTemplateVersion,
  createTemplateVersion,
  listTemplates,
} from "$lib/server/services/template.service";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = ({ locals }) =>
  respond(async () => {
    const actor = requireRole(locals, "admin");
    return listTemplates(actor);
  });

const schema = z.object({
  name: z.string().trim().min(1).max(100),
  // Kirim SALAH SATU: `config` (template tetap) atau `layout` (desain bebas dari editor visual).
  // Keduanya kosong = template tetap dengan semua nilai bawaan.
  config: certificateConfigSchema.optional(),
  layout: layoutSchema.optional(),
  makeDefault: z.boolean().default(false),
});

// Menambah VERSI BARU untuk nama template tersebut (versi lama tidak diubah). Template umum (tanpa pemilik).
export const POST: RequestHandler = ({ request, locals }) =>
  respond(async () => {
    const actor = requireRole(locals, "admin");
    const body = schema.parse(await readJson(request));
    if (body.config && body.layout) throw new AppError(400, "Kirim config ATAU layout, bukan keduanya");

    if (body.layout) {
      assertSubmittable(body.layout);
      await assertAssetsOwned(actor.id, extractAssetIds(body.layout));
      return db.transaction((tx) =>
        createLayoutTemplateVersion(tx, {
          name: body.name,
          layout: body.layout!,
          ownerId: null,
          createdBy: actor.id,
          makeDefault: body.makeDefault,
        }),
      );
    }
    return createTemplateVersion(actor, {
      name: body.name,
      config: body.config ?? certificateConfigSchema.parse({}),
      makeDefault: body.makeDefault,
    });
  }, 201);
